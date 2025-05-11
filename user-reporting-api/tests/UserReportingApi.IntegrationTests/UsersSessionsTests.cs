using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Driver;

namespace UserReportingApi.IntegrationTests;

public class UsersSessionsTests
    : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly IMongoDatabase _testDb;

    public UsersSessionsTests(WebApplicationFactory<Program> factory)
    {
        var connectionString = Environment.GetEnvironmentVariable("MongoDB__ConnectionString");
        var dbName = Environment.GetEnvironmentVariable("MongoDB__DatabaseName") + "_test";
        _factory = factory.WithWebHostBuilder(builder =>
        {
            // Override configuration for testing
            builder.ConfigureAppConfiguration((context, config) =>
            {
                _ = config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["MongoDB:ConnectionString"] = connectionString,
                    ["MongoDB:DatabaseName"] = dbName,
                });
            });
        });

        // Initialize test database
        var client = new MongoClient(connectionString);
        _testDb = client.GetDatabase(dbName);
    }

    public void Dispose()
    {
        // Cleanup test database after each test
        _testDb.DropCollection("users");
        _testDb.DropCollection("sessions");
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
    public async Task CreateSession_ReturnsCreatedSessionIdWithInitialVersion()
    {
        // Arrange
        var client = _factory.CreateClient();
        var requestData = JsonDocument.Parse("{\"key\":\"value\"}").RootElement;
        var request = new CreateSessionRequest("user123", requestData);

        // Act
        var response = await client.PostAsJsonAsync("/api/sessions", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        // Validate response body
        var responseBody = await response.Content.ReadFromJsonAsync<CreateSessionResponse>();
        responseBody.Should().NotBeNull();
        responseBody!.SessionId.Should().NotBeNullOrEmpty();
        responseBody.Version.Should().Be(1);
        responseBody.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TestConstants.DateTimeTolerance);

        // Validate location header
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.ToString().Should().Be($"/api/sessions/{responseBody.SessionId}");

        // Validate database state
        var sessionId = ObjectId.Parse(responseBody.SessionId);
        var dbSession = await _testDb.GetCollection<Session>("sessions").Find(s => s.Id == sessionId).FirstOrDefaultAsync();

        dbSession.Should().NotBeNull();
        dbSession!.UserId.Should().Be(request.UserId);
        dbSession.Data.Should().BeEquivalentTo(requestData.ToBsonDocument());
        dbSession.Version.Should().Be(1);
        dbSession.CreatedAt.Should().BeCloseTo(responseBody.CreatedAt, TestConstants.DateTimeTolerance);
    }

    [Fact]
    public async Task UpdateSession_ValidVersion_ReturnsIncrementedVersionAndTimestamp()
    {
        // Arrange
        var client = _factory.CreateClient();
        var session = new Session
        {
            Id = ObjectId.GenerateNewId(),
            Version = 1,
            UserId = "test-user",
            Data = new BsonDocument { ["initial"] = "data" },
            CreatedAt = DateTime.UtcNow
        };
        await _testDb.GetCollection<Session>("sessions").InsertOneAsync(session);

        var updateRequest = new UpdateSessionRequest(CurrentVersion: 1, Data: JsonDocument.Parse("{ \"new\": \"data\" }").RootElement);

        // Act
        var response = await client.PutAsJsonAsync($"/api/sessions/{session.Id}", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<UpdateSessionResponse>();
        content.Should().NotBeNull();
        content!.NewVersion.Should().Be(2);
        content.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TestConstants.DateTimeTolerance);

        var dbSession = await _testDb.GetCollection<Session>("sessions").Find(s => s.Id == session.Id).FirstOrDefaultAsync();
        dbSession.Version.Should().Be(2);
    }

    [Fact]
    public async Task UpdateSession_WithInvalidVersion_ReturnsConflict()
    {
        // Arrange
        var client = _factory.CreateClient();
        var session = new Session
        {
            Id = ObjectId.GenerateNewId(),
            Version = 1,
            CreatedAt = DateTime.UtcNow,
            UserId = "user123",
            Data = new BsonDocument("key", "value")
        };
        await _testDb.GetCollection<Session>("sessions").InsertOneAsync(session);

        // Act
        var response = await client.PutAsJsonAsync($"/api/sessions/{session.Id}", new UpdateSessionRequest(2, JsonDocument.Parse("{}").RootElement));

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