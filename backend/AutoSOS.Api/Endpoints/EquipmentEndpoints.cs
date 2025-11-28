using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;

namespace AutoSOS.Api.Endpoints;

public static class EquipmentEndpoints
{
    public static void MapEquipmentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/equipment")
            .WithTags("Equipment")
            .WithOpenApi();

        // GET /api/equipment - Get all available equipment types
        group.MapGet("/", async (AutoSOSDbContext db, CancellationToken cancellationToken) =>
        {
            var equipment = await db.Equipment
                .OrderBy(e => e.Name)
                .Select(e => new
                {
                    e.Id,
                    e.Name,
                    e.Description,
                    e.RequiresTransport
                })
                .ToListAsync(cancellationToken);

            return Results.Ok(new { equipment });
        })
        .WithName("GetEquipment")
        .WithOpenApi();
    }
}

