using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace UserReportingApi.Entities;

public class FormOptions
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    public Dictionary<string, string> MethodOfTxn { get; set; } = new();
    public Dictionary<string, string> TypeOfFunds { get; set; } = new();
    public Dictionary<string, string> AccountType { get; set; } = new();
    public Dictionary<string, string> AmountCurrency { get; set; } = new();
    public Dictionary<string, string> AccountCurrency { get; set; } = new();
    public Dictionary<string, string> AccountStatus { get; set; } = new();
    public Dictionary<string, string> DirectionOfSA { get; set; } = new();
    public Dictionary<string, string> DetailsOfDisposition { get; set; } = new();
}