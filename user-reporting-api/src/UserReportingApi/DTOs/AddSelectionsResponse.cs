namespace UserReportingApi.DTOs;

public record AddSelectionsResponse
(
    int CaseETag,
    int SelectionCount,
    int PartyCount,
    DateTime LastUpdated
);