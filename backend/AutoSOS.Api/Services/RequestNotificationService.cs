using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.Hubs;
using AutoSOS.Api.Models;
using AutoSOS.Api.Services;

namespace AutoSOS.Api.Services;

public class RequestNotificationService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RequestNotificationService> _logger;
    private readonly WebPushService _webPushService;
    private const int InitialNotificationCount = 15; // Nearest 15 operators
    private const int ExpandNotificationCount = 10; // Additional 10 on expansion
    private const int NotificationTimeoutSeconds = 30; // 30 seconds for response
    private const int MaxExpansions = 3; // Maximum 3 expansions (15 + 10 + 10 + 10 = 45 operators)
    
    // ========================================
    // TODO: TEMPORARY - Mock offers - to be removed when real operators are available
    // ========================================
    private const int MockOfferDelaySeconds = 10; // After 10 seconds create mock offer (simulates operator response)
    private const double MockOfferProbability = 0.3; // 30% chance for mock offer from operator
    // ========================================
    // END OF TEMPORARY CODE - Mock offers
    // ========================================

    public RequestNotificationService(
        IServiceProvider serviceProvider,
        ILogger<RequestNotificationService> logger,
        WebPushService webPushService)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _webPushService = webPushService;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingRequestsAsync(stoppingToken);
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); // Check every 5 seconds
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RequestNotificationService");
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
        }
    }

    private async Task ProcessPendingRequestsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoSOSDbContext>();
        var hub = scope.ServiceProvider.GetRequiredService<IHubContext<RequestHub>>();

        // Find requests that are in Searching status and don't have offers yet
        var activeRequests = await db.Requests
            .Where(r => r.Status == RequestStatus.Searching)
            .ToListAsync(cancellationToken);

        foreach (var request in activeRequests)
        {
            var timeSinceCreation = DateTime.UtcNow - request.CreatedAt;
            var secondsSinceCreation = (int)timeSinceCreation.TotalSeconds;

            // Check if request already has an offer
            var hasOffer = await db.Offers.AnyAsync(o => o.RequestId == request.Id && o.Status == OfferStatus.Proposed, cancellationToken);
            
            // ========================================
            // TODO: TEMPORARY - Mock offers - to be removed when real operators are available
            // ========================================
            // Mock: Create automatic offer after specified time (simulates operator response)
            if (!hasOffer && secondsSinceCreation >= MockOfferDelaySeconds)
            {
                var random = new Random();
                if (random.NextDouble() < MockOfferProbability)
                {
                    await CreateMockOfferAsync(db, hub, request, cancellationToken);
                    continue; // We have an offer, don't expand notifications
                }
            }
            // ========================================
            // END OF TEMPORARY CODE - Mock offers
            // ========================================
            
            if (hasOffer)
            {
                // Request has an offer, don't expand notifications
                continue;
            }

            // Calculate how many expansions have already occurred (based on time)
            var expansionNumber = secondsSinceCreation / NotificationTimeoutSeconds;

            if (expansionNumber > MaxExpansions)
            {
                // Timeout - no help available
                request.Status = RequestStatus.Cancelled;
                await db.SaveChangesAsync(cancellationToken);

                // Notify client about timeout
                await hub.Clients.Group($"request-{request.Id}").SendAsync("RequestTimeout", new
                {
                    request.Id,
                    message = "Nie udało się znaleźć dostępnej pomocy. Spróbuj ponownie później."
                });

                _logger.LogInformation($"Request {request.Id} timed out after {expansionNumber} expansions");
                continue;
            }

            // Check if notifications need to be sent
            var operatorsToNotify = InitialNotificationCount + (expansionNumber * ExpandNotificationCount);
            
            // Get operators within radius with appropriate equipment
            var operators = await db.Operators
                .Include(o => o.OperatorEquipment)
                    .ThenInclude(oe => oe.Equipment)
                .Where(o => o.IsAvailable && o.CurrentLatitude.HasValue && o.CurrentLongitude.HasValue)
                .ToListAsync(cancellationToken);

            var operatorsWithDistance = operators
                .Select(op => new
                {
                    Operator = op,
                    Distance = GeolocationService.CalculateDistance(
                        request.FromLatitude,
                        request.FromLongitude,
                        op.CurrentLatitude!.Value,
                        op.CurrentLongitude!.Value
                    ),
                    HasRequiredEquipment = request.RequiredEquipmentId.HasValue
                        ? op.OperatorEquipment.Any(oe => oe.EquipmentId == request.RequiredEquipmentId.Value)
                        : true // If no specific equipment required, accept all operators
                })
                .Where(op => op.Distance <= (op.Operator.ServiceRadiusKm ?? 20))
                // Filter based on required equipment
                .Where(op => op.HasRequiredEquipment)
                .OrderBy(op => op.Distance)
                .Take(operatorsToNotify)
                .ToList();

            // Send notifications to operators (only if this is the first notification or expansion)
            if (expansionNumber == 0 || secondsSinceCreation % NotificationTimeoutSeconds < 5)
            {
                var notificationData = new
                {
                    request.Id,
                    request.PhoneNumber,
                    request.FromLatitude,
                    request.FromLongitude,
                    request.ToLatitude,
                    request.ToLongitude,
                    request.Description,
                    request.CreatedAt,
                    Distance = 0.0 // Will be calculated for each operator
                };

                foreach (var op in operatorsWithDistance)
                {
                    var operatorNotification = new
                    {
                        notificationData.Id,
                        notificationData.PhoneNumber,
                        notificationData.FromLatitude,
                        notificationData.FromLongitude,
                        notificationData.ToLatitude,
                        notificationData.ToLongitude,
                        notificationData.Description,
                        notificationData.CreatedAt,
                        Distance = Math.Round(op.Distance, 1)
                    };

                    // Send notification via SignalR (for active connections)
                    await hub.Clients.Group($"operator-{op.Operator.Id}").SendAsync("NewRequest", operatorNotification);

                    // Send Web Push notification (works even when tab is closed)
                    var pushPayload = new
                    {
                        title = "AutoSOS - Nowe zgłoszenie",
                        body = $"Nowe zgłoszenie w odległości {Math.Round(op.Distance, 1)} km",
                        requestId = request.Id.ToString(),
                        distance = Math.Round(op.Distance, 1),
                        phoneNumber = request.PhoneNumber
                    };

                    await _webPushService.SendNotificationToOperatorAsync(db, op.Operator.Id, pushPayload);
                }

                _logger.LogInformation($"Sent notifications for request {request.Id} to {operatorsWithDistance.Count} operators (expansion {expansionNumber})");
            }
        }
    }

    // ========================================
    // TODO: TEMPORARY - Mock offers - to be removed when real operators are available
    // ========================================
    private async Task CreateMockOfferAsync(
        AutoSOSDbContext db,
        IHubContext<RequestHub> hub,
        Request request,
        CancellationToken cancellationToken)
    {
        try
        {
            // Find nearest available operator
            var operators = await db.Operators
                .Where(o => o.IsAvailable && o.CurrentLatitude.HasValue && o.CurrentLongitude.HasValue)
                .ToListAsync(cancellationToken);

            if (!operators.Any())
            {
                _logger.LogWarning($"No available operators for mock offer on request {request.Id}");
                return;
            }

            var operatorsWithDistance = operators
                .Select(op => new
                {
                    Operator = op,
                    Distance = GeolocationService.CalculateDistance(
                        request.FromLatitude,
                        request.FromLongitude,
                        op.CurrentLatitude!.Value,
                        op.CurrentLongitude!.Value
                    )
                })
                .Where(op => op.Distance <= (op.Operator.ServiceRadiusKm ?? 20))
                .OrderBy(op => op.Distance)
                .FirstOrDefault();

            if (operatorsWithDistance == null)
            {
                _logger.LogWarning($"No operators in range for mock offer on request {request.Id}");
                return;
            }

            var operator_ = operatorsWithDistance.Operator;
            var random = new Random();
            
            // Random price between 100 and 300 PLN
            var price = (decimal)(100 + random.NextDouble() * 200);
            // Random time between 15 and 45 minutes
            var estimatedTime = 15 + random.Next(30);

            var offer = new Offer
            {
                Id = Guid.NewGuid(),
                RequestId = request.Id,
                OperatorId = operator_.Id,
                Price = Math.Round(price, 2),
                EstimatedTimeMinutes = estimatedTime,
                Status = OfferStatus.Proposed,
                CreatedAt = DateTime.UtcNow
            };

            db.Offers.Add(offer);
            request.Status = RequestStatus.OfferReceived;
            request.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);

            // Notify client via SignalR
            await hub.Clients.Group($"request-{request.Id}").SendAsync("OfferReceived", new
            {
                offer.Id,
                offer.Price,
                offer.EstimatedTimeMinutes,
                OperatorName = operator_.Name
            });

            _logger.LogInformation($"Created mock offer for request {request.Id} from operator {operator_.Name}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error creating mock offer for request {request.Id}");
        }
    }
    // ========================================
    // END OF TEMPORARY CODE - Mock offers
    // ========================================
}

