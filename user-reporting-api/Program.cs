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
    return Results.Json(documents.ConvertAll(d => d.ToDictionary()));
});

// Sessions endpoints with optimistic concurrency
app.MapGet("/api/sessions", async (IMongoDatabase db) =>
{
    var collection = db.GetCollection<BsonDocument>("sessions");
    var documents = await collection.Find(FilterDefinition<BsonDocument>.Empty).ToListAsync();
    return Results.Json(documents.ConvertAll(d => d.ToDictionary()));
});

app.MapPost("/api/sessions", async (IMongoDatabase db, BsonDocument session) =>
{
    var collection = db.GetCollection<BsonDocument>("sessions");

    // Add system-managed fields
    session["_id"] = ObjectId.GenerateNewId();
    session["version"] = 1;
    session["createdAt"] = DateTime.UtcNow;

    await collection.InsertOneAsync(session);
    return Results.Created($"/api/sessions/{session["_id"]}", session.ToDictionary());
});

// Update endpoint with version check
app.MapPut("/api/sessions/{id}", async (IMongoDatabase db, string id, BsonDocument updatedSession) =>
{
    var collection = db.GetCollection<BsonDocument>("sessions");

    if (!updatedSession.Contains("version"))
        return Results.BadRequest("Version field required");

    var currentVersion = updatedSession["version"].AsInt32;
    var filter = Builders<BsonDocument>.Filter.And(
        Builders<BsonDocument>.Filter.Eq("_id", new ObjectId(id)),
        Builders<BsonDocument>.Filter.Eq("version", currentVersion)
    );

    updatedSession["version"] = currentVersion + 1;

    var result = await collection.ReplaceOneAsync(filter, updatedSession);

    return result.MatchedCount == 1
        ? Results.Ok(updatedSession.ToDictionary())
        : Results.Conflict("Version mismatch or document not found");
});

app.Run();
