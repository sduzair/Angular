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
    public async Task GetStrTxns_ReturnsSuccessAndStrTxns()
    {
        // Arrange
        var client = _factory.CreateClient();
        await _testDb.GetCollection<BsonDocument>("strTxns")
            .InsertManyAsync(
            [
                new BsonDocument { { "type", "ABM" } },
                new BsonDocument { { "type", "OLB" } }
            ]);

        // Act
        var response = await client.GetAsync("/api/strTxns");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var strTxns = await response.Content.ReadFromJsonAsync<List<Dictionary<string, object>>>();
        strTxns.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetSession_BySessionId_ReturnsMatchingSession()
    {
        // Arrange
        var client = _factory.CreateClient();
        var userId = "testUser123";
        var session = new Session
        {
            UserId = userId,
            Version = 0,
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            Data = new BsonDocument { ["key1"] = "value1" }
        };

        await _testDb.GetCollection<Session>("sessions").InsertOneAsync(session);

        // Act
        var response = await client.GetAsync($"/api/sessions/{session.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var sessionRes = await response.Content.ReadFromJsonAsync<GetSessionResponse>();
        sessionRes.Should().NotBeNull();
        sessionRes!.Id.Should().Be(session.Id.ToString());
        sessionRes!.UserId.Should().Be(userId);
        sessionRes.Version.Should().Be(0);
        sessionRes.Data.Should().NotBeNull();
        ((JsonElement)sessionRes.Data).GetProperty("key1").GetString().Should().Be("value1");
    }

    [Fact]
    public async Task GetSession_InvalidSessionId_Returns400()
    {
        // Arrange
        var client = _factory.CreateClient();
        var invalidSessionId = "session01";

        // Act
        var response = await client.GetAsync($"/api/sessions/{invalidSessionId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problemDetails.Should().NotBeNull();
        problemDetails!.Title.Should().Contain("Invalid session ID");
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
        responseBody!.SessionId.Should().NotBeNullOrEmpty();
        responseBody!.UserId.Should().NotBeNullOrEmpty();
        responseBody.Version.Should().Be(0);
        responseBody.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TestConstants.DateTimeTolerance);

        // Validate location header
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.ToString().Should().Be($"/api/sessions/{responseBody.SessionId}");

        // Validate database state
        var dbSession = await _testDb.GetCollection<Session>("sessions")
            .Find(s => s.Id.ToString() == responseBody.SessionId)
            .FirstOrDefaultAsync();

        dbSession.Should().NotBeNull();
        dbSession!.Id.ToString().Should().Be(responseBody.SessionId);
        dbSession!.UserId.Should().Be(request.UserId);
        dbSession.Version.Should().Be(0);
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
            Version = 0,
            UserId = "test-user",
            Data = new BsonDocument { ["initial"] = "data" },
            CreatedAt = DateTime.UtcNow
        };
        await _testDb.GetCollection<Session>("sessions").InsertOneAsync(session);

        var json = "{\"new\": \"data\"}";
        var updateRequest = new UpdateSessionRequest(CurrentVersion: 0, Data: JsonDocument.Parse(json).RootElement);

        // Act
        var response = await client.PutAsJsonAsync($"/api/sessions/{session.Id}", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var responseBody = await response.Content.ReadFromJsonAsync<UpdateSessionResponse>();
        responseBody.Should().NotBeNull();
        responseBody!.SessionId.Should().Be(session.Id.ToString());
        responseBody.NewVersion.Should().Be(1);
        responseBody.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TestConstants.DateTimeTolerance);

        var dbSession = await _testDb.GetCollection<Session>("sessions").Find(s => s.Id == session.Id).FirstOrDefaultAsync();
        dbSession.Version.Should().Be(1);
    }

    [Fact]
    public async Task UpdateSession_WithInvalidVersion_ReturnsConflict()
    {
        // Arrange
        var client = _factory.CreateClient();
        var session = new Session
        {
            Version = 0,
            CreatedAt = DateTime.UtcNow,
            UserId = "user123",
            Data = new BsonDocument("key", "old")
        };
        await _testDb.GetCollection<Session>("sessions").InsertOneAsync(session);

        // Act
        var json = "{\"key\": \"new\"}";
        var request = new UpdateSessionRequest(
            CurrentVersion: 1,
            Data: JsonDocument.Parse(json).RootElement);
        var response = await client.PutAsJsonAsync($"/api/sessions/{session.Id}", request);

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