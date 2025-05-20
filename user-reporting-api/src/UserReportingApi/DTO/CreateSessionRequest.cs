using System.Globalization;
using System.Text.Json;
using MongoDB.Bson;

public record CreateSessionRequest(string UserId, JsonElement Data);

public static class BsonExtensions
{
    // Rewritten from this answer https://stackoverflow.com/a/71175724 by https://stackoverflow.com/users/7818969/peebo
    // To https://stackoverflow.com/questions/62080252/convert-newtosoft-jobject-directly-to-bsondocument
    public static BsonDocument ToBsonDocument(this JsonElement e, bool writeRootArrayAsDocument = false, bool tryParseDateTimes = false) =>
        e.ValueKind switch
        {
            JsonValueKind.Object =>
                new(e.EnumerateObject().Select(p => new BsonElement(p.Name, p.Value.ToBsonValue(tryParseDateTimes)))),
            // Newtonsoft converts arrays to documents by using the index as a key, so optionally do the same thing.
            JsonValueKind.Array when writeRootArrayAsDocument =>
                new(e.EnumerateArray().Select((v, i) => new BsonElement(i.ToString(NumberFormatInfo.InvariantInfo), v.ToBsonValue(tryParseDateTimes)))),
            _ => throw new NotSupportedException($"ToBsonDocument: {e}"),
        };

    public static BsonValue ToBsonValue(this JsonElement e, bool tryParseDateTimes = false) =>
        e.ValueKind switch
        {
            // TODO: determine whether you want strings that look like dates & times to be serialized as DateTime, DateTimeOffset, or just strings.
            JsonValueKind.String when tryParseDateTimes && e.TryGetDateTime(out var v) => BsonValue.Create(v),
            JsonValueKind.String => BsonValue.Create(e.GetString()),
            // TODO: decide whether to convert to Int64 unconditionally, or only when the value is larger than Int32
            JsonValueKind.Number when e.TryGetInt32(out var v) => BsonValue.Create(v),
            JsonValueKind.Number when e.TryGetInt64(out var v) => BsonValue.Create(v),
            // TODO: decide whether to convert floating values to decimal by default.  Decimal has more precision but a smaller range.
            //JsonValueKind.Number when e.TryGetDecimal(out var v) => BsonValue.Create(v),
            JsonValueKind.Number when e.TryGetDouble(out var v) => BsonValue.Create(v),
            JsonValueKind.Null => BsonValue.Create(null),
            JsonValueKind.True => BsonValue.Create(true),
            JsonValueKind.False => BsonValue.Create(false),
            JsonValueKind.Array => new BsonArray(e.EnumerateArray().Select(v => v.ToBsonValue(tryParseDateTimes))),
            JsonValueKind.Object => e.ToBsonDocument(false, tryParseDateTimes),
            _ => throw new NotSupportedException($"ToBsonValue: {e}"),
        };
}