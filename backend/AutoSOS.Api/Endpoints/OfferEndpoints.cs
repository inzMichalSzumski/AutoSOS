using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.Hubs;
using AutoSOS.Api.Models;

namespace AutoSOS.Api.Endpoints;

public static class OfferEndpoints
{
    public static void MapOfferEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/offers")
            .WithTags("Offers")
            .WithOpenApi();

        // POST /api/offers - Operator składa ofertę
        group.MapPost("/", async (
            CreateOfferDto dto,
            AutoSOSDbContext db,
            IHubContext<RequestHub> hub) =>
        {
            var request = await db.Requests.FindAsync(dto.RequestId);
            if (request == null)
                return Results.NotFound(new { error = "Request not found" });

            var operator_ = await db.Operators.FindAsync(dto.OperatorId);
            if (operator_ == null || !operator_.IsAvailable)
                return Results.BadRequest(new { error = "Operator not found or not available" });

            var offer = new Offer
            {
                Id = Guid.NewGuid(),
                RequestId = dto.RequestId,
                OperatorId = dto.OperatorId,
                Price = dto.Price,
                EstimatedTimeMinutes = dto.EstimatedTimeMinutes,
                Status = OfferStatus.Proposed,
                CreatedAt = DateTime.UtcNow
            };

            db.Offers.Add(offer);
            request.Status = RequestStatus.OfferReceived;
            request.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();

            // Powiadom przez SignalR
            await hub.Clients.Group($"request-{request.Id}").SendAsync("OfferReceived", new
            {
                offer.Id,
                offer.Price,
                offer.EstimatedTimeMinutes,
                OperatorName = operator_.Name
            });

            return Results.Created($"/api/offers/{offer.Id}", new
            {
                offer.Id,
                offer.Price,
                offer.EstimatedTimeMinutes,
                offer.Status,
                offer.CreatedAt
            });
        })
        .WithName("CreateOffer")
        .WithOpenApi();

        // POST /api/offers/{id}/accept - Akceptacja oferty
        group.MapPost("/{id:guid}/accept", async (
            Guid id,
            AutoSOSDbContext db,
            IHubContext<RequestHub> hub) =>
        {
            var offer = await db.Offers
                .Include(o => o.Request)
                .Include(o => o.Operator)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (offer == null)
                return Results.NotFound(new { error = "Offer not found" });

            if (offer.Status != OfferStatus.Proposed)
                return Results.BadRequest(new { error = "Offer cannot be accepted" });

            offer.Status = OfferStatus.Accepted;
            offer.AcceptedAt = DateTime.UtcNow;

            offer.Request.Status = RequestStatus.Accepted;
            offer.Request.UpdatedAt = DateTime.UtcNow;

            // Odrzuć inne oferty dla tego zgłoszenia
            var otherOffers = await db.Offers
                .Where(o => o.RequestId == offer.RequestId && o.Id != id && o.Status == OfferStatus.Proposed)
                .ToListAsync();

            foreach (var otherOffer in otherOffers)
            {
                otherOffer.Status = OfferStatus.Rejected;
            }

            await db.SaveChangesAsync();

            // Powiadom przez SignalR
            await hub.Clients.Group($"request-{offer.Request.Id}").SendAsync("OfferAccepted", new
            {
                offer.Id,
                offer.Price,
                OperatorName = offer.Operator.Name,
                OperatorPhone = offer.Operator.Phone
            });

            return Results.Ok(new
            {
                offer.Id,
                offer.Price,
                offer.Status,
                offer.AcceptedAt
            });
        })
        .WithName("AcceptOffer")
        .WithOpenApi();
    }
}

