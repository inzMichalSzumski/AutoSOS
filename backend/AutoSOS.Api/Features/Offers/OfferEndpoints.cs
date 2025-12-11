using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.Hubs;
using AutoSOS.Api.Models;

namespace AutoSOS.Api.Features.Offers;

public static class OfferEndpoints
{
    public static void MapOfferEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/offers")
            .WithTags("Offers")
            .WithOpenApi();

        // GET /api/offers/request/{requestId} - Get all offers for a request (public)
        group.MapGet("/request/{requestId:guid}", async (
            Guid requestId,
            AutoSOSDbContext db,
            CancellationToken cancellationToken) =>
        {
            var offers = await db.Offers
                .Include(o => o.Operator)
                .Where(o => o.RequestId == requestId && o.Status == OfferStatus.Proposed)
                .OrderBy(o => o.Price)
                .Select(o => new
                {
                    o.Id,
                    o.Price,
                    o.EstimatedTimeMinutes,
                    o.Status,
                    o.CreatedAt,
                    Operator = new
                    {
                        o.Operator.Id,
                        o.Operator.Name,
                        o.Operator.Phone,
                        o.Operator.VehicleType
                    }
                })
                .ToListAsync(cancellationToken);

            return Results.Ok(new { offers });
        })
        .WithName("GetOffersForRequest")
        .WithOpenApi();

        // POST /api/offers - Operator submits an offer
        group.MapPost("/", async (
            CreateOfferDto dto,
            AutoSOSDbContext db,
            HttpContext context,
            IHubContext<RequestHub> hub,
            CancellationToken cancellationToken) =>
        {
            // Security: Verify operator is creating their own offer
            var tokenOperatorId = context.User.FindFirst("OperatorId")?.Value;
            if (string.IsNullOrEmpty(tokenOperatorId) || 
                !Guid.TryParse(tokenOperatorId, out var operatorGuid) ||
                operatorGuid != dto.OperatorId)
            {
                return Results.Forbid();
            }

            // Validate price
            if (dto.Price < 0 || dto.Price > 100000)
            {
                return Results.BadRequest(new { error = "Invalid price. Must be between 0 and 100000." });
            }

            // Validate estimated time
            if (dto.EstimatedTimeMinutes.HasValue && 
                (dto.EstimatedTimeMinutes < 0 || dto.EstimatedTimeMinutes > 1440))
            {
                return Results.BadRequest(new { error = "Invalid estimated time. Must be between 0 and 1440 minutes (24 hours)." });
            }

            var request = await db.Requests.FindAsync(new object[] { dto.RequestId }, cancellationToken);
            if (request == null)
                return Results.NotFound(new { error = "Request not found" });

            var operator_ = await db.Operators.FindAsync(new object[] { dto.OperatorId }, cancellationToken);
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

            await db.SaveChangesAsync(cancellationToken);

            // Notify via SignalR
            await hub.Clients.Group($"request-{request.Id}").SendAsync("OfferReceived", new
            {
                offer.Id,
                offer.Price,
                offer.EstimatedTimeMinutes,
                OperatorName = operator_.Name
            }, cancellationToken);

            return Results.Created($"/api/offers/{offer.Id}", new
            {
                offer.Id,
                offer.Price,
                offer.EstimatedTimeMinutes,
                offer.Status,
                offer.CreatedAt
            });
        })
        .RequireAuthorization()
        .WithName("CreateOffer")
        .WithOpenApi();

        // POST /api/offers/{id}/accept - Accept offer
        group.MapPost("/{id:guid}/accept", async (
            Guid id,
            AcceptOfferDto dto,
            AutoSOSDbContext db,
            IHubContext<RequestHub> hub,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var offer = await db.Offers
                .Include(o => o.Request)
                .Include(o => o.Operator)
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

            if (offer == null)
            {
                logger.LogWarning("Offer not found: {OfferId}", id);
                return Results.NotFound(new { error = "Offer not found" });
            }

            // Security: Verify phone number matches request owner
            if (offer.Request.PhoneNumber != dto.PhoneNumber)
            {
                logger.LogWarning(
                    "Phone number mismatch for offer {OfferId}. Expected: {ExpectedPhone}, Received: {ReceivedPhone}",
                    id, offer.Request.PhoneNumber, dto.PhoneNumber);
                return Results.Forbid();
            }

            if (offer.Status != OfferStatus.Proposed)
                return Results.BadRequest(new { error = "Offer cannot be accepted" });

            offer.Status = OfferStatus.Accepted;
            offer.AcceptedAt = DateTime.UtcNow;

            offer.Request.Status = RequestStatus.Accepted;
            offer.Request.UpdatedAt = DateTime.UtcNow;

            // Reject other offers for this request
            var otherOffers = await db.Offers
                .Where(o => o.RequestId == offer.RequestId && o.Id != id && o.Status == OfferStatus.Proposed)
                .ToListAsync(cancellationToken);

            foreach (var otherOffer in otherOffers)
            {
                otherOffer.Status = OfferStatus.Rejected;
            }

            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Another user has already modified this offer (likely accepted it)
                return Results.Conflict(new { 
                    error = "This offer has already been accepted by someone else. Please refresh and try again." 
                });
            }

            // Notify via SignalR
            await hub.Clients.Group($"request-{offer.Request.Id}").SendAsync("OfferAccepted", new
            {
                offer.Id,
                offer.Price,
                OperatorName = offer.Operator.Name,
                OperatorPhone = offer.Operator.Phone
            }, cancellationToken);

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

