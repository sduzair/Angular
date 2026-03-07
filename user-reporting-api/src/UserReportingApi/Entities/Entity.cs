namespace UserReportingApi.Entities;

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using UserReportingApi.DTOs.Json;

public class Entity : HasExtraElements
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public ObjectId Id { get; set; }

    public string EntityIdentifier { get; set; } = null!;
    public string CaseRecordId { get; set; } = null!;

}
