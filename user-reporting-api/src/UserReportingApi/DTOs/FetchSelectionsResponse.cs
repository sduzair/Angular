using UserReportingApi.Entities;

namespace UserReportingApi.DTOs;

public record FetchSelectionsResponse(List<Selection> SelectionList, List<Party> PartyList);