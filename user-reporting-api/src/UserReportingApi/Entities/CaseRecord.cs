using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace UserReportingApi.Entities;

public class CaseRecord
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public ObjectId Id { get; set; }

    public string CaseRecordId { get; set; } = null!;

    public string AmlId { get; set; } = null!;

    public SearchParams SearchParams { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public string CreatedBy { get; set; } = null!;
    public string? LastUpdatedBy { get; set; } = null!;

    public string Status { get; set; } = null!;

    public int ETag { get; set; }

    public DateTime? LastUpdated { get; set; }
}

public class SearchParams
{
    public List<string> PartyKeysSelection { get; set; } = null!;

    public List<AccountNumber> AccountNumbersSelection { get; set; } = null!;

    public List<string> SourceSystemsSelection { get; set; } = null!;

    public List<string> ProductTypesSelection { get; set; } = null!;

    public List<ReviewPeriod> ReviewPeriodSelection { get; set; } = null!;
}

public class AccountNumber
{
    public string Transit { get; set; } = null!;

    public string Account { get; set; } = null!;

}

public class ReviewPeriod
{
    public string Start { get; set; } = null!;

    public string End { get; set; } = null!;
}