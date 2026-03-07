using MongoDB.Bson;
using MongoDB.Driver;
using UserReportingApi.DTOs;

namespace UserReportingApi;

public static class TransactionFilterBuilder
{
    public static FilterDefinition<BsonDocument> BuildFilter(
        TransactionSearchRequest req,
        string collectionName)
    {
        var filters = new List<FilterDefinition<BsonDocument>>();
        var builder = Builders<BsonDocument>.Filter;

        // 1. Source systems filter — skip if empty
        if (req.SourceSystemsSelection is { Count: > 0 })
        {
            filters.Add(builder.In("sourceId", req.SourceSystemsSelection));
        }

        // 2. Account numbers — accountNo (ignore transit)
        //    maps to flowOfFundsCreditedAccount OR flowOfFundsDebitedAccount
        if (req.AccountNumbersSelection is { Count: > 0 })
        {
            var accountNos = req.AccountNumbersSelection
                .Select(a => a.Account)
                .Where(a => !string.IsNullOrWhiteSpace(a))
                .Distinct()
                .ToList();

            if (accountNos.Count > 0)
            {
                var creditFilter = builder.In("flowOfFundsCreditedAccount", accountNos);
                var debitFilter = builder.In("flowOfFundsDebitedAccount", accountNos);
                filters.Add(builder.Or(creditFilter, debitFilter));
            }
        }

        // 3. Review period — maps to flowOfFundsTransactionDate
        //    Multiple periods are OR-combined
        if (req.ReviewPeriodSelection is { Count: > 0 })
        {
            var periodFilters = req.ReviewPeriodSelection
                .Where(p => !string.IsNullOrWhiteSpace(p.Start)
                         && !string.IsNullOrWhiteSpace(p.End))
                .Select(p => builder.And(
                    builder.Gte("flowOfFundsTransactionDate", p.Start),
                    builder.Lte("flowOfFundsTransactionDate", p.End)
                ))
                .ToList();

            if (periodFilters.Count > 0)
                filters.Add(builder.Or(periodFilters));
        }

        // 4. productTypesSelection -> ignored
        // 5. partyKeysSelection    -> ignored

        return filters.Count > 0
            ? builder.And(filters)
            : FilterDefinition<BsonDocument>.Empty;
    }
}