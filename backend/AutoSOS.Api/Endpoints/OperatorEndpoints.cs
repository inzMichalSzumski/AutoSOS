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

        // GET /api/operators - Search for operators within radius (public)
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
                    CurrentLatitude = op.CurrentLatitude!.Value,
                    CurrentLongitude = op.CurrentLongitude!.Value,
                    Distance = GeolocationService.CalculateDistance(
                        lat, lng,
                        op.CurrentLatitude!.Value,
                        op.CurrentLongitude!.Value
                    ),
                    op.ServiceRadiusKm
                })
                .Where(op => op.Distance <= radius) // Show operators within user's search radius
                .OrderBy(op => op.Distance)
                .Select(op => new
                {
                    op.Id,
                    op.Name,
                    op.Phone,
                    op.VehicleType,
                    CurrentLatitude = op.CurrentLatitude,
                    CurrentLongitude = op.CurrentLongitude,
                    Distance = Math.Round(op.Distance, 1)
                })
                .ToList();

            return Results.Ok(new { operators = operatorsInRadius });
        })
        .WithName("GetOperators")
        .WithOpenApi();

        // GET /api/operators/{id} - Get operator details (authenticated)
        group.MapGet("/{id}", async (
            Guid id,
            AutoSOSDbContext db,
            HttpContext context) =>
        {
            // Get operatorId from JWT token
            var operatorIdClaim = context.User.FindFirst("OperatorId")?.Value;
            if (operatorIdClaim == null || !Guid.TryParse(operatorIdClaim, out var tokenOperatorId))
            {
                return Results.Unauthorized();
            }

            // Check if operator is requesting their own details
            if (tokenOperatorId != id)
            {
                return Results.Forbid();
            }

            var operatorEntity = await db.Operators
                .Include(o => o.User)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (operatorEntity == null)
            {
                return Results.NotFound(new { error = "Operator not found" });
            }

            return Results.Ok(new
            {
                operatorEntity.Id,
                operatorEntity.Name,
                operatorEntity.Phone,
                operatorEntity.VehicleType,
                operatorEntity.CurrentLatitude,
                operatorEntity.CurrentLongitude,
                operatorEntity.IsAvailable,
                operatorEntity.ServiceRadiusKm
            });
        })
        .RequireAuthorization()
        .WithName("GetOperatorDetails")
        .WithOpenApi();

        // PUT /api/operators/{id}/location - Update operator location
        group.MapPut("/{id}/location", async (
            Guid id,
            UpdateLocationDto dto,
            AutoSOSDbContext db,
            HttpContext context,
            CancellationToken cancellationToken) =>
        {
            // Get operatorId from JWT token
            var operatorIdClaim = context.User.FindFirst("OperatorId")?.Value;
            if (operatorIdClaim == null || !Guid.TryParse(operatorIdClaim, out var tokenOperatorId))
            {
                return Results.Unauthorized();
            }

            // Check if operator is updating their own location
            if (tokenOperatorId != id)
            {
                return Results.Forbid();
            }

            var operatorEntity = await db.Operators.FindAsync(id);
            if (operatorEntity == null)
            {
                return Results.NotFound(new { error = "Operator not found" });
            }

            operatorEntity.CurrentLatitude = dto.Latitude;
            operatorEntity.CurrentLongitude = dto.Longitude;

            await db.SaveChangesAsync(cancellationToken);

            return Results.Ok(new { success = true, message = "Location updated" });
        })
        .RequireAuthorization()
        .WithName("UpdateOperatorLocation")
        .WithOpenApi();

        // PUT /api/operators/{id}/availability - Update operator availability
        group.MapPut("/{id}/availability", async (
            Guid id,
            UpdateAvailabilityDto dto,
            AutoSOSDbContext db,
            HttpContext context,
            CancellationToken cancellationToken) =>
        {
            // Get operatorId from JWT token
            var operatorIdClaim = context.User.FindFirst("OperatorId")?.Value;
            if (operatorIdClaim == null || !Guid.TryParse(operatorIdClaim, out var tokenOperatorId))
            {
                return Results.Unauthorized();
            }

            // Check if operator is updating their own availability
            if (tokenOperatorId != id)
            {
                return Results.Forbid();
            }

            var operatorEntity = await db.Operators.FindAsync(id);
            if (operatorEntity == null)
            {
                return Results.NotFound(new { error = "Operator not found" });
            }

            operatorEntity.IsAvailable = dto.IsAvailable;

            await db.SaveChangesAsync(cancellationToken);

            return Results.Ok(new { 
                success = true, 
                message = dto.IsAvailable ? "You are now available" : "You are now unavailable",
                isAvailable = operatorEntity.IsAvailable
            });
        })
        .RequireAuthorization()
        .WithName("UpdateOperatorAvailability")
        .WithOpenApi();
    }
}

// DTOs for operator endpoints
public record UpdateLocationDto(double Latitude, double Longitude);
public record UpdateAvailabilityDto(bool IsAvailable);

