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
    private const int InitialNotificationCount = 15; // Najbliższych 15 operatorów
    private const int ExpandNotificationCount = 10; // Kolejnych 10 przy rozszerzeniu
    private const int NotificationTimeoutSeconds = 30; // 30 sekund na odpowiedź
    private const int MaxExpansions = 3; // Maksymalnie 3 rozszerzenia (15 + 10 + 10 + 10 = 45 operatorów)

    public RequestNotificationService(
        IServiceProvider serviceProvider,
        ILogger<RequestNotificationService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingRequestsAsync(stoppingToken);
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); // Sprawdzaj co 5 sekund
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

        // Znajdź zgłoszenia, które są w stanie Searching i nie mają jeszcze ofert
        var activeRequests = await db.Requests
            .Where(r => r.Status == RequestStatus.Searching)
            .ToListAsync(cancellationToken);

        foreach (var request in activeRequests)
        {
            var timeSinceCreation = DateTime.UtcNow - request.CreatedAt;
            var secondsSinceCreation = (int)timeSinceCreation.TotalSeconds;

            // Sprawdź czy zgłoszenie ma już ofertę
            var hasOffer = await db.Offers.AnyAsync(o => o.RequestId == request.Id && o.Status == OfferStatus.Proposed, cancellationToken);
            
            if (hasOffer)
            {
                // Zgłoszenie ma ofertę, nie rozszerzaj powiadomień
                continue;
            }

            // Oblicz ile rozszerzeń już było (na podstawie czasu)
            var expansionNumber = secondsSinceCreation / NotificationTimeoutSeconds;

            if (expansionNumber > MaxExpansions)
            {
                // Timeout - brak możliwości wezwania pomocy
                request.Status = RequestStatus.Cancelled;
                await db.SaveChangesAsync(cancellationToken);

                // Powiadom klienta o timeout
                await hub.Clients.Group($"request-{request.Id}").SendAsync("RequestTimeout", new
                {
                    request.Id,
                    message = "Nie udało się znaleźć dostępnej pomocy. Spróbuj ponownie później."
                });

                _logger.LogInformation($"Request {request.Id} timed out after {expansionNumber} expansions");
                continue;
            }

            // Sprawdź czy trzeba wysłać powiadomienia
            var operatorsToNotify = InitialNotificationCount + (expansionNumber * ExpandNotificationCount);
            
            // Pobierz operatorów w promieniu
            var operators = await db.Operators
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
                    )
                })
                .Where(op => op.Distance <= (op.Operator.ServiceRadiusKm ?? 20))
                .OrderBy(op => op.Distance)
                .Take(operatorsToNotify)
                .ToList();

            // Wyślij powiadomienia do operatorów (tylko jeśli to pierwsze powiadomienie lub rozszerzenie)
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
                    Distance = 0.0 // Będzie obliczone dla każdego operatora
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

                    // Wyślij powiadomienie do konkretnego operatora
                    await hub.Clients.Group($"operator-{op.Operator.Id}").SendAsync("NewRequest", operatorNotification);
                }

                _logger.LogInformation($"Sent notifications for request {request.Id} to {operatorsWithDistance.Count} operators (expansion {expansionNumber})");
            }
        }
    }
}

