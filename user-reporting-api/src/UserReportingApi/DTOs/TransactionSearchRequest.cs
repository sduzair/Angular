namespace UserReportingApi.DTOs;


public record TransactionSearchRequest(
    List<string> PartyKeysSelection,
    List<AccountNumberSelection> AccountNumbersSelection,
    List<string> SourceSystemsSelection,
    List<string> ProductTypesSelection,
    List<ReviewPeriod> ReviewPeriodSelection
);

public record AccountNumberSelection(
    string Transit,
    string Account
);

public record ReviewPeriod(
    string Start,
    string End
);
