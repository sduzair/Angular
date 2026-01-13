namespace UserReportingApi.DTOs;

public record AddSelectionsResponse
(
    int CaseETag,
    int Count,
    DateTime LastUpdated
);