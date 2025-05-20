using System.Text.Json;

public record UpdateSessionRequest(int CurrentVersion, JsonElement Data);
