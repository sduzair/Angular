using System.Text.Json;

namespace UserReportingApi.DTOs.Json;


// Shared with tests for deserialization
public static class JsonConfiguration
{
    public static void ConfigureJsonOptions(JsonSerializerOptions options)
    {
        options.Converters.Add(new ObjectIdJsonConverter());
        options.PropertyNameCaseInsensitive = true;
        options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    }
}