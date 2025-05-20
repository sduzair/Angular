using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;


namespace UserReportingApi.IntegrationTests;

public class UsersSessionsTests
    : IClassFixture<CustomWebApplicationFactory>, IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly IMongoDatabase _testDb;
    private readonly string _testDbName;

    public UsersSessionsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;

        var config = factory.Services.GetRequiredService<IConfiguration>();
        var connectionString = config["MongoDB:ConnectionString"] ?? throw new InvalidOperationException("MongoDB connection string missing");
        _testDbName = config["MongoDB:DatabaseName"] ?? throw new InvalidOperationException("MongoDB database name missing");

        var client = new MongoClient(connectionString);
        _testDb = client.GetDatabase(_testDbName);
    }

    public void Dispose()
    {
        _testDb.Client.DropDatabase(_testDbName);
    }

    [Fact]
    public async Task GetUsers_ReturnsSuccessAndUsers()
    {
        // Arrange
        var client = _factory.CreateClient();
        await _testDb.GetCollection<BsonDocument>("users").InsertManyAsync([new BsonDocument { { "name", "Alice" } }, new BsonDocument { { "name", "Bob" } }]);

        // Act
        var response = await client.GetAsync("/api/users");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var users = await response.Content.ReadFromJsonAsync<List<Dictionary<string, object>>>();
        users.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetSession_ByUserId_ReturnsMatchingSession()
    {
        // Arrange
        var client = _factory.CreateClient();
        var userId = "testUser123";
        var testSessions = new List<Session>
        {
            new Session
            {
                UserId = userId,
                Version = 1,
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                Data = new BsonDocument { ["key1"] = "value1" }
            },
            new Session
            {
                UserId = "otherUser",
                Version = 1,
                CreatedAt = DateTime.UtcNow,
                Data = new BsonDocument { ["key2"] = "value2" }
            },
        };

        await _testDb.GetCollection<Session>("sessions").InsertManyAsync(testSessions);

        // Act
        var response = await client.GetAsync($"/api/sessions/{userId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var session = await response.Content.ReadFromJsonAsync<GetSessionResponse>();
        session.Should().NotBeNull();
        session!.UserId.Should().Be(userId);
        session.Version.Should().Be(1);
        session.Data.Should().NotBeNull();
        ((JsonElement)session.Data).GetProperty("key1").GetString().Should().Be("value1");
    }

    [Fact]
    public async Task GetSession_NonExistentUserId_Returns404()
    {
        // Arrange
        var client = _factory.CreateClient();
        var invalidUserId = "nonExistentUser123";

        // Act
        var response = await client.GetAsync($"/api/sessions/{invalidUserId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problemDetails.Should().NotBeNull();
        problemDetails!.Title.Should().Contain("not found");
    }

    [Fact]
    public async Task CreateSession_ReturnsCreatedSessionIdWithInitialVersion()
    {
        // Arrange
        var client = _factory.CreateClient();

        var userId = "user123";
        var json = "{\"foo\": \"bar\"}";
        var request = new CreateSessionRequest(userId, JsonDocument.Parse(json).RootElement);

        // Act
        var response = await client.PostAsJsonAsync("/api/sessions", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        // Validate response body
        var responseBody = await response.Content.ReadFromJsonAsync<CreateSessionResponse>();
        responseBody.Should().NotBeNull();
        responseBody!.UserId.Should().NotBeNullOrEmpty();
        responseBody.Version.Should().Be(1);
        responseBody.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TestConstants.DateTimeTolerance);

        // Validate location header
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.ToString().Should().Be($"/api/sessions/{userId}");

        // Validate database state
        var dbSession = await _testDb.GetCollection<Session>("sessions").Find(s => s.UserId == userId).FirstOrDefaultAsync();

        dbSession.Should().NotBeNull();
        dbSession!.UserId.Should().Be(request.UserId);
        dbSession.Version.Should().Be(1);
        dbSession.CreatedAt.Should().BeCloseTo(responseBody.CreatedAt, TestConstants.DateTimeTolerance);

        var expectedBson = BsonSerializer.Deserialize<BsonDocument>(json);
        dbSession.Data.Should().BeEquivalentTo(expectedBson);
    }

    [Fact]
    public async Task UpdateSession_ValidVersion_ReturnsIncrementedVersionAndTimestamp()
    {
        // Arrange
        var client = _factory.CreateClient();
        var session = new Session
        {
            Version = 1,
            UserId = "test-user",
            Data = new BsonDocument { ["initial"] = "data" },
            CreatedAt = DateTime.UtcNow
        };
        await _testDb.GetCollection<Session>("sessions").InsertOneAsync(session);

        var json = "{\"new\": \"data\"}";
        var updateRequest = new UpdateSessionRequest(CurrentVersion: 1, Data: JsonDocument.Parse(json).RootElement);

        // Act
        var response = await client.PutAsJsonAsync($"/api/sessions/{session.UserId}", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var responseBody = await response.Content.ReadFromJsonAsync<UpdateSessionResponse>();
        responseBody.Should().NotBeNull();
        responseBody!.UserId.Should().Be("test-user");
        responseBody.NewVersion.Should().Be(2);
        responseBody.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TestConstants.DateTimeTolerance);

        var dbSession = await _testDb.GetCollection<Session>("sessions").Find(s => s.UserId == "test-user").FirstOrDefaultAsync();
        dbSession.Version.Should().Be(2);
    }

    [Fact]
    public async Task UpdateSession_WithInvalidVersion_ReturnsConflict()
    {
        // Arrange
        var client = _factory.CreateClient();
        var session = new Session
        {
            Version = 1,
            CreatedAt = DateTime.UtcNow,
            UserId = "user123",
            Data = new BsonDocument("key", "old")
        };
        await _testDb.GetCollection<Session>("sessions").InsertOneAsync(session);

        // Act
        var json = "{\"key\": \"new\"}";
        var request = new UpdateSessionRequest(2, JsonDocument.Parse(json).RootElement);
        var response = await client.PutAsJsonAsync($"/api/sessions/{session.UserId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("Version mismatch");
    }
}

public class TestConstants
{
    // Adjust this value as needed for test debugging
    public static readonly TimeSpan DateTimeTolerance =
#if DEBUG
        TimeSpan.FromSeconds(600);
#else
        TimeSpan.FromSeconds(1);
#endif
}