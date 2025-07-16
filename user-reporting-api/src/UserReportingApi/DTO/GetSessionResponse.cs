public class GetSessionResponse
{
    public string Id { get; set; } = string.Empty;
    public int Version { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    public object Data { get; set; } = null!;
}
