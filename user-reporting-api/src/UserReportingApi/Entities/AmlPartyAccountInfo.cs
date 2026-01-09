using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace UserReportingApi.Entities;

public class AmlPartyAccountInfo
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;
    public string AmlId { get; set; } = null!;
    public List<PartyKeyModel> PartyKeys { get; set; } = [];
}

public class PartyKeyModel
{
    public string PartyKey { get; set; } = null!;
    public List<AccountModel> AccountModels { get; set; } = [];
}

public class AccountModel
{
    public string? AccountTransit { get; set; }
    public string AccountNumber { get; set; } = null!;
}