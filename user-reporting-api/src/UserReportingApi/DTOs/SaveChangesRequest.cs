using UserReportingApi.Entities;

namespace UserReportingApi.DTOs;

public record SaveChangesRequest
(
    List<PendingChange> PendingChanges
);

public record PendingChange
(
    string FlowOfFundsAmlTransactionId,
    int ETag,
    List<ChangeLogEntry> ChangeLogs
);