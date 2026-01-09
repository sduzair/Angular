using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace UserReportingApi.Entities;

public class AccountInfo
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;
    public string FiuNo { get; set; } = null!;
    public string Branch { get; set; } = null!;
    public string Account { get; set; } = null!;
    public string AccountType { get; set; } = null!;
    public string? AccountTypeOther { get; set; }
    public string AccountOpen { get; set; } = null!;
    public string AccountClose { get; set; } = null!;
    public string AccountStatus { get; set; } = null!;
    public string AccountCurrency { get; set; } = null!;
    public List<AccountHolder> AccountHolders { get; set; } = null!;
}

public class AccountHolder
{
    public string PartyKey { get; set; } = null!;
}