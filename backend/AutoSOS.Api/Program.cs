using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.Hubs;
using AutoSOS.Api.Models;
using AutoSOS.Api.Services;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database
builder.Services.AddDbContext<AutoSOSDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// SignalR
builder.Services.AddSignalR();

// CORS - pozwól frontendowi na GitHub Pages
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "https://inzmichalszumski.github.io"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

// SignalR Hub
app.MapHub<RequestHub>("/hubs/request");

// API Endpoints

// POST /api/requests - Tworzenie zgłoszenia
app.MapPost("/api/requests", async (CreateRequestDto dto, AutoSOSDbContext db, IHubContext<RequestHub> hub) =>
{
    var request = new Request
    {
        Id = Guid.NewGuid(),
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

// GET /api/operators - Wyszukiwanie operatorów w promieniu
app.MapGet("/api/operators", async (double lat, double lng, double radius = 20, AutoSOSDbContext db) =>
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

// GET /api/requests/{id} - Pobranie zgłoszenia
app.MapGet("/api/requests/{id:guid}", async (Guid id, AutoSOSDbContext db) =>
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

// POST /api/offers - Operator składa ofertę
app.MapPost("/api/offers", async (CreateOfferDto dto, AutoSOSDbContext db, IHubContext<RequestHub> hub) =>
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
app.MapPost("/api/offers/{id:guid}/accept", async (Guid id, AutoSOSDbContext db, IHubContext<RequestHub> hub) =>
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

app.Run();

