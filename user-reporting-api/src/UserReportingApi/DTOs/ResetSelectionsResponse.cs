namespace UserReportingApi.DTOs;

public record ResetSelectionsResponse
(
    string Message,
    int Requested,
    int Succeeded
);