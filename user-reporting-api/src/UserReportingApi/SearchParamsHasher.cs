using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using UserReportingApi.Entities;

namespace UserReportingApi;

public static class SearchParamsHasher
{
    /// <summary>
    /// Generates a deterministic SHA-256 hash from SearchParams.
    /// Lists are sorted before hashing to ensure param order does not affect the result.
    /// </summary>
    public static string Compute(SearchParams searchParams)
    {
        // Normalize all lists to sorted order before hashing
        // so { ABM, OLB } and { OLB, ABM } produce the same hash
        var normalized = new
        {
            partyKeys = searchParams.PartyKeysSelection
                .OrderBy(x => x)
                .ToList(),

            accounts = searchParams.AccountNumbersSelection
                .OrderBy(x => x.Transit)
                .ThenBy(x => x.Account)
                .Select(x => new { x.Transit, x.Account })
                .ToList(),

            sourceSystems = searchParams.SourceSystemsSelection
                .OrderBy(x => x)
                .ToList(),

            productTypes = searchParams.ProductTypesSelection
                .OrderBy(x => x)
                .ToList(),

            reviewPeriods = searchParams.ReviewPeriodSelection
                .OrderBy(x => x.Start)
                .ThenBy(x => x.End)
                .Select(x => new { x.Start, x.End })
                .ToList(),
        };

        var json = JsonSerializer.Serialize(normalized);
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(json));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}