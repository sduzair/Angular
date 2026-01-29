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
using System.Text.Json.Serialization;

namespace UserReportingApi.IntegrationTests;

public class UsersSessionsTests
    : IClassFixture<CustomWebApplicationFactory>, IDisposable
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

    public void Dispose()
    {
        _testDb.Client.DropDatabase(_testDbName);
    }

    #region Transaction Search Tests

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

        // Act
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
        sources.Should().HaveCount(5); // FlowOfFunds, ABM, OLB, EMT, Wire

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

    #endregion

    #region Fetch Case Record Tests

    [Fact]
    public async Task FetchCaseRecord_ExistingAmlId_ReturnsCaseRecordWithETag()
    {
        // Arrange
        var caseRecord = new CaseRecord
        {
            CaseRecordId = Guid.NewGuid().ToString(),
            AmlId = "99999999",
            SearchParams = new SearchParams
            {
                PartyKeysSelection = ["123", "456"]
            },
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "TestUser",
            Status = "Active",
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

    #region Update Case Record Tests

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
            ETag = 0,
            LastUpdated = null
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var updateRequest = new UpdateCaseRecordRequest
        (
           new SearchParams { PartyKeysSelection = ["new"] },
           ETag: 0
        );

        // Act
        var response = await _client.PostAsJsonAsync($"/api/caserecord/{caseRecord.CaseRecordId}/update", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.ETag!.Tag.Should().Be("\"1\"");

        var result = await response.Content.ReadFromJsonAsync<CaseRecord>(TestOptions);
        result.Should().NotBeNull();
        result!.ETag.Should().Be(1);
        result.SearchParams.PartyKeysSelection.Should().ContainSingle().Which.Should().Be("new");
        result.LastUpdated.Should().NotBeNull();
        result.LastUpdated.Should().BeCloseTo(DateTime.UtcNow, TestConstants.DateTimeTolerance);
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
            ETag = 5,
            LastUpdated = DateTime.UtcNow
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var OUTDATED_ETAG = 3;
        var updateRequest = new UpdateCaseRecordRequest(SearchParams: new SearchParams(), ETag: OUTDATED_ETAG);

        // Act
        var response = await _client.PostAsJsonAsync($"/api/caserecord/{caseRecord.CaseRecordId}/update", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestOptions);
        error!["message"].ToString().Should().Contain("modified");
        ((JsonElement)error["currentETag"]).GetInt32().Should().Be(5);
    }

    #endregion

    #region Selections Tests

    [Fact]
    public async Task FetchSelections_ReturnsAllSelectionsForCaseRecord()
    {
        // Arrange
        var caseRecordId = Guid.NewGuid().ToString();
        var selections = new[]
        {
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-1",
                ETag = 0,
                ExtraElements = new Dictionary<string, object?> { ["amount"] = 100 }
            },
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-2",
                ETag = 2,
                ExtraElements = new Dictionary<string, object?> { ["amount"] = 200 }
            }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        // Act
        var response = await _client.GetAsync($"/api/caserecord/{caseRecordId}/selections");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<FetchSelectionsResponse>(TestOptions);
        result.Should().NotBeNull();
        result!.Selections.Should().HaveCount(2);
        result.Selections.Select(s => s.FlowOfFundsAmlTransactionId)
            .Should().BeEquivalentTo("txn-1", "txn-2");

        var s1 = result.Selections.Single(s => s.FlowOfFundsAmlTransactionId == "txn-1");
        var s2 = result.Selections.Single(s => s.FlowOfFundsAmlTransactionId == "txn-2");

        s1.ExtraElements.Should().NotBeNull();
        s1.ExtraElements!.Should().ContainKey("amount");
        s1.ExtraElements!["amount"]!.Should().Be(100);

        s2.ExtraElements.Should().NotBeNull();
        s2.ExtraElements!.Should().ContainKey("amount");
        s2.ExtraElements!["amount"]!.Should().Be(200);
    }

    [Fact]
    public async Task AddSelections_ValidCaseETag_InsertsAndIncrementsETag()
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
            ETag = 2
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var request = new AddSelectionsRequest
        (
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
            ]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/selections/add", request, TestOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<AddSelectionsResponse>(TestOptions);
        result.Should().NotBeNull();
        result!.CaseEtag.Should().Be(3);
        result.Count.Should().Be(2);

        var dbSelections = await _testDb.GetCollection<Selection>("selections")
            .Find(s => s.CaseRecordId == caseRecord.CaseRecordId)
            .ToListAsync();

        dbSelections.Should().HaveCount(2);
        dbSelections.All(s => s.ETag == 0).Should().BeTrue();
        dbSelections.All(s => s.CaseRecordId == caseRecord.CaseRecordId).Should().BeTrue();
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
            ETag = 5
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var request = new AddSelectionsRequest
        (
            CaseETag: 3, // Wrong ETag
            Selections: [new Selection { FlowOfFundsAmlTransactionId = "txn-1" }]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/selections/add", request, TestOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestOptions);
        error!["message"].ToString().Should().Contain("modified");
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
            ETag = 1
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var selections = new[]
        {
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-to-delete",
                ETag = 0
            },
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-to-keep",
                ETag = 0
            }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new RemoveSelectionsRequest
        (
            CaseETag: 1,
            SelectionIds: ["txn-to-delete"]
        );

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecordId}/selections/remove", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<RemoveSelectionsResponse>(TestOptions);
        result!.CaseEtag.Should().Be(2);
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
            ETag = 2
        };

        await _testDb.GetCollection<CaseRecord>("caseRecord").InsertOneAsync(caseRecord);

        var selections = new[] {
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-to-delete",
                ETag = 0
            },
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-to-keep",
                ETag = 0
            }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new RemoveSelectionsRequest
        (
            CaseETag: 1, // Wrong ETag
            SelectionIds: ["txn-to-delete"]
        );


        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/caserecord/{caseRecord.CaseRecordId}/selections/remove", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestOptions);
        error!["message"].ToString().Should().Contain("modified");
    }

    #endregion

    #region Save Changes Tests

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
                ETag = 0,
                ChangeLogs = []
            }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new SaveChangesRequest
        (
            PendingChanges:
            [
                new PendingChange
                (
                    FlowOfFundsAmlTransactionId: "txn-1",
                    ETag: 0,
                    ChangeLogs: [new ChangeLogEntry {ExtraElements = new Dictionary<string, object?>{["op"]= "remove", ["property"] = "amount" }}]
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
        updatedSelection.ChangeLogs[0].UpdatedBy.Should().Be("System");
        updatedSelection.ChangeLogs[0].ETag.Should().Be(1);
    }

    [Fact]
    public async Task SaveChanges_ETagMismatch_PartialSuccess()
    {
        // Arrange
        var caseRecordId = Guid.NewGuid().ToString();
        var selections = new[]
        {
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-1",
                ETag = 0
            },
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-2",
                    ETag = 5 // Different from what client expects
            }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new SaveChangesRequest
        (
            PendingChanges:
            [
                new PendingChange
                (
                    FlowOfFundsAmlTransactionId: "txn-1",
                    ETag:  0,
                    ChangeLogs: [new ChangeLogEntry{ExtraElements = new Dictionary<string, object?> {["field"] = "test"}}]
                ),
                new PendingChange
                (
                    FlowOfFundsAmlTransactionId: "txn-2",
                    ETag: 3, // Wrong ETag
                    ChangeLogs: [new ChangeLogEntry{ExtraElements = new Dictionary<string, object?> {["field"] = "test"}}]
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

    #endregion

    #region Reset Selections Tests

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
                ETag = 3,
                ChangeLogs =
                [
                    new ChangeLogEntry
                    {
                        UpdatedAt = DateTime.UtcNow,
                        UpdatedBy = "User1",
                        ETag = 2
                    }
                ]
            }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new ResetSelectionsRequest
        (
            PendingResets:
            [
                new PendingReset
                (
                    FlowOfFundsAmlTransactionId: "txn-1",
                    ETag: 3
                )
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
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-1",
                ETag = 2
            },
            new Selection
            {
                CaseRecordId = caseRecordId,
                FlowOfFundsAmlTransactionId = "txn-2",
                ETag = 5
            }
        };

        await _testDb.GetCollection<Selection>("selections").InsertManyAsync(selections);

        var request = new ResetSelectionsRequest
        (
            PendingResets:
            [
                new PendingReset ( FlowOfFundsAmlTransactionId: "txn-1", ETag: 2 ),
                new PendingReset ( FlowOfFundsAmlTransactionId: "txn-2", ETag: 3 ) // Wrong
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

        txn2.ETag.Should().Be(5); // Unchanged due to ETag mismatch
    }

    #endregion

    #region Account Info

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
            AccountHolders =
            [
                new AccountHolder { PartyKey = "PARTY001" }
            ]
        };

        await _testDb
            .GetCollection<AccountInfo>("accountInfo")
            .InsertOneAsync(doc);

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
        // Arrange
        var invalidAccount = "DOES_NOT_EXIST";

        // Act
        var response = await _client.GetAsync($"/api/aml/accountinfo/{invalidAccount}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");

        var payload = await response.Content.ReadFromJsonAsync<NotFoundMessage>(TestOptions);
        payload.Should().NotBeNull();
        payload!.Message.Should().Be($"Account info not found for Account no: {invalidAccount}");
    }

    #endregion

    private static JsonSerializerOptions CreateTestOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        JsonConfiguration.ConfigureJsonOptions(options);
        return options;
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

public record TransactionSourceResponse(
    string SourceId,
    string Status,
    List<Dictionary<string, object>> SourceData);

public record NotFoundMessage
{
    public string Message { get; set; } = null!;
}