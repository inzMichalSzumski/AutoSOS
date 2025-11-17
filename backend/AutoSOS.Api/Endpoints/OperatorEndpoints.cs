using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using AutoSOS.Api.Data;
using AutoSOS.Api.Services;
using AutoSOS.Api.DTOs;

namespace AutoSOS.Api.Endpoints;

public static class OperatorEndpoints
{
    public static void MapOperatorEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/operators")
            .WithTags("Operators")
            .WithOpenApi();

        // GET /api/operators - Wyszukiwanie operatorów w promieniu (publiczny)
        group.MapGet("/", async (
            double lat,
            double lng,
            AutoSOSDbContext db,
            double radius = 20) =>
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

        // PUT /api/operators/{id}/location - Aktualizacja lokalizacji operatora
        group.MapPut("/{id}/location", async (
            Guid id,
            UpdateLocationDto dto,
            AutoSOSDbContext db,
            HttpContext context) =>
        {
            // Pobierz operatorId z tokenu JWT
            var operatorIdClaim = context.User.FindFirst("OperatorId")?.Value;
            if (operatorIdClaim == null || !Guid.TryParse(operatorIdClaim, out var tokenOperatorId))
            {
                return Results.Unauthorized();
            }

            // Sprawdź czy operator aktualizuje swoją własną lokalizację
            if (tokenOperatorId != id)
            {
                return Results.Forbid();
            }

            var operatorEntity = await db.Operators.FindAsync(id);
            if (operatorEntity == null)
            {
                return Results.NotFound(new { error = "Operator nie został znaleziony" });
            }

            operatorEntity.CurrentLatitude = dto.Latitude;
            operatorEntity.CurrentLongitude = dto.Longitude;

            await db.SaveChangesAsync();

            return Results.Ok(new { success = true, message = "Lokalizacja zaktualizowana" });
        })
        .RequireAuthorization()
        .WithName("UpdateOperatorLocation")
        .WithOpenApi();

        // PUT /api/operators/{id}/availability - Zmiana dostępności operatora
        group.MapPut("/{id}/availability", async (
            Guid id,
            UpdateAvailabilityDto dto,
            AutoSOSDbContext db,
            HttpContext context) =>
        {
            // Pobierz operatorId z tokenu JWT
            var operatorIdClaim = context.User.FindFirst("OperatorId")?.Value;
            if (operatorIdClaim == null || !Guid.TryParse(operatorIdClaim, out var tokenOperatorId))
            {
                return Results.Unauthorized();
            }

            // Sprawdź czy operator aktualizuje swoją własną dostępność
            if (tokenOperatorId != id)
            {
                return Results.Forbid();
            }

            var operatorEntity = await db.Operators.FindAsync(id);
            if (operatorEntity == null)
            {
                return Results.NotFound(new { error = "Operator nie został znaleziony" });
            }

            operatorEntity.IsAvailable = dto.IsAvailable;

            await db.SaveChangesAsync();

            return Results.Ok(new { 
                success = true, 
                message = dto.IsAvailable ? "Jesteś teraz dostępny" : "Jesteś teraz niedostępny",
                isAvailable = operatorEntity.IsAvailable
            });
        })
        .RequireAuthorization()
        .WithName("UpdateOperatorAvailability")
        .WithOpenApi();
    }
}

// DTOs dla endpointów operatora
public record UpdateLocationDto(double Latitude, double Longitude);
public record UpdateAvailabilityDto(bool IsAvailable);

