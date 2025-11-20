using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.Hubs;
using AutoSOS.Api.Models;
using AutoSOS.Api.Services;

namespace AutoSOS.Api.Endpoints;

public static class RequestEndpoints
{
    public static void MapRequestEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/requests")
            .WithTags("Requests")
            .WithOpenApi();

        // POST /api/requests - Tworzenie zgłoszenia
        group.MapPost("/", async (
            CreateRequestDto dto,
            AutoSOSDbContext db,
            IHubContext<RequestHub> hub) =>
        {
            // Znajdź lub utwórz User dla klienta
            var user = await db.Users
                .FirstOrDefaultAsync(u => u.PhoneNumber == dto.PhoneNumber && u.Role == UserRole.Customer);

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
                await db.SaveChangesAsync();
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
                Status = RequestStatus.Searching, // Zmieniamy na Searching, żeby operatorzy widzieli zgłoszenie
                CreatedAt = DateTime.UtcNow
            };

            db.Requests.Add(request);
            await db.SaveChangesAsync();

            // Powiadom klienta przez SignalR
            await hub.Clients.Group($"request-{request.Id}").SendAsync("RequestCreated", new
            {
                request.Id,
                request.Status,
                request.CreatedAt
            });

            // Powiadomienia do operatorów będą wysyłane przez RequestNotificationService
            // (Background Service sprawdza co 5 sekund i wysyła powiadomienia)

            return Results.Created($"/api/requests/{request.Id}", new
            {
                request.Id,
                request.PhoneNumber,
                request.Status,
                request.CreatedAt
            });
        })
        .WithName("CreateRequest")
        .WithOpenApi();

        // GET /api/requests/{id} - Pobranie zgłoszenia
        group.MapGet("/{id:guid}", async (Guid id, AutoSOSDbContext db) =>
        {
            var request = await db.Requests.FindAsync(id);

            if (request == null)
                return Results.NotFound();

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

        // PUT /api/requests/{id}/cancel - Anulowanie zgłoszenia
        group.MapPut("/{id:guid}/cancel", async (
            Guid id,
            AutoSOSDbContext db,
            IHubContext<RequestHub> hub) =>
        {
            var request = await db.Requests.FindAsync(id);
            
            if (request == null)
                return Results.NotFound(new { error = "Request not found" });

            // Można anulować tylko zgłoszenia w statusie Searching lub Pending
            if (request.Status != RequestStatus.Searching && request.Status != RequestStatus.Pending)
            {
                return Results.BadRequest(new { error = "Cannot cancel request in current status" });
            }

            request.Status = RequestStatus.Cancelled;
            request.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            // Powiadom klienta przez SignalR
            await hub.Clients.Group($"request-{request.Id}").SendAsync("RequestCancelled", new
            {
                request.Id,
                request.Status,
                message = "Request has been cancelled"
            });

            return Results.Ok(new
            {
                request.Id,
                request.Status,
                message = "Request cancelled successfully"
            });
        })
        .WithName("CancelRequest")
        .WithOpenApi();

        // GET /api/requests/available - Pobranie dostępnych zgłoszeń dla operatorów
        group.MapGet("/available", async (
            AutoSOSDbContext db,
            HttpContext context) =>
        {
            // Get operatorId from JWT token
            var operatorIdClaim = context.User.FindFirst("OperatorId")?.Value;
            if (operatorIdClaim == null || !Guid.TryParse(operatorIdClaim, out var operatorId))
            {
                return Results.Unauthorized();
            }

            // Get operator location
            var operatorEntity = await db.Operators.FindAsync(operatorId);
            if (operatorEntity == null || !operatorEntity.IsAvailable || 
                !operatorEntity.CurrentLatitude.HasValue || !operatorEntity.CurrentLongitude.HasValue)
            {
                return Results.Ok(new { requests = Array.Empty<object>() });
            }

            // Get pending and searching requests
            var availableRequests = await db.Requests
                .Where(r => r.Status == RequestStatus.Pending || r.Status == RequestStatus.Searching)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            // Calculate distance and filter by service radius
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
                    r.Status,
                    r.CreatedAt,
                    Distance = GeolocationService.CalculateDistance(
                        operatorEntity.CurrentLatitude!.Value,
                        operatorEntity.CurrentLongitude!.Value,
                        r.FromLatitude,
                        r.FromLongitude
                    )
                })
                .Where(r => r.Distance <= (operatorEntity.ServiceRadiusKm ?? 20))
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
                    r.Status,
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

