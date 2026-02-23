namespace UserReportingApi.DTOs;

public record AddSelectionsResponse
(
    int CaseETag,
    int SelectionCount,
    int EntityCount,
    DateTime LastUpdated
);