using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class StrTxnRecord
{
    [BsonId]
    public ObjectId Id { get; set; }

    [BsonExtraElements]
    public BsonDocument ExtraElements { get; set; } = null!;
}