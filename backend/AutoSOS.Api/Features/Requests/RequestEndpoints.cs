using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.Hubs;
using AutoSOS.Api.Models;
using AutoSOS.Api.Services;

namespace AutoSOS.Api.Features.Requests;

public static class RequestEndpoints
{
    public static void MapRequestEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/requests")
            .WithTags("Requests")
            .WithOpenApi();

        // POST /api/requests - Create a new help request
        group.MapPost("/", async (
            CreateRequestDto dto,
            AutoSOSDbContext db,
            IHubContext<RequestHub> hub,
            HttpContext context,
            CancellationToken cancellationToken) =>
        {
            // Set phone number in header for rate limiting
            context.Request.Headers["X-Phone-Number"] = dto.PhoneNumber;
            // Find or create User for the customer
            var user = await db.Users
                .FirstOrDefaultAsync(u => u.PhoneNumber == dto.PhoneNumber && u.Role == UserRole.Customer, cancellationToken);

            if (user == null)
            {
                user = new User
                {
                    Id = Guid.NewGuid(),
                    PhoneNumber = dto.PhoneNumber,
                    Role = UserRole.Customer,
                    IsVerified = false,
                    CreatedAt = DateTime.UtcNow
                };
                db.Users.Add(user);
                await db.SaveChangesAsync(cancellationToken);
            }

            var request = new Request
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                PhoneNumber = dto.PhoneNumber,
                FromLatitude = dto.FromLatitude,
                FromLongitude = dto.FromLongitude,
                ToLatitude = dto.ToLatitude,
                ToLongitude = dto.ToLongitude,
                Description = dto.Description,
                RequiredEquipmentId = dto.RequiredEquipmentId,
                Status = RequestStatus.Searching, // Set to Searching so operators can see the request
                CreatedAt = DateTime.UtcNow
            };

            db.Requests.Add(request);
            await db.SaveChangesAsync(cancellationToken);

            // Notify client via SignalR
            await hub.Clients.Group($"request-{request.Id}").SendAsync("RequestCreated", new
            {
                request.Id,
                request.Status,
                request.CreatedAt
            }, cancellationToken);

            // Notifications to operators will be sent by RequestNotificationService
            // (Background Service checks every 5 seconds and sends notifications)

            return Results.Created($"/api/requests/{request.Id}", new
            {
                request.Id,
                request.PhoneNumber,
                request.Status,
                request.CreatedAt
            });
        })
        .RequireRateLimiting("CreateRequestRateLimit")
        .WithName("CreateRequest")
        .WithOpenApi();

        // GET /api/requests/{id} - Get a specific request
        group.MapGet("/{id:guid}", async (
            Guid id,
            string phoneNumber,
            AutoSOSDbContext db,
            CancellationToken cancellationToken) =>
        {
            var request = await db.Requests.FindAsync(new object[] { id }, cancellationToken);

            if (request == null)
                return Results.NotFound();

            // Security: Verify phone number matches request owner
            if (request.PhoneNumber != phoneNumber)
            {
                return Results.Forbid();
            }

            return Results.Ok(new
            {
                request.Id,
                request.PhoneNumber,
                request.FromLatitude,
                request.FromLongitude,
                request.ToLatitude,
                request.ToLongitude,
                request.Description,
                request.Status,
                request.CreatedAt,
                request.UpdatedAt
            });
        })
        .WithName("GetRequest")
        .WithOpenApi();

        // PUT /api/requests/{id}/cancel - Cancel a request
        group.MapPut("/{id:guid}/cancel", async (
            Guid id,
            CancelRequestDto dto,
            AutoSOSDbContext db,
            IHubContext<RequestHub> hub,
            CancellationToken cancellationToken) =>
        {
            var request = await db.Requests.FindAsync(new object[] { id }, cancellationToken);
            
            if (request == null)
                return Results.NotFound(new { error = "Request not found" });

            // Security: Verify that the phone number matches the request owner
            if (request.PhoneNumber != dto.PhoneNumber)
            {
                return Results.Forbid();
            }

            // Can only cancel requests in Searching or Pending status
            if (request.Status != RequestStatus.Searching && request.Status != RequestStatus.Pending)
            {
                return Results.BadRequest(new { error = "Cannot cancel request in current status" });
            }

            request.Status = RequestStatus.Cancelled;
            request.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);

            // Notify client via SignalR
            await hub.Clients.Group($"request-{request.Id}").SendAsync("RequestCancelled", new
            {
                request.Id,
                request.Status,
                message = "Request has been cancelled"
            }, cancellationToken);

            return Results.Ok(new
            {
                request.Id,
                request.Status,
                message = "Request cancelled successfully"
            });
        })
        .WithName("CancelRequest")
        .WithOpenApi();

        // GET /api/requests/available - Get available requests for operators
        group.MapGet("/available", async (
            AutoSOSDbContext db,
            HttpContext context,
            CancellationToken cancellationToken) =>
        {
            // Get operatorId from JWT token
            var operatorIdClaim = context.User.FindFirst("OperatorId")?.Value;
            if (operatorIdClaim == null || !Guid.TryParse(operatorIdClaim, out var operatorId))
            {
                return Results.Unauthorized();
            }

            // Get operator location and equipment
            var operatorEntity = await db.Operators
                .Include(o => o.OperatorEquipment)
                    .ThenInclude(oe => oe.Equipment)
                .FirstOrDefaultAsync(o => o.Id == operatorId, cancellationToken);
            
            if (operatorEntity == null || !operatorEntity.IsAvailable || 
                !operatorEntity.CurrentLatitude.HasValue || !operatorEntity.CurrentLongitude.HasValue)
            {
                return Results.Ok(new { requests = Array.Empty<object>() });
            }
            
            // Get equipment IDs that the operator possesses
            var operatorEquipmentIds = operatorEntity.OperatorEquipment
                .Select(oe => oe.EquipmentId)
                .ToList();

            // Get all active requests that operator might be interested in
            // This includes: new requests, requests with offers, accepted requests, and requests where operator is on the way
            var availableRequests = await db.Requests
                .Include(r => r.RequiredEquipment)
                .Where(r => r.Status == RequestStatus.Pending 
                         || r.Status == RequestStatus.Searching 
                         || r.Status == RequestStatus.OfferReceived
                         || r.Status == RequestStatus.Accepted
                         || r.Status == RequestStatus.OnTheWay)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync(cancellationToken);

            // Calculate distance and filter by service radius and equipment
            var requestsWithDistance = availableRequests
                .Select(r => new
                {
                    r.Id,
                    r.PhoneNumber,
                    r.FromLatitude,
                    r.FromLongitude,
                    r.ToLatitude,
                    r.ToLongitude,
                    r.Description,
                    r.RequiredEquipmentId,
                    r.RequiredEquipment,
                    r.Status,
                    r.CreatedAt,
                    Distance = GeolocationService.CalculateDistance(
                        operatorEntity.CurrentLatitude!.Value,
                        operatorEntity.CurrentLongitude!.Value,
                        r.FromLatitude,
                        r.FromLongitude
                    ),
                    HasRequiredEquipment = r.RequiredEquipmentId.HasValue
                        ? operatorEquipmentIds.Contains(r.RequiredEquipmentId.Value)
                        : true // If no specific equipment required, accept all operators
                })
                .Where(r => r.Distance <= (operatorEntity.ServiceRadiusKm ?? 20))
                // Filter based on required equipment
                .Where(r => r.HasRequiredEquipment)
                .OrderBy(r => r.Distance)
                .Select(r => new
                {
                    r.Id,
                    r.PhoneNumber,
                    r.FromLatitude,
                    r.FromLongitude,
                    r.ToLatitude,
                    r.ToLongitude,
                    r.Description,
                    RequiredEquipmentId = r.RequiredEquipmentId,
                    RequiredEquipmentName = r.RequiredEquipment != null ? r.RequiredEquipment.Name : null,
                    Status = r.Status.ToString(), // Convert enum to string
                    r.CreatedAt,
                    Distance = Math.Round(r.Distance, 1)
                })
                .ToList();

            return Results.Ok(new { requests = requestsWithDistance });
        })
        .RequireAuthorization()
        .WithName("GetAvailableRequests")
        .WithOpenApi();
    }
}

