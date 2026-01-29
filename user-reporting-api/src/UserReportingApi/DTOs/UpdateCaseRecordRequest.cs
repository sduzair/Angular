using UserReportingApi.Entities;

namespace UserReportingApi.DTOs;

public record UpdateCaseRecordRequest
(
    SearchParams SearchParams,
    int ETag
);