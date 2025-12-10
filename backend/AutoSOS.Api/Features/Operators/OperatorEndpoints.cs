using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using AutoSOS.Api.Data;
using AutoSOS.Api.Services;

namespace AutoSOS.Api.Features.Operators;

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
            double radius = 20,
            CancellationToken cancellationToken = default) =>
        {
            var operators = await db.Operators
                .Include(o => o.User)
                .Where(o => o.IsAvailable && o.CurrentLatitude.HasValue && o.CurrentLongitude.HasValue)
                .ToListAsync(cancellationToken);

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
            HttpContext context,
            CancellationToken cancellationToken) =>
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
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

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

            var operatorEntity = await db.Operators.FindAsync(new object[] { id }, cancellationToken);
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

            var operatorEntity = await db.Operators.FindAsync(new object[] { id }, cancellationToken);
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

        // GET /api/operators/{operatorId}/equipment - Get operator's equipment
        group.MapGet("/{operatorId}/equipment", async (
            string operatorId,
            AutoSOSDbContext db,
            HttpContext context,
            CancellationToken cancellationToken) =>
        {
            if (!Guid.TryParse(operatorId, out var operatorGuid))
            {
                return Results.BadRequest(new { error = "Invalid operator ID" });
            }

            // Verify operator is requesting their own equipment
            var tokenOperatorId = context.User.FindFirst("OperatorId")?.Value;
            if (tokenOperatorId != operatorId)
            {
                return Results.Forbid();
            }

            var operatorEquipment = await db.OperatorEquipment
                .Include(oe => oe.Equipment)
                .Where(oe => oe.OperatorId == operatorGuid)
                .Select(oe => new
                {
                    oe.Equipment.Id,
                    oe.Equipment.Name,
                    oe.Equipment.Description,
                    oe.Equipment.RequiresTransport
                })
                .ToListAsync(cancellationToken);

            return Results.Ok(new { equipment = operatorEquipment });
        })
        .RequireAuthorization()
        .WithName("GetOperatorEquipment")
        .WithOpenApi();

        // PUT /api/operators/{operatorId}/equipment - Update operator's equipment
        group.MapPut("/{operatorId}/equipment", async (
            string operatorId,
            UpdateOperatorEquipmentDto dto,
            AutoSOSDbContext db,
            HttpContext context,
            CancellationToken cancellationToken) =>
        {
            if (!Guid.TryParse(operatorId, out var operatorGuid))
            {
                return Results.BadRequest(new { error = "Invalid operator ID" });
            }

            // Verify operator is updating their own equipment
            var tokenOperatorId = context.User.FindFirst("OperatorId")?.Value;
            if (tokenOperatorId != operatorId)
            {
                return Results.Forbid();
            }

            // Verify operator exists
            var operatorExists = await db.Operators.AnyAsync(o => o.Id == operatorGuid, cancellationToken);
            if (!operatorExists)
            {
                return Results.NotFound(new { error = "Operator not found" });
            }

            // Validate EquipmentIds is not null
            if (dto.EquipmentIds == null)
            {
                return Results.BadRequest(new { error = "EquipmentIds cannot be null. Use an empty array to remove all equipment." });
            }

            // Deduplicate equipment IDs to prevent database constraint violations
            var uniqueEquipmentIds = dto.EquipmentIds.Distinct().ToList();
            if (uniqueEquipmentIds.Count != dto.EquipmentIds.Count)
            {
                return Results.BadRequest(new { error = "Duplicate equipment IDs are not allowed." });
            }

            // Verify all equipment exists in a single query BEFORE making any changes to DbContext
            var existingEquipmentIds = await db.Equipment
                .Where(e => uniqueEquipmentIds.Contains(e.Id))
                .Select(e => e.Id)
                .ToListAsync(cancellationToken);

            // Check if any equipment IDs are invalid
            var invalidEquipmentIds = uniqueEquipmentIds.Except(existingEquipmentIds).ToList();
            if (invalidEquipmentIds.Any())
            {
                return Results.BadRequest(new { error = $"Equipment with IDs not found: {string.Join(", ", invalidEquipmentIds)}" });
            }

            // All validations passed - now safe to modify DbContext
            // Remove all current equipment
            var currentEquipment = await db.OperatorEquipment
                .Where(oe => oe.OperatorId == operatorGuid)
                .ToListAsync(cancellationToken);

            db.OperatorEquipment.RemoveRange(currentEquipment);

            // Add new equipment
            foreach (var equipmentId in uniqueEquipmentIds)
            {
                db.OperatorEquipment.Add(new Models.OperatorEquipment
                {
                    OperatorId = operatorGuid,
                    EquipmentId = equipmentId
                });
            }

            await db.SaveChangesAsync(cancellationToken);

            return Results.Ok(new
            {
                success = true,
                message = "Equipment updated successfully",
                equipmentCount = uniqueEquipmentIds.Count
            });
        })
        .RequireAuthorization()
        .WithName("UpdateOperatorEquipment")
        .WithOpenApi();
    }
}

