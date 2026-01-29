namespace UserReportingApi.DTOs;

public record RemoveSelectionsResponse
(
    int CaseETag,
    int Count,
    DateTime LastUpdated
);