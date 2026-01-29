using System.Text.Json;
using System.Text.Json.Serialization;
using MongoDB.Bson.Serialization.Attributes;

namespace UserReportingApi.DTOs.Json;

/// <summary>
/// Base class for entities with dynamic extra properties that need to work with both
/// System.Text.Json (API) and MongoDB.Bson serialization, keeping extra fields at root level.
/// </summary>
public abstract class HasExtraElements : IJsonOnSerializing, IJsonOnDeserialized
{
    /// <summary>
    /// MongoDB storage for extra fields. [BsonExtraElements] flattens these at root level in BSON.
    /// [JsonIgnore] prevents System.Text.Json from nesting this as an "extraElements" object.
    /// 
    /// Flow:
    /// - MongoDB Fetch: Unknown BSON fields → here
    /// - MongoDB Insert: This → root-level BSON fields
    /// - API Request: JsonExtraElements → here (via OnDeserialized)
    /// - API Response: Here → JsonExtraElements (via OnSerializing)
    /// </summary>
    [BsonExtraElements]
    [JsonIgnore]
    public Dictionary<string, object?>? ExtraElements { get; set; } = new();

    /// <summary>
    /// System.Text.Json storage for extra fields. [JsonExtensionData] flattens these at root level in JSON.
    /// [BsonIgnore] prevents MongoDB from storing this (it already has ExtraElements).
    /// 
    /// Flow:
    /// - API Request: Unknown JSON fields → here (auto-populated by [JsonExtensionData])
    /// - API Response: This → root-level JSON fields (auto-serialized by [JsonExtensionData])
    /// </summary>
    [JsonExtensionData]
    [BsonIgnore]
    public Dictionary<string, JsonElement>? JsonExtraElements { get; set; } = new();

    void IJsonOnSerializing.OnSerializing()
    {
        if (ExtraElements is null || ExtraElements.Count == 0) return;

        JsonExtraElements ??= new();
        foreach (var (k, v) in ExtraElements)
        {
            // If you keep primitives in ExtraElements, this is fine.
            JsonExtraElements[k] = v is JsonElement je ? je : JsonSerializer.SerializeToElement(v);
        }
    }

    void IJsonOnDeserialized.OnDeserialized()
    {
        if (JsonExtraElements is null || JsonExtraElements.Count == 0) return;

        ExtraElements ??= new();
        foreach (var (k, v) in JsonExtraElements)
        {
            ExtraElements[k] = v.ToDotNetValue();
        }
    }
}

internal static class JsonElementMongoExtensions
{
    public static object? ToDotNetValue(this JsonElement e) =>
        e.ValueKind switch
        {
            JsonValueKind.String when e.TryGetDateTime(out var dt) => dt,
            JsonValueKind.String => e.GetString(),
            JsonValueKind.Number when e.TryGetInt32(out var i32) => i32,
            JsonValueKind.Number when e.TryGetInt64(out var i64) => i64,
            JsonValueKind.Number => e.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            JsonValueKind.Object => e.EnumerateObject()
                .ToDictionary(p => p.Name, p => p.Value.ToDotNetValue()),
            JsonValueKind.Array => e.EnumerateArray()
                .Select(x => x.ToDotNetValue()).ToList(),
            _ => e.ToString()
        };
}