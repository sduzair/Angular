using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public interface IHasBsonElements
{
    ObjectId Id { get; set; }
    BsonDocument ExtraElements { get; set; }
}

public class SourceABM : IHasBsonElements
{
    [BsonId]
    public ObjectId Id { get; set; }

    [BsonExtraElements]
    public BsonDocument ExtraElements { get; set; } = null!;
}

public class SourceEMT : IHasBsonElements
{
    [BsonId]
    public ObjectId Id { get; set; }

    [BsonExtraElements]
    public BsonDocument ExtraElements { get; set; } = null!;
}

public class SourceFlowOfFunds : IHasBsonElements
{
    [BsonId]
    public ObjectId Id { get; set; }

    [BsonExtraElements]
    public BsonDocument ExtraElements { get; set; } = null!;
}

public class SourceOLB : IHasBsonElements
{
    [BsonId]
    public ObjectId Id { get; set; }

    [BsonExtraElements]
    public BsonDocument ExtraElements { get; set; } = null!;
}