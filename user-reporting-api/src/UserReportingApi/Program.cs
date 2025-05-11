using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

// Configure MongoDB with proper logging
builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var logger = sp.GetRequiredService<ILogger<Program>>();

    var connectionString = config["MongoDB:ConnectionString"]
        ?? throw new InvalidOperationException("MongoDB connection string missing");
    var databaseName = config["MongoDB:DatabaseName"]
        ?? throw new InvalidOperationException("MongoDB database name missing");

    logger.LogInformation("Connecting to MongoDB at {ConnectionString}", connectionString);
    logger.LogDebug("Using database: {DatabaseName}", databaseName);

    try
    {
        var client = new MongoClient(connectionString);
        var database = client.GetDatabase(databaseName);
        logger.LogInformation("Successfully connected to MongoDB");
        return database;
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to connect to MongoDB");
        throw;
    }
});


var app = builder.Build();

// Users endpoint
app.MapGet("/api/users", async (IMongoDatabase db) =>
{
    var collection = db.GetCollection<BsonDocument>("users");
    var documents = await collection.Find(FilterDefinition<BsonDocument>.Empty).ToListAsync();
    var converted = documents.Select(d =>
    {
        var dict = new Dictionary<string, object?>
        {
            ["_id"] = d["_id"].AsObjectId.ToString()  // Only explicit conversion
        };

        // Add other fields with automatic type conversion
        foreach (var element in d.Elements.Where(e => e.Name != "_id"))
        {
            dict[element.Name] = BsonTypeMapper.MapToDotNetValue(element.Value);
        }

        return dict;
    });

    return Results.Ok(converted);
});

// Sessions endpoints with optimistic concurrency
app.MapGet("/api/sessions", async (IMongoDatabase db) =>
{
    var collection = db.GetCollection<Session>("sessions");
    var documents = await collection.Find(FilterDefinition<Session>.Empty).ToListAsync();
    return Results.Ok(documents);
});

app.MapPost("/api/sessions", async (IMongoDatabase db, CreateSessionRequest request) =>
{
    var collection = db.GetCollection<Session>("sessions");

    // Add system-managed fields
    var session = new Session
    {
        Id = ObjectId.GenerateNewId(),
        Version = 1,
        CreatedAt = DateTime.UtcNow,
        UserId = request.UserId,
        Data = request.Data.ToBsonDocument() // Extension method
    };

    await collection.InsertOneAsync(session);
    return Results.Created($"/api/sessions/{session.Id}", new CreateSessionResponse(session.Id.ToString(), session.Version, session.CreatedAt));
});

// Update endpoint with version check
app.MapPut("/api/sessions/{id}", async (IMongoDatabase db, string id, UpdateSessionRequest request) =>
{
    var collection = db.GetCollection<Session>("sessions");

    var filter = Builders<Session>.Filter.And(
        Builders<Session>.Filter.Eq(x => x.Id, new ObjectId(id)),
        Builders<Session>.Filter.Eq(x => x.Version, request.CurrentVersion)
    );

    var update = Builders<Session>.Update
        .Set(x => x.Data, request.Data.ToBsonDocument())
        .Set(x => x.Version, request.CurrentVersion + 1)
        .Set(x => x.UpdatedAt, DateTime.UtcNow);

    var options = new FindOneAndUpdateOptions<Session>
    {
        ReturnDocument = ReturnDocument.After
    };

    try
    {
        var updatedSession = await collection.FindOneAndUpdateAsync(filter, update, options);
        return updatedSession != null
            ? Results.Ok(new UpdateSessionResponse(updatedSession.Version, updatedSession.UpdatedAt))
            : Results.Conflict("Version mismatch or document not found");
    }
    catch (MongoCommandException ex) when (ex.Code == 11000)
    {
        return Results.Conflict("Update conflict detected");
    }
});

app.Run();

public partial class Program { }

// DTOs
public record CreateSessionRequest(string UserId, JsonElement Data);
public record CreateSessionResponse(string SessionId, int Version, DateTime CreatedAt);
public record UpdateSessionRequest(int CurrentVersion, JsonElement Data);
public record UpdateSessionResponse(int NewVersion, DateTime? UpdatedAt);

// Models
public class Session
{
    public ObjectId Id { get; set; }
    public int Version { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string UserId { get; set; }
    public BsonDocument Data { get; set; }
}

public static class JsonExtensions
{
    public static BsonDocument ToBsonDocument(this JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Undefined || element.ValueKind == JsonValueKind.Null)
        {
            return new BsonDocument();
        }
        return BsonDocument.Parse(element.GetRawText());
    }
}