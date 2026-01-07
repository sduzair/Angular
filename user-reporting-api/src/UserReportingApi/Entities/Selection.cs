namespace UserReportingApi.Entities;

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using UserReportingApi.DTOs.Json;

public class Selection : HasExtraElements
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public ObjectId Id { get; set; }

    public string CaseRecordId { get; set; } = null!;

    public string FlowOfFundsAmlTransactionId { get; set; } = null!;

    public int? ETag { get; set; }
    public List<ChangeLogEntry>? ChangeLogs { get; set; } = [];
}

public class ChangeLogEntry : HasExtraElements
{
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; } = null!;
    public int? ETag { get; set; }
}