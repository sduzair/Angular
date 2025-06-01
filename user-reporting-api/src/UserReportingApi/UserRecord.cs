using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class UserRecord
{
    [BsonId]
    public ObjectId UserId { get; set; }

    [BsonExtraElements]
    public BsonDocument ExtraElements { get; set; } = null!;
}