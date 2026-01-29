namespace UserReportingApi.Entities;

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class PartyInfo
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    public string PartyKey { get; set; } = null!;

    public string Surname { get; set; } = null!;

    public string GivenName { get; set; } = null!;

    public string OtherOrInitial { get; set; } = null!;

    public string NameOfEntity { get; set; } = null!;
}
