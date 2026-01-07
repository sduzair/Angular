namespace UserReportingApi.DTOs;

public record RemoveSelectionsRequest
(
    int CaseETag,
    List<string> Selections
);