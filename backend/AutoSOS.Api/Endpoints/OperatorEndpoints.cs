using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.Services;

namespace AutoSOS.Api.Endpoints;

public static class OperatorEndpoints
{
    public static void MapOperatorEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/operators")
            .WithTags("Operators")
            .WithOpenApi();

        // GET /api/operators - Wyszukiwanie operatorów w promieniu
        group.MapGet("/", async (
            double lat,
            double lng,
            double radius = 20,
            AutoSOSDbContext db) =>
        {
            var operators = await db.Operators
                .Include(o => o.User)
                .Where(o => o.IsAvailable && o.CurrentLatitude.HasValue && o.CurrentLongitude.HasValue)
                .ToListAsync();

            var operatorsInRadius = operators
                .Select(op => new
                {
                    op.Id,
                    op.Name,
                    op.Phone,
                    op.VehicleType,
                    Distance = GeolocationService.CalculateDistance(
                        lat, lng,
                        op.CurrentLatitude!.Value,
                        op.CurrentLongitude!.Value
                    ),
                    op.ServiceRadiusKm
                })
                .Where(op => op.Distance <= radius && op.Distance <= (op.ServiceRadiusKm ?? 20))
                .OrderBy(op => op.Distance)
                .Select(op => new
                {
                    op.Id,
                    op.Name,
                    op.Phone,
                    op.VehicleType,
                    Distance = Math.Round(op.Distance, 1)
                })
                .ToList();

            return Results.Ok(new { operators = operatorsInRadius });
        })
        .WithName("GetOperators")
        .WithOpenApi();
    }
}

