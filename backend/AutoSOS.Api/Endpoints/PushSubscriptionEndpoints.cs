using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.DTOs;
using AutoSOS.Api.Models;

namespace AutoSOS.Api.Endpoints;

public static class PushSubscriptionEndpoints
{
    public static void MapPushSubscriptionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/push-subscriptions")
            .WithTags("Push Subscriptions");

        // Save push subscription
        group.MapPost("/", async (SavePushSubscriptionDto dto, AutoSOSDbContext db, HttpContext context, CancellationToken cancellationToken) =>
        {
            if (!Guid.TryParse(dto.OperatorId, out var operatorId))
            {
                return Results.BadRequest(new { error = "Invalid operator ID" });
            }

            // Verify operator is creating their own subscription
            var tokenOperatorId = context.User.FindFirst("OperatorId")?.Value;
            if (tokenOperatorId != dto.OperatorId)
            {
                return Results.Forbid();
            }

            // Check if operator exists
            var operatorExists = await db.Operators.AnyAsync(o => o.Id == operatorId);
            if (!operatorExists)
            {
                return Results.NotFound(new { error = "Operator not found" });
            }

            // Check if subscription already exists
            var existingSubscription = await db.PushSubscriptions
                .FirstOrDefaultAsync(ps => ps.OperatorId == operatorId && ps.Endpoint == dto.Endpoint);

            if (existingSubscription != null)
            {
                // Update existing subscription
                existingSubscription.P256dhKey = dto.Keys.P256dh;
                existingSubscription.AuthKey = dto.Keys.Auth;
                existingSubscription.IsActive = true;
                existingSubscription.LastUsedAt = DateTime.UtcNow;
            }
            else
            {
                // Create new subscription
                var subscription = new PushSubscription
                {
                    Id = Guid.NewGuid(),
                    OperatorId = operatorId,
                    Endpoint = dto.Endpoint,
                    P256dhKey = dto.Keys.P256dh,
                    AuthKey = dto.Keys.Auth,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                db.PushSubscriptions.Add(subscription);
            }

            await db.SaveChangesAsync(cancellationToken);

            return Results.Ok(new { message = "Push subscription saved successfully" });
        })
        .RequireAuthorization();

        // Remove push subscription
        group.MapDelete("/", async (string operatorId, string endpoint, AutoSOSDbContext db, HttpContext context, CancellationToken cancellationToken) =>
        {
            if (!Guid.TryParse(operatorId, out var operatorGuid))
            {
                return Results.BadRequest(new { error = "Invalid operator ID" });
            }

            // Verify operator is deleting their own subscription
            var tokenOperatorId = context.User.FindFirst("OperatorId")?.Value;
            if (tokenOperatorId != operatorId)
            {
                return Results.Forbid();
            }

            var subscription = await db.PushSubscriptions
                .FirstOrDefaultAsync(ps => ps.OperatorId == operatorGuid && ps.Endpoint == endpoint);

            if (subscription == null)
            {
                return Results.NotFound(new { error = "Subscription not found" });
            }

            subscription.IsActive = false;
            await db.SaveChangesAsync(cancellationToken);

            return Results.Ok(new { message = "Push subscription removed successfully" });
        })
        .RequireAuthorization();

        // Get operator's subscriptions (for debugging)
        group.MapGet("/{operatorId}", async (string operatorId, AutoSOSDbContext db, HttpContext context) =>
        {
            if (!Guid.TryParse(operatorId, out var operatorGuid))
            {
                return Results.BadRequest(new { error = "Invalid operator ID" });
            }

            // Verify operator is requesting their own subscriptions
            var tokenOperatorId = context.User.FindFirst("OperatorId")?.Value;
            if (tokenOperatorId != operatorId)
            {
                return Results.Forbid();
            }

            var subscriptions = await db.PushSubscriptions
                .Where(ps => ps.OperatorId == operatorGuid && ps.IsActive)
                .Select(ps => new
                {
                    ps.Id,
                    ps.Endpoint,
                    ps.CreatedAt,
                    ps.LastUsedAt
                })
                .ToListAsync();

            return Results.Ok(subscriptions);
        })
        .RequireAuthorization();
    }
}

