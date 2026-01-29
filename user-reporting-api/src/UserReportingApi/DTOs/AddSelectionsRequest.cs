using UserReportingApi.Entities;

namespace UserReportingApi.DTOs;

public record AddSelectionsRequest
(
    int CaseETag,
    List<Selection> Selections,
    List<Party> Parties
);