using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.DTOs;

namespace AutoSOS.Api.Endpoints;

public static class OperatorEquipmentEndpoints
{
    public static void MapOperatorEquipmentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/operators/{operatorId}/equipment")
            .WithTags("Operator Equipment")
            .RequireAuthorization();

        // GET /api/operators/{operatorId}/equipment - Get operator's equipment
        group.MapGet("/", async (string operatorId, AutoSOSDbContext db, HttpContext context, CancellationToken cancellationToken) =>
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
        });

        // PUT /api/operators/{operatorId}/equipment - Update operator's equipment
        group.MapPut("/", async (
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

            // Verify all equipment exists in a single query BEFORE making any changes to DbContext
            var existingEquipmentIds = await db.Equipment
                .Where(e => dto.EquipmentIds.Contains(e.Id))
                .Select(e => e.Id)
                .ToListAsync(cancellationToken);

            // Check if any equipment IDs are invalid
            var invalidEquipmentIds = dto.EquipmentIds.Except(existingEquipmentIds).ToList();
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
            foreach (var equipmentId in dto.EquipmentIds)
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
                equipmentCount = dto.EquipmentIds.Count
            });
        });
    }
}

