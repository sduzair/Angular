using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Driver;
using UserReportingApi.DTOs;
using UserReportingApi.DTOs.Json;
using UserReportingApi.Entities;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

// Serialization config
builder.Services.ConfigureHttpJsonOptions(o =>
    JsonConfiguration.ConfigureJsonOptions(o.SerializerOptions));


var camelCaseConvention = new MongoDB.Bson.Serialization.Conventions.ConventionPack { new MongoDB.Bson.Serialization.Conventions.CamelCaseElementNameConvention() };
MongoDB.Bson.Serialization.Conventions.ConventionRegistry.Register("CamelCase", camelCaseConvention, type => true);

// Register IMongoClient as a singleton
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var env = sp.GetRequiredService<IHostEnvironment>();
    var logger = sp.GetRequiredService<ILogger<Program>>();

    var connectionString = config["MongoDB:ConnectionString"];

    logger.LogInformation("Connecting to MongoDB at {ConnectionString}", connectionString);

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

    try
    {
        var client = new MongoClient(mongoSettings);
        logger.LogInformation("MongoClient instance created successfully");
        return client;
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to create MongoClient");
        throw;
    }
});

// Register IMongoDatabase using the IMongoClient from DI
builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    var config = sp.GetRequiredService<IConfiguration>();
    var logger = sp.GetRequiredService<ILogger<Program>>();

    var databaseName = config["MongoDB:DatabaseName"];
    logger.LogInformation("Using database: {DatabaseName}", databaseName);

    try
    {
        var database = client.GetDatabase(databaseName);
        // Force connection and server check
        database.RunCommandAsync((Command<BsonDocument>)"{ping:1}").Wait();
        logger.LogInformation("Successfully connected to MongoDB database: {DatabaseName}", databaseName);
        return database;
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to connect to MongoDB database");
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

var api = app.MapGroup("/api");

api.MapPost("/transaction/search", async (
    TransactionSearchRequest searchRequest,
    IMongoDatabase db,
    HttpResponse response,
    CancellationToken cancellationToken) =>
{
    response.ContentType = "application/json; charset=utf-8";
    await using var writer = new StreamWriter(response.Body);

    await writer.WriteAsync("[");
    bool isFirstSource = true;

    // Define sources without creating cursors upfront
    var sources = new (string sourceId, string collectionName)[]
    {
        ("FlowOfFunds", "flowOfFunds"),
        ("ABM", "abm"),
        ("OLB", "olb"),
        ("EMT", "emt"),
        ("Wire", "wire"),
        ("OTC", "otc"),
    };

    foreach (var (sourceId, collectionName) in sources)
    {
        if (!isFirstSource) await writer.WriteAsync(",");
        else isFirstSource = false;

        var collection = db.GetCollection<BsonDocument>(collectionName);

        var limit = 10;
        string[] nolimit = { "flowOfFunds" };
        if (nolimit.Contains(collectionName))
            limit = 0;

        // Create cursor and automatically dispose with 'using'
        using var cursor = await collection
            .Find(FilterDefinition<BsonDocument>.Empty).Limit(limit)
            .ToCursorAsync(cancellationToken);

        string status = "completed";
        List<Dictionary<string, object>> docs = [];

        try
        {
            while (await cursor.MoveNextAsync(cancellationToken))
            {
                docs.AddRange(cursor.Current.Select(doc =>
               {
                   var dict = new Dictionary<string, object>();

                   // Convert all BSON elements to .NET types
                   foreach (var element in doc.Elements)
                   {
                       if (element.Name == "_id")
                       {
                           dict["_mongoid"] = element.Value.ToString()!;
                       }
                       else
                       {
                           dict[element.Name] = BsonTypeMapper.MapToDotNetValue(element.Value);
                       }
                   }

                   return dict;
               }));
            }
        }
        catch (Exception)
        {
            status = "failed";
            docs.Clear();
        }

        var sourceObject = new
        {
            sourceId,
            status,
            sourceData = docs
        };
        var json = JsonSerializer.Serialize(sourceObject);
        await writer.WriteAsync(json);
        await writer.FlushAsync(cancellationToken);

        // Random delay between 500ms and 1500ms
        int delayMs = new Random().Next(500, 1501);
        await Task.Delay(delayMs, cancellationToken);
    }

    await writer.WriteAsync("]");
});

api.MapGet("/aml/{amlId}/partyaccountinfo", async (
    string amlId,
    IMongoDatabase database,
    HttpContext context) =>
{
    var partyAccountInfoCollection = database.GetCollection<AmlPartyAccountInfo>("amlPartyAccountInfo");
    var filter = Builders<AmlPartyAccountInfo>.Filter.Eq(x => x.AmlId, amlId);
    var partyAccountInfo = await partyAccountInfoCollection.Find(filter).FirstOrDefaultAsync();

    if (partyAccountInfo == null)
        return Results.NotFound(new { message = $"Party account info not found for AML ID: {amlId}" });

    return Results.Ok(partyAccountInfo);
});

api.MapGet("/aml/partyinfo/{partyKey}", async (
    string partyKey,
    IMongoDatabase database,
    HttpContext context) =>
{
    var partyInfoCollection = database.GetCollection<PartyInfo>("partyInfo");
    var filter = Builders<PartyInfo>.Filter.Eq(x => x.PartyKey, partyKey);
    var partyInfo = await partyInfoCollection.Find(filter).FirstOrDefaultAsync();

    if (partyInfo == null)
        return Results.NotFound(new { message = $"Party info not found for Party key: {partyKey}" });

    return Results.Ok(partyInfo);
});

api.MapGet("/aml/accountinfo/{account}", async (
    string account,
    IMongoDatabase database,
    HttpContext context) =>
{
    var accountInfoCollection = database.GetCollection<AccountInfo>("accountInfo");
    var filter = Builders<AccountInfo>.Filter.Eq(x => x.Account, account);
    var accountInfo = await accountInfoCollection.Find(filter).FirstOrDefaultAsync();

    if (accountInfo == null)
        return Results.NotFound(new { message = $"Account info not found for Account no: {account}" });

    return Results.Ok(accountInfo);
});

api.MapGet("/aml/formoptions", async (
    IMongoDatabase database,
    HttpContext context) =>
{
    var formOptionsCollection = database.GetCollection<FormOptions>("formOptions");
    var filter = Builders<FormOptions>.Filter.Empty;
    var formOptions = await formOptionsCollection.Find(filter).FirstOrDefaultAsync();

    if (formOptions == null)
        return Results.NotFound(new { message = $"Form options not found" });

    return Results.Ok(formOptions);
});

api.MapGet("/aml/{amlId}/caserecord", async (
    string amlId,
    IMongoDatabase database,
    HttpContext context) =>
{
    var caseRecords = database.GetCollection<CaseRecord>("caseRecord");
    var filter = Builders<CaseRecord>.Filter.Eq(x => x.AmlId, amlId);
    var caseRecord = await caseRecords.Find(filter).FirstOrDefaultAsync();

    if (caseRecord == null)
        return Results.NotFound(new { message = $"Case record not found for AML ID: {amlId}" });

    context.Response.Headers["ETag"] = $"\"{caseRecord.ETag}\"";

    return Results.Ok(caseRecord);
});

api.MapPost("/caserecord/{caseRecordId}/update", async (
    string caseRecordId,
    UpdateCaseRecordRequest request,
    IMongoDatabase database,
    HttpContext context) =>
{
    var caseRecords = database.GetCollection<CaseRecord>("caseRecord");

    // Build filter with ETag check for optimistic concurrency
    var filter = Builders<CaseRecord>.Filter.And(
        Builders<CaseRecord>.Filter.Eq(x => x.CaseRecordId, caseRecordId),
        Builders<CaseRecord>.Filter.Eq(x => x.ETag, request.ETag)
    );

    var currentUser = context.User.Identity?.Name ?? "System";
    var update = Builders<CaseRecord>.Update
        .Set(x => x.SearchParams, request.SearchParams)
        .Set(x => x.LastUpdated, DateTime.UtcNow)
        .Set(x => x.LastUpdatedBy, currentUser)
        .Inc(x => x.ETag, 1);

    var options = new FindOneAndUpdateOptions<CaseRecord>
    {
        ReturnDocument = ReturnDocument.After
    };

    var updatedRecord = await caseRecords.FindOneAndUpdateAsync(filter, update, options);

    if (updatedRecord == null)
    {
        // Check if case record exists or if it's an ETag mismatch
        var currentRecord = await caseRecords
            .Find(Builders<CaseRecord>.Filter.Eq(x => x.CaseRecordId, caseRecordId))
            .FirstOrDefaultAsync();

        if (currentRecord == null)
            return Results.NotFound(new { message = $"Case record not found: {caseRecordId}" });

        return Results.Conflict(new
        {
            message = "Resource has been modified by another user",
            currentETag = currentRecord.ETag,
            requestedETag = request.ETag,
            currentState = currentRecord
        });
    }

    context.Response.Headers["ETag"] = $"\"{updatedRecord.ETag}\"";

    return Results.Ok(updatedRecord);
});

api.MapGet("/caserecord/{caseRecordId}/selections", async (
    string caseRecordId,
    IMongoDatabase database) =>
{
    var selections = database.GetCollection<Selection>("selections");
    var filter = Builders<Selection>.Filter.Eq(x => x.CaseRecordId, caseRecordId);
    var selectionList = await selections.Find(filter).ToListAsync();

    return Results.Ok(new FetchSelectionsResponse(selectionList));
});

api.MapPost("/caserecord/{caseRecordId}/selections/add", async (
    string caseRecordId,
    AddSelectionsRequest request,
    IMongoClient mongoClient,
    IMongoDatabase database, HttpContext context, CancellationToken cancellationToken) =>
{
    var caseRecords = database.GetCollection<CaseRecord>("caseRecord");
    var selections = database.GetCollection<Selection>("selections");

    // Start a session for transaction
    using var session = await mongoClient.StartSessionAsync(cancellationToken: cancellationToken);

    var result = await session.WithTransactionAsync(
        async (s, ct) =>
            {
                // Verify case record ETag within transaction
                var caseFilter = Builders<CaseRecord>.Filter.And(
                    Builders<CaseRecord>.Filter.Eq(x => x.CaseRecordId, caseRecordId),
                    Builders<CaseRecord>.Filter.Eq(x => x.ETag, request.CaseETag)
                );

                var caseRecord = await caseRecords.Find(s, caseFilter)
                    .FirstOrDefaultAsync(cancellationToken: ct);

                if (caseRecord == null)
                {
                    // Return null to signal validation failure
                    return null;
                }

                // Insert selections within transaction
                var selectionsToInsert = request.Selections.Select(sel =>
                {
                    sel.CaseRecordId = caseRecordId;
                    sel.ETag = 0;
                    sel.ChangeLogs = [];
                    return sel;
                }).ToList();

                if (selectionsToInsert.Count != 0)
                {
                    await selections.InsertManyAsync(s, selectionsToInsert, cancellationToken: ct);
                }

                var currentUser = context.User.Identity?.Name ?? "System";

                // Update case record ETag within transaction
                var update = Builders<CaseRecord>.Update
                    .Inc(x => x.ETag, 1)
                    .Set(x => x.LastUpdatedBy, currentUser)
                    .Set(x => x.LastUpdated, DateTime.UtcNow);

                var options = new FindOneAndUpdateOptions<CaseRecord>
                {
                    ReturnDocument = ReturnDocument.After
                };

                var updatedCase = await caseRecords.FindOneAndUpdateAsync(
                    s, caseFilter, update, options, cancellationToken: ct);

                return new AddSelectionsResponse(
                    CaseETag: updatedCase.ETag,
                    Count: selectionsToInsert.Count,
                    LastUpdated: updatedCase.LastUpdated!.Value
                );
            }, cancellationToken: cancellationToken);

    // Handle validation failures outside transaction
    if (result == null)
    {
        var existingCase = await caseRecords
            .Find(Builders<CaseRecord>.Filter.Eq(x => x.CaseRecordId, caseRecordId))
            .FirstOrDefaultAsync(cancellationToken: cancellationToken);

        if (existingCase == null)
            return Results.NotFound(new { message = $"Case record not found: {caseRecordId}" });

        return Results.Conflict(new
        {
            message = "Case record has been modified by another user",
            currentETag = existingCase.ETag,
            requestedETag = request.CaseETag
        });
    }

    return Results.Ok(result);
});

api.MapPost("/caserecord/{caseRecordId}/selections/remove", async (
    string caseRecordId,
    RemoveSelectionsRequest request,
    IMongoClient mongoClient,
    IMongoDatabase database, HttpContext context, CancellationToken cancellationToken) =>
{
    var caseRecords = database.GetCollection<CaseRecord>("caseRecord");
    var selections = database.GetCollection<Selection>("selections");

    using var session = await mongoClient.StartSessionAsync(cancellationToken: cancellationToken);

    var result = await session.WithTransactionAsync(
        async (s, ct) =>
        {
            // Verify case record ETag
            var caseFilter = Builders<CaseRecord>.Filter.And(
                Builders<CaseRecord>.Filter.Eq(x => x.CaseRecordId, caseRecordId),
                Builders<CaseRecord>.Filter.Eq(x => x.ETag, request.CaseETag)
            );

            var caseRecord = await caseRecords.Find(s, caseFilter)
                .FirstOrDefaultAsync(cancellationToken: ct);

            if (caseRecord == null)
            {
                // Return null to signal validation failure
                return null;
            }

            // Remove selections within transaction
            var filter = Builders<Selection>.Filter.And(
                Builders<Selection>.Filter.Eq(x => x.CaseRecordId, caseRecordId),
                Builders<Selection>.Filter.In(x => x.FlowOfFundsAmlTransactionId, request.SelectionIds)
            );

            var deleteResult = await selections.DeleteManyAsync(s, filter, cancellationToken: ct);

            var currentUser = context.User.Identity?.Name ?? "System";

            // Update case record ETag within transaction
            var update = Builders<CaseRecord>.Update
                .Inc(x => x.ETag, 1)
                .Set(x => x.LastUpdatedBy, currentUser)
                .Set(x => x.LastUpdated, DateTime.UtcNow);

            var options = new FindOneAndUpdateOptions<CaseRecord>
            {
                ReturnDocument = ReturnDocument.After
            };

            var updatedCase = await caseRecords.FindOneAndUpdateAsync(
                s, caseFilter, update, options, cancellationToken: ct);

            return new RemoveSelectionsResponse(
                CaseETag: updatedCase.ETag,
                Count: (int)deleteResult.DeletedCount,
                LastUpdated: updatedCase.LastUpdated!.Value
            );
        },
        cancellationToken: cancellationToken);

    // Handle validation failures outside transaction
    if (result == null)
    {
        var existingCase = await caseRecords
            .Find(Builders<CaseRecord>.Filter.Eq(x => x.CaseRecordId, caseRecordId))
            .FirstOrDefaultAsync(cancellationToken: cancellationToken);

        if (existingCase == null)
            return Results.NotFound(new { message = $"Case record not found: {caseRecordId}" });

        return Results.Conflict(new
        {
            message = "Case record has been modified by another user",
            currentETag = existingCase.ETag,
            requestedETag = request.CaseETag
        });
    }

    return Results.Ok(result);


});

api.MapPost("/caserecord/{caseRecordId}/selections/save", async (
    string caseRecordId,
    SaveChangesRequest request,
    IMongoDatabase database,
    HttpContext context) =>
{
    var selections = database.GetCollection<Selection>("selections");
    int requested = request.PendingChanges.Count;

    var currentUser = context.User.Identity?.Name ?? "System";

    // Build bulk write operations
    var bulkOps = request.PendingChanges.Select(pendingChange =>
    {
        var filter = Builders<Selection>.Filter.And(
           Builders<Selection>.Filter.Eq(
               x => x.FlowOfFundsAmlTransactionId,
               pendingChange.FlowOfFundsAmlTransactionId),
           Builders<Selection>.Filter.Eq(
               x => x.CaseRecordId,
               caseRecordId),
           Builders<Selection>.Filter.Eq(x => x.ETag, pendingChange.ETag)
       );

        // Add metadata each change log
        var enrichedChangeLogs = pendingChange.ChangeLogs.Select(changeLog =>
        {
            changeLog.UpdatedAt = DateTime.UtcNow;
            changeLog.UpdatedBy = currentUser;
            changeLog.ETag = pendingChange.ETag + 1;
            return changeLog;
        }).ToList();

        // Push all enriched change logs at once using $push with $each
        var update = Builders<Selection>.Update.Combine(
            Builders<Selection>.Update.PushEach("changeLogs", enrichedChangeLogs),
            Builders<Selection>.Update.Inc(x => x.ETag, 1)
        );

        return new UpdateOneModel<Selection>(filter, update);

    }).ToList();

    // Execute all updates in a single batch
    var options = new BulkWriteOptions { IsOrdered = false };
    var result = await selections.BulkWriteAsync(bulkOps, options);

    int succeeded = (int)result.ModifiedCount;

    // Return conflict if not all updates succeeded
    if (succeeded < requested)
    {
        return Results.Conflict(new SaveChangesResponse(
            Message: $"Partial save: {succeeded} of {requested} changes succeeded.",
            Requested: requested,
            Succeeded: succeeded,
            UpdatedBy: currentUser,
            UpdatedAt: DateTime.UtcNow
        ));
    }

    return Results.Ok(new SaveChangesResponse
    (
        Message: $"Successfully saved {succeeded} of {requested} changes",
        Requested: requested,
        Succeeded: succeeded,
        UpdatedBy: currentUser,
        UpdatedAt: DateTime.UtcNow
    ));
});

api.MapPost("/caserecord/{caseRecordId}/selections/reset", async (
    string caseRecordId,
    ResetSelectionsRequest request,
    IMongoDatabase database) =>
{
    var selections = database.GetCollection<Selection>("selections");
    int requested = request.PendingResets.Count;

    // Build bulk write operations
    var bulkOps = request.PendingResets.Select(pendingReset =>
    {
        var filter = Builders<Selection>.Filter.And(
            Builders<Selection>.Filter.Eq(x => x.CaseRecordId, caseRecordId),
            Builders<Selection>.Filter.Eq(
                x => x.FlowOfFundsAmlTransactionId,
                pendingReset.FlowOfFundsAmlTransactionId),
            Builders<Selection>.Filter.Eq(x => x.ETag, pendingReset.ETag)
        );

        var update = Builders<Selection>.Update.Combine(
            Builders<Selection>.Update.Set(x => x.ETag, 0),
            Builders<Selection>.Update.Set("changeLogs", new List<ChangeLogEntry>())
        );

        return new UpdateOneModel<Selection>(filter, update);
    }).ToList();

    // Execute all updates in a single batch
    var options = new BulkWriteOptions { IsOrdered = false };
    var result = await selections.BulkWriteAsync(bulkOps, options);

    int succeeded = (int)result.ModifiedCount;

    // Return conflict if not all resets succeeded
    if (succeeded < requested)
    {
        return Results.Conflict(new ResetSelectionsResponse(
            $"Partial reset: {succeeded} of {requested} selections reset.",
            requested,
            succeeded
        ));
    }

    return Results.Ok(new ResetSelectionsResponse
    (
        $"Successfully reset {succeeded} of {requested} selections",
        requested,
        succeeded
    ));
});

// Handle unmatched API routes with 404
app.Map("api/{**slug}", (string slug, HttpContext context) =>
{
    context.Response.StatusCode = StatusCodes.Status404NotFound;
    return Task.CompletedTask;
});

app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }