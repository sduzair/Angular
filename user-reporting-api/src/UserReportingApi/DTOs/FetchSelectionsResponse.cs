using UserReportingApi.Entities;

namespace UserReportingApi.DTOs;

public record FetchSelectionsResponse(List<Selection> Selections, List<Party> Parties);