using MongoDB.Driver;
using UserReportingApi.Entities;

namespace UserReportingApi;

public static class CaseRecordGuard
{
    public static FilterDefinition<CaseRecord> ActiveWithETag(
        string caseRecordId, int eTag) =>
        Builders<CaseRecord>.Filter.And(
            Builders<CaseRecord>.Filter.Eq(x => x.CaseRecordId, caseRecordId),
            Builders<CaseRecord>.Filter.Eq(x => x.ETag, eTag),
            Builders<CaseRecord>.Filter.Eq(x => x.IsClosed, false)
        );

    public static async Task<IResult> ResolveFailureAsync(
        IMongoCollection<CaseRecord> caseRecords,
        string caseRecordId,
        int requestedETag)
    {
        var current = await caseRecords
            .Find(Builders<CaseRecord>.Filter.Eq(x => x.CaseRecordId, caseRecordId))
            .FirstOrDefaultAsync();

        if (current == null)
            return Results.NotFound(new { message = $"Case record not found: {caseRecordId}" });

        if (current.IsClosed)
            return Results.Conflict(new
            {
                message = "Case record is closed and cannot be modified",
                closedAt = current.ClosedAt,
                closedBy = current.ClosedBy,
                currentETag = current.ETag
            });

        // Not closed but ETag mismatch — already active (for activate calls)
        // or concurrent modification
        return Results.Conflict(new
        {
            message = "Case record has been modified by another user",
            currentETag = current.ETag,
            requestedETag
        });
    }
}