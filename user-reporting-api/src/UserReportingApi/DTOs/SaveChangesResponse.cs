namespace UserReportingApi.DTOs;

public record SaveChangesResponse
(
    string Message,
    int Requested,
    int Succeeded
);