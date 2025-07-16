using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class Session
{
    public ObjectId Id { get; set; }
    public int Version { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string UserId { get; set; } = null!;
    [BsonElement("data")]
    public BsonDocument Data { get; set; } = null!;
}