using System.Security.Cryptography.X509Certificates;
using MongoDB.Bson;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var env = sp.GetRequiredService<IHostEnvironment>();
    var logger = sp.GetRequiredService<ILogger<Program>>();

    var connectionString = config["MongoDB:ConnectionString"]
        ?? throw new InvalidOperationException("MongoDB connection string missing");
    var databaseName = config["MongoDB:DatabaseName"]
        ?? throw new InvalidOperationException("MongoDB database name missing");

    logger.LogInformation("Connecting to MongoDB at {ConnectionString}", connectionString);
    logger.LogInformation("Using database: {DatabaseName}", databaseName);

    var mongoSettings = MongoClientSettings.FromConnectionString(connectionString);

    if (env.IsProduction())
    {
        var clientCertPath = config["MongoDB:CLIENT_CERT_PATH"]
            ?? throw new InvalidOperationException("MongoDB client cert path missing");
        var clientCert = X509Certificate2.CreateFromPemFile(clientCertPath);
        mongoSettings.UseTls = true;
        mongoSettings.SslSettings = new SslSettings { ClientCertificates = [clientCert] };
        logger.LogInformation("TLS authentication enabled for MongoDB (Production)");
    }
    else
    {
        logger.LogInformation("TLS authentication is NOT enabled for MongoDB (Non-production)");
    }

    logger.LogDebug("Connecting to MongoDB at {ConnectionString}", connectionString);
    logger.LogDebug("Using database: {DatabaseName}", databaseName);

    try
    {
        var client = new MongoClient(mongoSettings);
        var database = client.GetDatabase(databaseName);
        // Force connection and server check
        database.RunCommandAsync((Command<BsonDocument>)"{ping:1}").Wait();
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

app.UseRouting();

if (app.Environment.IsDevelopment())
{
    app.UseCors("AllowAll");
}

if (app.Environment.IsProduction())
{
    app.UseStaticFiles();
}

app.MapGet("/api/strTxns", async (IMongoDatabase db, int? limit) =>
{
    var collection = db.GetCollection<StrTxnRecord>("strTxns");
    var sortDefinition = Builders<StrTxnRecord>.Sort.Ascending("dateOfTxn");
    var findFluent = collection.Find(FilterDefinition<StrTxnRecord>.Empty).Sort(sortDefinition);
    if (limit.HasValue && limit.Value > 0)
    {
        findFluent = findFluent.Limit(limit.Value);
    }
    var documents = await findFluent.ToListAsync();

    var result = documents.Select(document =>
        {
            // Convert ExtraElements to a dictionary
            var dict = document.ExtraElements.ToDictionary(
                elem => elem.Name,
                elem => BsonTypeMapper.MapToDotNetValue(elem.Value));

            // Add the Id as a string (for JSON serialization)
            dict["_mongoid"] = document.Id.ToString();

            return dict;
        }).ToList();

    return Results.Ok(result);
});

app.MapGet("/api/sessions/{sessionId}", static async (IMongoDatabase db, string sessionId) =>
{
    if (!ObjectId.TryParse(sessionId, out ObjectId sessionObjectId))
    {
        return Results.BadRequest(new { Title = "Invalid session ID format", SessionId = sessionId });
    }

    var collection = db.GetCollection<Session>("sessions");
    var filter = Builders<Session>.Filter.Eq(x => x.Id, sessionObjectId);
    Session? document = await collection.Find(filter).FirstOrDefaultAsync();

    if (document is null)
    {
        return Results.NotFound(new
        {
            Title = "Session not found",
            SessionId = sessionId
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
        Version = 0,
        CreatedAt = DateTime.UtcNow,
        UserId = request.UserId,
        Data = request.Data.ToBsonDocument()
    };

    await collection.InsertOneAsync(session);
    return Results.Created($"/api/sessions/{session.Id}", new CreateSessionResponse(
        session.Id.ToString(),
        session.UserId,
        session.Version,
        session.CreatedAt));
});

app.MapPut("/api/sessions/{sessionId}", async (IMongoDatabase db, string sessionId, UpdateSessionRequest request) =>
{
    if (!ObjectId.TryParse(sessionId, out ObjectId sessionObjectId))
    {
        return Results.BadRequest(new { Title = "Invalid session ID format", SessionId = sessionId });
    }
    var collection = db.GetCollection<Session>("sessions");

    var filter = Builders<Session>.Filter.And(
        Builders<Session>.Filter.Eq(x => x.Id, sessionObjectId),
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
        sessionId,
        newVersion,
        updatedTime
    ));
});

app.MapFallbackToFile("index.html");

const string TestSessionIdString = "64a7f8c9e3a5b1d2f3c4e5a6";
var testSessionId = ObjectId.Parse(TestSessionIdString);
var sessionsCollection = app.Services.GetRequiredService<IMongoDatabase>().GetCollection<Session>("sessions");

var existingTestSession = await sessionsCollection.Find(s => s.Id == testSessionId).FirstOrDefaultAsync();
if (existingTestSession == null)
{
    var testSession = new Session
    {
        Id = testSessionId,
        Version = 0,
        CreatedAt = DateTime.UtcNow,
        UserId = "test-user",
        Data = new BsonDocument { { "testKey", "testValue" } }
    };
    await sessionsCollection.InsertOneAsync(testSession);
}


app.Run();

public partial class Program { }