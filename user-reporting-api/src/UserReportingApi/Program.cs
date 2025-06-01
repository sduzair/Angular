using MongoDB.Bson;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});


var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseCors("AllowAll");
}

app.MapGet("/api/users", async (IMongoDatabase db) =>
{
    var collection = db.GetCollection<UserRecord>("users");
    var sortDefinition = Builders<UserRecord>.Sort.Ascending("id");
    var documents = await collection.Find(FilterDefinition<UserRecord>.Empty).Sort(sortDefinition).ToListAsync();

    var result = documents.Select(document =>
        {
            // Convert ExtraElements to a dictionary
            var dict = document.ExtraElements.ToDictionary(
                elem => elem.Name,
                elem => BsonTypeMapper.MapToDotNetValue(elem.Value));

            // Add the Id as a string (for JSON serialization)
            dict["_id"] = document.UserId.ToString();

            return dict;
        }).ToList();

    return Results.Ok(result);
});

app.MapGet("/api/sessions/{userId}", static async (IMongoDatabase db, string userId) =>
{
    var collection = db.GetCollection<Session>("sessions");
    var filter = Builders<Session>.Filter.Eq(x => x.UserId, userId);
    Session? document = await collection.Find(filter).FirstOrDefaultAsync();

    if (document is null)
    {
        return Results.NotFound(new
        {
            Title = "Session not found",
            UserId = userId
        });
    }

    return Results.Ok(new GetSessionResponse
    {
        Id = document.Id.ToString(),
        Version = document.Version,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt,
        UserId = document.UserId,
        Data = BsonTypeMapper.MapToDotNetValue(document.Data)
    });
});

app.MapPost("/api/sessions", async (IMongoDatabase db, CreateSessionRequest request) =>
{
    var collection = db.GetCollection<Session>("sessions");

    // Add system-managed fields
    var session = new Session
    {
        Version = 1,
        CreatedAt = DateTime.UtcNow,
        UserId = request.UserId,
        Data = request.Data.ToBsonDocument()
    };

    await collection.InsertOneAsync(session);
    return Results.Created($"/api/sessions/{session.UserId}", new CreateSessionResponse(session.UserId, session.Version, session.CreatedAt));
});

app.MapPut("/api/sessions/{userId}", async (IMongoDatabase db, string userId, UpdateSessionRequest request) =>
{
    var collection = db.GetCollection<Session>("sessions");

    var filter = Builders<Session>.Filter.And(
        Builders<Session>.Filter.Eq(x => x.UserId, userId),
        Builders<Session>.Filter.Eq(x => x.Version, request.CurrentVersion)
    );

    var newVersion = request.CurrentVersion + 1;
    var updatedTime = DateTime.UtcNow;
    var update = Builders<Session>.Update
        .Set(x => x.Data, request.Data.ToBsonDocument())
        .Set(x => x.Version, newVersion)
        .Set(x => x.UpdatedAt, updatedTime);

    var result = await collection.UpdateOneAsync(filter, update);

    if (result.MatchedCount == 0)
    {
        return Results.Conflict("Version mismatch or document not found");
    }

    // Return minimal success response
    return Results.Ok(new UpdateSessionResponse(
        userId,
        newVersion,
        updatedTime
    ));
});

app.Run();

public partial class Program { }