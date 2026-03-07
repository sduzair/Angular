using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Driver;

using UserReportingApi.DTOs;
using UserReportingApi.Entities;
using UserReportingApi.DTOs.Json;

namespace UserReportingApi.IntegrationTests;

public class UsersSessionsTests
    : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly IMongoDatabase _testDb;
    private readonly string _testDbName;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions TestOptions = CreateTestOptions();

    public UsersSessionsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();

        var config = factory.Services.GetRequiredService<IConfiguration>();
        var connectionString = config["MongoDB:ConnectionString"];
        Console.WriteLine(connectionString);
        _testDbName = config["MongoDB:DatabaseName"]!;
        Console.WriteLine(_testDbName);

        var client = new MongoClient(connectionString);
        _testDb = client.GetDatabase(_testDbName);
    }

    public async Task InitializeAsync()
    {
        // Create composite unique index on entity collection
        var entities = _testDb.GetCollection<Entity>("entity");

        var indexKeys = Builders<Entity>.IndexKeys
            .Ascending(p => p.EntityIdentifier)
            .Ascending(p => p.CaseRecordId);

        var indexOptions = new CreateIndexOptions { Unique = true };
        var indexModel = new CreateIndexModel<Entity>(indexKeys, indexOptions);

        await entities.Indexes.CreateOneAsync(indexModel);
    }

    public Task DisposeAsync()
    {
        _testDb.Client.DropDatabase(_testDbName);
        return Task.CompletedTask;
    }

    // -------------------------------------------------------------------------
    #region Transaction Search Tests
    // -------------------------------------------------------------------------

    [Fact]
    public async Task TransactionSearch_WithMultipleSources_ReturnsStreamedResults()
    {
        // Arrange
        await _testDb.GetCollection<BsonDocument>("flowOfFunds").InsertManyAsync(
        [
            new BsonDocument { ["flowOfFundsSource"] = "FOF", ["amount"] = 100 },
            new BsonDocument { ["flowOfFundsSource"] = "FOF", ["amount"] = 200 }
        ]);

        await _testDb.GetCollection<BsonDocument>("abm").InsertManyAsync(
        [
            new BsonDocument { ["source"] = "ABM", ["txnId"] = "abm-1" }
        ]);

        // Act — empty SourceSystemsSelection means all sources
        var response = await _client.PostAsJsonAsync("/api/transaction/search", new TransactionSearchRequest(
            PartyKeysSelection: [],
            AccountNumbersSelection: [],
            ProductTypesSelection: [],
            ReviewPeriodSelection: [],
            SourceSystemsSelection: []));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");

        var content = await response.Content.ReadAsStringAsync();
        var sources = JsonSerializer.Deserialize<List<TransactionSourceResponse>>(content, JsonSerializerOptions.Web);

        sources.Should().NotBeNull();

        var fofSource = sources!.First(s => s.SourceId == "FlowOfFunds");
        fofSource.Status.Should().Be("completed");
        fofSource.SourceData.Should().HaveCount(2);
        fofSource.SourceData[0].Should().ContainKey("_mongoid");

        var abmSource = sources!.First(s => s.SourceId == "ABM");
        abmSource.SourceData.Should().HaveCount(1);
    }

    [Fact]
    public async Task TransactionSearch_EmptyCollections_ReturnsEmptySourceData()
    {
        // Act
        var response = await _client.PostAsJsonAsync("/api/transaction/search", new TransactionSearchRequest(
            PartyKeysSelection: [],
            AccountNumbersSelection: [],
            ProductTypesSelection: [],
            ReviewPeriodSelection: [],
            SourceSystemsSelection: []));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var sources = JsonSerializer.Deserialize<List<TransactionSourceResponse>>(content, JsonSerializerOptions.Web);

        sources.Should().NotBeNull();
        sources!.All(s => s.SourceData.Count == 0).Should().BeTrue();
        sources!.All(s => s.Status == "completed").Should().BeTrue();
    }

    /// <summary>
    /// When SourceSystemsSelection is populated, only the requested sources are streamed.
    /// </summary>
    [Fact]
    public async Task TransactionSearch_WithSourceSystemsSelection_FiltersToSelectedSources()
    {
        // Arrange
        await _testDb.GetCollection<BsonDocument>("flowOfFunds").InsertManyAsync(
        [
            new BsonDocument { ["flowOfFundsSource"] = "FOF", ["amount"] = 500 }
        ]);

        await _testDb.GetCollection<BsonDocument>("abm").InsertManyAsync(
        [
            new BsonDocument { ["source"] = "ABM", ["txnId"] = "abm-filtered" }
        ]);

        // Act — request only FlowOfFunds
        var response = await _client.PostAsJsonAsync("/api/transaction/search", new TransactionSearchRequest(
            PartyKeysSelection: [],
            AccountNumbersSelection: [],
            ProductTypesSelection: [],
            ReviewPeriodSelection: [],
            SourceSystemsSelection: ["FlowOfFunds"]));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var sources = JsonSerializer.Deserialize<List<TransactionSourceResponse>>(content, JsonSerializerOptions.Web);

        sources.Should().NotBeNull();
        sources.Should().HaveCount(1, "only the requested source should be streamed");
        sources![0].SourceId.Should().Be("FlowOfFunds");
    }

    /// <summary>
    /// SourceSystemsSelection matching is case-insensitive.
    /// </summary>
    [Fact]
    public async Task TransactionSearch_SourceSystemsSelection_IsCaseInsensitive()
    {
        // Arrange
        await _testDb.GetCollection<BsonDocument>("abm").InsertManyAsync(
        [
            new BsonDocument { ["source"] = "ABM", ["txnId"] = "abm-ci" }
        ]);

        // Act — use lowercase "abm" to match source id "ABM"
        var response = await _client.PostAsJsonAsync("/api/transaction/search", new TransactionSearchRequest(
            PartyKeysSelection: [],
            AccountNumbersSelection: [],
            ProductTypesSelection: [],
            ReviewPeriodSelection: [],
            SourceSystemsSelection: ["abm"]));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var sources = JsonSerializer.Deserialize<List<TransactionSourceResponse>>(content, JsonSerializerOptions.Web);

        sources.Should().HaveCount(1);
        sources![0].SourceId.Should().Be("ABM");
    }

    #endregion

    // -------------------------------------------------------------------------
    #region Fetch Case Record Tests
    // -------------------------------------------------------------------------

    [Fact]
    public async Task FetchCaseRecord_ExistingAmlId_ReturnsCaseRecordWithETag()
    {
        // Arrange
        var caseRecord = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "99999999",
            SearchParams = new SearchParams { PartyKeysSelection = ["123", "456"] },
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "TestUser",
            Status = "Active",
            IsClosed = false,   // explicit for clarity
            ETag = 5,
            LastUpdated = DateTime.UtcNow
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        // Act
        var response = await _client.GetAsync($"/api/aml/{caseRecord.AmlId}/caserecord");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.ETag!.Tag.Should().Be("\"5\"");

        var result = await response.Content.ReadFromJsonAsync<CaseRecord>(TestOptions);
        result.Should().NotBeNull();
        result!.CaseRecordId.Should().Be(caseRecord.CaseRecordId);
        result.AmlId.Should().Be(caseRecord.AmlId);
        result.ETag.Should().Be(5);
    }

    [Fact]
    public async Task FetchCaseRecord_NonExistentAmlId_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/aml/nonexistent/caserecord");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestOptions);
        error.Should().ContainKey("message");
        error!["message"].ToString().Should().Contain("not found");
    }

    #endregion

    // -------------------------------------------------------------------------
    #region Update Case Record Tests
    // -------------------------------------------------------------------------

    [Fact]
    public async Task UpdateCaseRecord_ValidETag_UpdatesAndIncrementsVersion()
    {
        // Arrange
        var caseRecord = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "12345678",
            SearchParams = new SearchParams { PartyKeysSelection = ["old"] },
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Active",
            IsClosed = false,
            ETag = 0,
            LastUpdated = null
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var updateRequest = new UpdateCaseRecordRequest(
            new SearchParams { PartyKeysSelection = ["new"] },
            ETag: 0);

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/update", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.ETag!.Tag.Should().Be("\"1\"");

        var result = await response.Content.ReadFromJsonAsync<CaseRecord>(TestOptions);
        result.Should().NotBeNull();
        result!.ETag.Should().Be(1);
        result.SearchParams.PartyKeysSelection.Should().ContainSingle().Which.Should().Be("new");
        result.LastUpdated.Should().NotBeNull();
        result.LastUpdated.Should().BeCloseTo(DateTime.UtcNow, TestConstants.DateTimeTolerance);

        // SearchParamsHash must be populated after update
        result.SearchParamsHash.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task UpdateCaseRecord_ETagMismatch_ReturnsConflict()
    {
        // Arrange
        var caseRecord = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "11111111",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Active",
            IsClosed = false,
            ETag = 5,
            LastUpdated = DateTime.UtcNow
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var updateRequest = new UpdateCaseRecordRequest(SearchParams: new SearchParams(), ETag: 3);

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/update", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestOptions);
        error!["message"].ToString().Should().Contain("modified");
        ((JsonElement)error["currentETag"]).GetInt32().Should().Be(5);
    }

    /// <summary>
    /// CaseRecordGuard.ActiveWithETag now includes IsClosed == false.
    /// A closed case record must return a distinct "closed" conflict message.
    /// </summary>
    [Fact]
    public async Task UpdateCaseRecord_ClosedRecord_ReturnsConflict_WithClosedMessage()
    {
        // Arrange
        var caseRecord = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "44444444",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Closed",
            IsClosed = true,
            ClosedAt = DateTime.UtcNow,
            ClosedBy = "User1",
            ETag = 2,
            LastUpdated = DateTime.UtcNow
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var updateRequest = new UpdateCaseRecordRequest(SearchParams: new SearchParams(), ETag: 2);

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/update", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestOptions);
        error!["message"].ToString().Should().Contain("closed");
        error.Should().ContainKey("closedAt");
        error.Should().ContainKey("closedBy");
    }

    #endregion

    // -------------------------------------------------------------------------
    #region Close / Activate Case Record Tests
    // -------------------------------------------------------------------------

    [Fact]
    public async Task CloseCaseRecord_ValidETag_ClosesRecordAndPropagatesIsClosedToSelections()
    {
        // Arrange
        var caseRecordId = Guid.NewGuid().ToString();
        var caseRecord = new CaseRecord
        {
            CaseRecordId = caseRecordId,
            AmlId = "CLOSE-001",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Active",
            IsClosed = false,
            ETag = 1,
            LastUpdated = DateTime.UtcNow
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var selections = new[]
        {
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-close-1", IsClosed = false, ETag = 0 },
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-close-2", IsClosed = false, ETag = 0 }
        };
        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new CloseCaseRecordRequest(ETag: 1);

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecordId}/close", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.ETag!.Tag.Should().Be("\"2\"");

        var result = await response.Content.ReadFromJsonAsync<CaseRecord>(TestOptions);
        result.Should().NotBeNull();
        result!.IsClosed.Should().BeTrue();
        result.Status.Should().Be("Closed");
        result.ETag.Should().Be(2);
        result.ClosedAt.Should().NotBeNull();
        result.ClosedBy.Should().NotBeNullOrEmpty();

        // Verify all selections are propagated as closed
        var dbSelections = await _testDb.GetCollection<Selection>("selections")
            .Find(s => s.CaseRecordId == caseRecordId)
            .ToListAsync();

        dbSelections.Should().HaveCount(2);
        dbSelections.All(s => s.IsClosed).Should().BeTrue();
    }

    [Fact]
    public async Task CloseCaseRecord_ETagMismatch_ReturnsConflict()
    {
        // Arrange
        var caseRecord = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "CLOSE-002",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Active",
            IsClosed = false,
            ETag = 3,
            LastUpdated = DateTime.UtcNow
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var request = new CloseCaseRecordRequest(ETag: 1); // wrong ETag

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/close", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestOptions);
        error!["message"].ToString().Should().Contain("modified");
        ((JsonElement)error["currentETag"]).GetInt32().Should().Be(3);
    }

    [Fact]
    public async Task CloseCaseRecord_AlreadyClosed_ReturnsConflict_WithClosedMessage()
    {
        // Arrange — record is already closed
        var caseRecord = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "CLOSE-003",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Closed",
            IsClosed = true,
            ClosedAt = DateTime.UtcNow,
            ClosedBy = "User1",
            ETag = 2,
            LastUpdated = DateTime.UtcNow
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var request = new CloseCaseRecordRequest(ETag: 2);

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/close", request);

        // Assert — ActiveWithETag requires IsClosed==false, so filter misses; ResolveFailureAsync
        //          detects IsClosed==true and returns the "closed" conflict variant
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestOptions);
        error!["message"].ToString().Should().Contain("closed");
        error.Should().ContainKey("closedAt");
        error.Should().ContainKey("closedBy");
    }

    [Fact]
    public async Task ActivateCaseRecord_ValidETag_ActivatesRecordAndPropagatesIsClosedToSelections()
    {
        // Arrange
        var caseRecordId = Guid.NewGuid().ToString();
        var caseRecord = new CaseRecord
        {
            CaseRecordId = caseRecordId,
            AmlId = "ACTIVATE-001",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Closed",
            IsClosed = true,
            ClosedAt = DateTime.UtcNow,
            ClosedBy = "User1",
            ETag = 2,
            LastUpdated = DateTime.UtcNow
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var selections = new[]
        {
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-act-1", IsClosed = true, ETag = 0 },
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-act-2", IsClosed = true, ETag = 0 }
        };
        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new ActivateCaseRecordRequest(ETag: 2);

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecordId}/activate", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.ETag!.Tag.Should().Be("\"3\"");

        var result = await response.Content.ReadFromJsonAsync<CaseRecord>(TestOptions);
        result.Should().NotBeNull();
        result!.IsClosed.Should().BeFalse();
        result.Status.Should().Be("Active");
        result.ETag.Should().Be(3);
        result.ClosedAt.Should().BeNull();
        result.ClosedBy.Should().BeNull();

        // Verify all selections are propagated as active
        var dbSelections = await _testDb.GetCollection<Selection>("selections")
            .Find(s => s.CaseRecordId == caseRecordId)
            .ToListAsync();

        dbSelections.Should().HaveCount(2);
        dbSelections.All(s => !s.IsClosed).Should().BeTrue();
    }

    [Fact]
    public async Task ActivateCaseRecord_ETagMismatch_ReturnsConflict()
    {
        // Arrange
        var caseRecord = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "ACTIVATE-002",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Closed",
            IsClosed = true,
            ClosedAt = DateTime.UtcNow,
            ClosedBy = "User1",
            ETag = 4,
            LastUpdated = DateTime.UtcNow
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var request = new ActivateCaseRecordRequest(ETag: 1); // wrong ETag

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/activate", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestOptions);
        // IsClosed==true, so ResolveFailureAsync returns the "closed" variant
        error!["message"].ToString().Should().Contain("closed");
    }

    #endregion

    // -------------------------------------------------------------------------
    #region Selections and Entities Tests
    // -------------------------------------------------------------------------

    [Fact]
    public async Task FetchSelections_ReturnsAllSelectionsAndEntitiesForCaseRecord()
    {
        // Arrange
        var caseRecordId = Guid.NewGuid().ToString();
        var selections = new[]
        {
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-1",
                IsClosed = false,
                ETag = 0,
                ExtraElements = new Dictionary<string, object?> { ["amount"] = 100 }
            },
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-2",
                IsClosed = false,
                ETag = 2,
                ExtraElements = new Dictionary<string, object?> { ["amount"] = 200 }
            }
        };

        var entities = new[]
        {
            new Entity { CaseRecordId = caseRecordId, EntityIdentifier = "ENTITY-001" },
            new Entity { CaseRecordId = caseRecordId, EntityIdentifier = "ENTITY-002" }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);
        await _testDb.GetCollection<Entity>("entity").InsertManyAsync(entities);

        // Act
        var response = await _client.GetAsync($"/api/caserecord/{caseRecordId}/selections");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<FetchSelectionsResponse>(TestOptions);
        result.Should().NotBeNull();

        result!.SelectionList.Should().HaveCount(2);
        result.SelectionList.Select(s => s.FlowOfFundsAmlTransactionId)
            .Should().BeEquivalentTo("txn-1", "txn-2");

        var s1 = result.SelectionList.Single(s => s.FlowOfFundsAmlTransactionId == "txn-1");
        s1.ExtraElements.Should().ContainKey("amount");
        s1.ExtraElements!["amount"]!.Should().Be(100);

        var s2 = result.SelectionList.Single(s => s.FlowOfFundsAmlTransactionId == "txn-2");
        s2.ExtraElements!["amount"]!.Should().Be(200);

        result.EntityList.Should().HaveCount(2);
        result.EntityList.Select(p => p.EntityIdentifier)
            .Should().BeEquivalentTo("ENTITY-001", "ENTITY-002");
        result.EntityList.All(p => p.CaseRecordId == caseRecordId).Should().BeTrue();
    }

    [Fact]
    public async Task FetchSelections_EmptyCaseRecord_ReturnsEmptyLists()
    {
        var caseRecordId = Guid.NewGuid().ToString();

        var response = await _client.GetAsync($"/api/caserecord/{caseRecordId}/selections");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<FetchSelectionsResponse>(TestOptions);
        result.Should().NotBeNull();
        result!.SelectionList.Should().BeEmpty();
        result.EntityList.Should().BeEmpty();
    }

    [Fact]
    public async Task AddSelections_ValidCaseETag_InsertsSelectionsAndEntitiesAndIncrementsETag()
    {
        // Arrange
        var caseRecord = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "77777777",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Active",
            IsClosed = false,
            ETag = 2
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var request = new AddSelectionsRequest(
            CaseETag: 2,
            Selections:
            [
                new Selection
                {
                    FlowOfFundsAmlTransactionId = "new-txn-1",
                    ExtraElements = new Dictionary<string, object?> { ["data"] = "value1" }
                },
                new Selection
                {
                    FlowOfFundsAmlTransactionId = "new-txn-2",
                    ExtraElements = new Dictionary<string, object?> { ["data"] = "value2" }
                }
            ],
            Entities:
            [
                new Entity { EntityIdentifier = "ENTITY-NEW-001" },
                new Entity { EntityIdentifier = "ENTITY-NEW-002" }
            ]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/selections/add", request, TestOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<AddSelectionsResponse>(TestOptions);
        result.Should().NotBeNull();
        result!.CaseETag.Should().Be(3);
        result.SelectionCount.Should().Be(2);
        result.EntityCount.Should().Be(2);
        result.LastUpdated.Should().BeCloseTo(DateTime.UtcNow, TestConstants.DateTimeTolerance);

        // Verify selections in DB — including the denormalized IsClosed = false stamp
        var dbSelections = await _testDb.GetCollection<Selection>("selections")
            .Find(s => s.CaseRecordId == caseRecord.CaseRecordId)
            .ToListAsync();

        dbSelections.Should().HaveCount(2);
        dbSelections.All(s => s.ETag == 0).Should().BeTrue();
        dbSelections.All(s => s.CaseRecordId == caseRecord.CaseRecordId).Should().BeTrue();
        dbSelections.All(s => !s.IsClosed).Should().BeTrue("IsClosed must be stamped false on insert");

        // Verify entities in DB
        var dbEntities = await _testDb.GetCollection<Entity>("entity")
            .Find(p => p.CaseRecordId == caseRecord.CaseRecordId)
            .ToListAsync();

        dbEntities.Should().HaveCount(2);
        dbEntities.Select(p => p.EntityIdentifier)
            .Should().BeEquivalentTo("ENTITY-NEW-001", "ENTITY-NEW-002");
    }

    [Fact]
    public async Task AddSelections_CaseETagMismatch_ReturnsConflict()
    {
        // Arrange
        var caseRecord = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "88888888",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Active",
            IsClosed = false,
            ETag = 5
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var request = new AddSelectionsRequest(
            CaseETag: 3, // wrong ETag
            Selections: [new Selection { FlowOfFundsAmlTransactionId = "txn-1" }],
            Entities: [new Entity { EntityIdentifier = "ENTITY-001" }]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/selections/add", request, TestOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestOptions);
        error!["message"].ToString().Should().Contain("modified");
    }

    /// <summary>
    /// AddSelections on a closed case must return the "closed" conflict variant.
    /// </summary>
    [Fact]
    public async Task AddSelections_ClosedCase_ReturnsConflict_WithClosedMessage()
    {
        // Arrange
        var caseRecord = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "CLOSED-ADD",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Closed",
            IsClosed = true,
            ClosedAt = DateTime.UtcNow,
            ClosedBy = "User1",
            ETag = 2
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var request = new AddSelectionsRequest(
            CaseETag: 2,
            Selections: [new Selection { FlowOfFundsAmlTransactionId = "txn-1" }],
            Entities: []
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/selections/add", request, TestOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestOptions);
        error!["message"].ToString().Should().Contain("closed");
    }

    [Fact]
    public async Task RemoveSelections_DeletesSelectionsAndIncrementsETag()
    {
        // Arrange
        var caseRecordId = Guid.NewGuid().ToString();
        var caseRecord = new CaseRecord
        {
            CaseRecordId = caseRecordId,
            AmlId = "55555555",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Active",
            IsClosed = false,
            ETag = 1
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var selections = new[]
        {
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-to-delete", IsClosed = false, ETag = 0 },
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-to-keep",   IsClosed = false, ETag = 0 }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new RemoveSelectionsRequest(CaseETag: 1, SelectionIds: ["txn-to-delete"]);

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecordId}/selections/remove", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<RemoveSelectionsResponse>(TestOptions);
        result!.CaseETag.Should().Be(2);
        result.Count.Should().Be(1);

        var remaining = await _testDb.GetCollection<Selection>("selections")
            .Find(s => s.CaseRecordId == caseRecordId)
            .ToListAsync();

        remaining.Should().ContainSingle()
            .Which.FlowOfFundsAmlTransactionId.Should().Be("txn-to-keep");
    }

    [Fact]
    public async Task RemoveSelections_CaseETagMismatch_ReturnsConflict()
    {
        // Arrange
        var caseRecordId = Guid.NewGuid().ToString();
        var caseRecord = new CaseRecord
        {
            CaseRecordId = caseRecordId,
            AmlId = "55555555",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Active",
            IsClosed = false,
            ETag = 2
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var selections = new[]
        {
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-to-delete", IsClosed = false, ETag = 0 },
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-to-keep",   IsClosed = false, ETag = 0 }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new RemoveSelectionsRequest(CaseETag: 1, SelectionIds: ["txn-to-delete"]);

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/selections/remove", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestOptions);
        error!["message"].ToString().Should().Contain("modified");
    }

    [Fact]
    public async Task AddSelections_DuplicateEntityIdentifier_ReturnsErrorAndRollsBackTransaction()
    {
        // Arrange
        var caseRecord = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "11111111",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Active",
            IsClosed = false,
            ETag = 0
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var existingEntity = new Entity
        {
            CaseRecordId = caseRecord.CaseRecordId,
            EntityIdentifier = "DUPLICATE-ENTITY-001"
        };
        await _testDb.GetCollection<Entity>("entity").InsertOneAsync(existingEntity);

        var request = new AddSelectionsRequest(
            CaseETag: 0,
            Selections:
            [
                new Selection
                {
                    FlowOfFundsAmlTransactionId = "txn-should-rollback",
                    ExtraElements = new Dictionary<string, object?> { ["data"] = "test" }
                }
            ],
            Entities:
            [
                new Entity { EntityIdentifier = "DUPLICATE-ENTITY-001" } // duplicate!
            ]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/selections/add", request, TestOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);

        var dbSelections = await _testDb.GetCollection<Selection>("selections")
            .Find(s => s.CaseRecordId == caseRecord.CaseRecordId)
            .ToListAsync();
        dbSelections.Should().BeEmpty("transaction should have rolled back");

        var dbEntities = await _testDb.GetCollection<Entity>("entity")
            .Find(p => p.CaseRecordId == caseRecord.CaseRecordId)
            .ToListAsync();
        dbEntities.Should().ContainSingle("only the original entity should exist");
        dbEntities[0].Id.Should().Be(existingEntity.Id);

        var dbCaseRecord = await _testDb.GetCollection<CaseRecord>("caseRecord")
            .Find(c => c.CaseRecordId == caseRecord.CaseRecordId)
            .FirstOrDefaultAsync();
        dbCaseRecord.ETag.Should().Be(0, "ETag should not increment on failed transaction");
    }

    [Fact]
    public async Task AddSelections_DuplicateEntityInDifferentCase_Succeeds()
    {
        // Arrange
        var caseRecord1 = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "22222222",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Active",
            IsClosed = false,
            ETag = 0
        };

        var caseRecord2 = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "33333333",
            SearchParams = new SearchParams(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "User1",
            Status = "Active",
            IsClosed = false,
            ETag = 0
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertManyAsync([caseRecord1, caseRecord2]);

        var entity1 = new Entity
        {
            CaseRecordId = caseRecord1.CaseRecordId,
            EntityIdentifier = "SHARED-ENTITY-001"
        };
        await _testDb.GetCollection<Entity>("entity").InsertOneAsync(entity1);

        var request = new AddSelectionsRequest(
            CaseETag: 0,
            Selections: [],
            Entities:
            [
                new Entity { EntityIdentifier = "SHARED-ENTITY-001" } // same identifier, different case
            ]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord2.CaseRecordId}/selections/add", request, TestOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "same EntityIdentifier should be allowed in different case records");

        var result = await response.Content.ReadFromJsonAsync<AddSelectionsResponse>(TestOptions);
        result!.EntityCount.Should().Be(1);

        var allEntities = await _testDb.GetCollection<Entity>("entity")
            .Find(p => p.EntityIdentifier == "SHARED-ENTITY-001")
            .ToListAsync();

        allEntities.Should().HaveCount(2, "same entity identifier should exist in two different cases");
        allEntities.Select(p => p.CaseRecordId)
            .Should().BeEquivalentTo([caseRecord1.CaseRecordId, caseRecord2.CaseRecordId]);
    }

    #endregion

    // -------------------------------------------------------------------------
    #region Save Changes Tests
    // -------------------------------------------------------------------------

    [Fact]
    public async Task SaveChanges_ValidETags_AppendsChangeLogsAndIncrementsETags()
    {
        // Arrange
        var caseRecordId = Guid.NewGuid().ToString();
        var selections = new[]
        {
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-1",
                IsClosed = false,
                ETag = 0,
                ChangeLogs = []
            }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new SaveChangesRequest(
            PendingChanges:
            [
                new PendingChange(
                    FlowOfFundsAmlTransactionId: "txn-1",
                    ETag: 0,
                    ChangeLogs: [new ChangeLogEntry { ExtraElements = new Dictionary<string, object?> { ["op"] = "remove", ["property"] = "amount" } }]
                )
            ]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecordId}/selections/save", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<SaveChangesResponse>(TestOptions);
        result!.Succeeded.Should().Be(1);
        result.Requested.Should().Be(1);

        var updatedSelection = await _testDb.GetCollection<Selection>("selections")
            .Find(s => s.FlowOfFundsAmlTransactionId == "txn-1")
            .FirstOrDefaultAsync();

        updatedSelection.ETag.Should().Be(1);
        updatedSelection.ChangeLogs.Should().HaveCount(1);
        updatedSelection.ChangeLogs![0].UpdatedAt.Should()
            .BeCloseTo(DateTime.UtcNow, TestConstants.DateTimeTolerance);
        updatedSelection.ChangeLogs[0].UpdatedBy.Should().Be("TestUser");
        updatedSelection.ChangeLogs[0].ETag.Should().Be(1);
    }

    [Fact]
    public async Task SaveChanges_ETagMismatch_PartialSuccess()
    {
        // Arrange
        var caseRecordId = Guid.NewGuid().ToString();
        var selections = new[]
        {
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-1", IsClosed = false, ETag = 0 },
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-2", IsClosed = false, ETag = 5 }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new SaveChangesRequest(
            PendingChanges:
            [
                new PendingChange(
                    FlowOfFundsAmlTransactionId: "txn-1",
                    ETag: 0,
                    ChangeLogs: [new ChangeLogEntry { ExtraElements = new Dictionary<string, object?> { ["field"] = "test" } }]
                ),
                new PendingChange(
                    FlowOfFundsAmlTransactionId: "txn-2",
                    ETag: 3, // wrong ETag
                    ChangeLogs: [new ChangeLogEntry { ExtraElements = new Dictionary<string, object?> { ["field"] = "test" } }]
                )
            ]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecordId}/selections/save", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var result = await response.Content.ReadFromJsonAsync<SaveChangesResponse>(TestOptions);
        result!.Succeeded.Should().Be(1);
        result.Requested.Should().Be(2);
        result.Message.Should().Contain("1 of 2");
    }

    /// <summary>
    /// The IsClosed == false guard on selections/save means closed selections are skipped.
    /// </summary>
    [Fact]
    public async Task SaveChanges_ClosedSelection_IsNotUpdated()
    {
        // Arrange — one open, one closed with matching ETags
        var caseRecordId = Guid.NewGuid().ToString();
        var selections = new[]
        {
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-open",   IsClosed = false, ETag = 0 },
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-closed", IsClosed = true,  ETag = 0 }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new SaveChangesRequest(
            PendingChanges:
            [
                new PendingChange(
                    FlowOfFundsAmlTransactionId: "txn-open",
                    ETag: 0,
                    ChangeLogs: [new ChangeLogEntry { ExtraElements = new Dictionary<string, object?> { ["op"] = "update" } }]
                ),
                new PendingChange(
                    FlowOfFundsAmlTransactionId: "txn-closed",
                    ETag: 0, // correct ETag, but selection is closed
                    ChangeLogs: [new ChangeLogEntry { ExtraElements = new Dictionary<string, object?> { ["op"] = "update" } }]
                )
            ]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecordId}/selections/save", request);

        // Assert — partial: only the open selection matched
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var result = await response.Content.ReadFromJsonAsync<SaveChangesResponse>(TestOptions);
        result!.Succeeded.Should().Be(1);
        result.Requested.Should().Be(2);

        var closedSelection = await _testDb.GetCollection<Selection>("selections")
            .Find(s => s.FlowOfFundsAmlTransactionId == "txn-closed")
            .FirstOrDefaultAsync();

        closedSelection.ETag.Should().Be(0, "closed selection must not be modified");
        closedSelection.ChangeLogs.Should().BeNullOrEmpty();
    }

    #endregion

    // -------------------------------------------------------------------------
    #region Reset Selections Tests
    // -------------------------------------------------------------------------

    [Fact]
    public async Task ResetSelections_ValidETags_ResetsToZeroAndClearsChangeLogs()
    {
        // Arrange
        var caseRecordId = Guid.NewGuid().ToString();
        var selections = new[]
        {
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-1",
                IsClosed = false,
                ETag = 3,
                ChangeLogs =
                [
                    new ChangeLogEntry { UpdatedAt = DateTime.UtcNow, UpdatedBy = "User1", ETag = 2 }
                ]
            }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new ResetSelectionsRequest(
            PendingResets:
            [
                new PendingReset(FlowOfFundsAmlTransactionId: "txn-1", ETag: 3)
            ]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecordId}/selections/reset", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ResetSelectionsResponse>(TestOptions);
        result!.Succeeded.Should().Be(1);
        result.Requested.Should().Be(1);

        var resetSelection = await _testDb.GetCollection<Selection>("selections")
            .Find(s => s.FlowOfFundsAmlTransactionId == "txn-1")
            .FirstOrDefaultAsync();

        resetSelection.ETag.Should().Be(0);
        resetSelection.ChangeLogs.Should().BeEmpty();
    }

    [Fact]
    public async Task ResetSelections_ETagMismatch_PartialSuccess()
    {
        // Arrange
        var caseRecordId = Guid.NewGuid().ToString();
        var selections = new[]
        {
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-1", IsClosed = false, ETag = 2 },
            new Selection { CaseRecordId = caseRecordId, FlowOfFundsAmlTransactionId = "txn-2", IsClosed = false, ETag = 5 }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new ResetSelectionsRequest(
            PendingResets:
            [
                new PendingReset(FlowOfFundsAmlTransactionId: "txn-1", ETag: 2),
                new PendingReset(FlowOfFundsAmlTransactionId: "txn-2", ETag: 3) // wrong
            ]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecordId}/selections/reset", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var result = await response.Content.ReadFromJsonAsync<ResetSelectionsResponse>(TestOptions);
        result!.Succeeded.Should().Be(1);
        result.Requested.Should().Be(2);

        var txn2 = await _testDb.GetCollection<Selection>("selections")
            .Find(s => s.FlowOfFundsAmlTransactionId == "txn-2")
            .FirstOrDefaultAsync();

        txn2.ETag.Should().Be(5, "unchanged due to ETag mismatch");
    }

    /// <summary>
    /// The IsClosed == false guard on selections/reset means closed selections are skipped.
    /// </summary>
    [Fact]
    public async Task ResetSelections_ClosedSelection_IsNotReset()
    {
        // Arrange
        var caseRecordId = Guid.NewGuid().ToString();
        var selections = new[]
        {
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-closed-reset",
                IsClosed = true,
                ETag = 4,
                ChangeLogs = [new ChangeLogEntry { UpdatedAt = DateTime.UtcNow, UpdatedBy = "User1", ETag = 3 }]
            }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new ResetSelectionsRequest(
            PendingResets:
            [
                new PendingReset(FlowOfFundsAmlTransactionId: "txn-closed-reset", ETag: 4)
            ]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecordId}/selections/reset", request);

        // Assert — IsClosed guard blocks the update → 0 succeeded → Conflict
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var result = await response.Content.ReadFromJsonAsync<ResetSelectionsResponse>(TestOptions);
        result!.Succeeded.Should().Be(0);
        result.Requested.Should().Be(1);

        var closedSelection = await _testDb.GetCollection<Selection>("selections")
            .Find(s => s.FlowOfFundsAmlTransactionId == "txn-closed-reset")
            .FirstOrDefaultAsync();

        closedSelection.ETag.Should().Be(4, "closed selection must not be reset");
        closedSelection.ChangeLogs.Should().HaveCount(1, "change logs must not be cleared");
    }

    #endregion

    // -------------------------------------------------------------------------
    #region Account Info Tests
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetAccountInfo_ExistingAccount_ReturnsOk_WithAccountInfo()
    {
        // Arrange
        var doc = new AccountInfo
        {
            Id = "507f1f77bcf86cd799439011",
            FiuNo = "FIU001",
            Branch = "Main Branch",
            Account = "ACC123456",
            AccountType = "Checking",
            AccountTypeOther = null,
            AccountOpen = "2024-01-01",
            AccountClose = "2026-12-31",
            AccountStatus = "Active",
            AccountCurrency = "CAD",
            AccountHolders = [new AccountHolder { PartyKey = "PARTY001" }]
        };

        await _testDb.GetCollection<AccountInfo>("accountInfo").InsertOneAsync(doc);

        // Act
        var response = await _client.GetAsync($"/api/aml/accountinfo/{doc.Account}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");

        var result = await response.Content.ReadFromJsonAsync<AccountInfo>(TestOptions);
        result.Should().NotBeNull();
        result!.Account.Should().Be(doc.Account);
        result.FiuNo.Should().Be(doc.FiuNo);
        result.AccountHolders.Should().HaveCount(1);
        result.AccountHolders[0].PartyKey.Should().Be("PARTY001");
    }

    [Fact]
    public async Task GetAccountInfo_InvalidAccount_ReturnsNotFound_WithMessage()
    {
        var invalidAccount = "DOES_NOT_EXIST";

        var response = await _client.GetAsync($"/api/aml/accountinfo/{invalidAccount}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");

        var payload = await response.Content.ReadFromJsonAsync<NotFoundMessage>(TestOptions);
        payload.Should().NotBeNull();
        payload!.Message.Should().Be($"Account info not found for Account no: {invalidAccount}");
    }

    #endregion

    // -------------------------------------------------------------------------
    #region Helpers
    // -------------------------------------------------------------------------

    private static JsonSerializerOptions CreateTestOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        JsonConfiguration.ConfigureJsonOptions(options);
        return options;
    }

    #endregion
}

public class TestConstants
{
    public static readonly TimeSpan DateTimeTolerance =
#if DEBUG
        TimeSpan.FromSeconds(600);
#else
        TimeSpan.FromSeconds(1);
#endif
}

public record TransactionSourceResponse(
    string SourceId,
    string Status,
    List<Dictionary<string, object>> SourceData);

public record NotFoundMessage
{
    public string Message { get; set; } = null!;
}
