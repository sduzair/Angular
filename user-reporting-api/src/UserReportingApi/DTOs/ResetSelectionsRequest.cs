namespace UserReportingApi.DTOs;

public record ResetSelectionsRequest
(
    List<PendingReset> PendingResets
);

public record PendingReset
(
    string FlowOfFundsAmlTransactionId,
    int ETag
);