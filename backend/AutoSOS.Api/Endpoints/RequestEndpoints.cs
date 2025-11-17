using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.Hubs;
using AutoSOS.Api.Models;

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
                Status = RequestStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            db.Requests.Add(request);
            await db.SaveChangesAsync();

            // Powiadom przez SignalR
            await hub.Clients.Group($"request-{request.Id}").SendAsync("RequestCreated", new
            {
                request.Id,
                request.Status,
                request.CreatedAt
            });

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
    }
}

