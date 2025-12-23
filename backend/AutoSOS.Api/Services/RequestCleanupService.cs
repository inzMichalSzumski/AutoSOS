using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.Models;

namespace AutoSOS.Api.Services;

/// <summary>
/// Background service that cleans up old completed/cancelled requests
/// </summary>
public class RequestCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RequestCleanupService> _logger;
    private const int CleanupIntervalHours = 1; // Run cleanup every hour
    private const int RequestRetentionHours = 24; // Keep requests for 24 hours after completion

    public RequestCleanupService(
        IServiceProvider serviceProvider,
        ILogger<RequestCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait 5 minutes before first cleanup to avoid startup overhead
        await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupOldRequestsAsync(stoppingToken);
                await Task.Delay(TimeSpan.FromHours(CleanupIntervalHours), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RequestCleanupService");
                await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
            }
        }
    }

    private async Task CleanupOldRequestsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoSOSDbContext>();

        var cutoffTime = DateTime.UtcNow.AddHours(-RequestRetentionHours);

        // Find old completed or cancelled requests
        var oldRequests = await db.Requests
            .Where(r => (r.Status == RequestStatus.Completed || r.Status == RequestStatus.Cancelled)
                     && r.UpdatedAt.HasValue 
                     && r.UpdatedAt.Value < cutoffTime)
            .ToListAsync(cancellationToken);

        if (oldRequests.Any())
        {
            _logger.LogInformation(
                "Cleaning up {Count} old requests (older than {Hours} hours)",
                oldRequests.Count,
                RequestRetentionHours);

            // Delete associated offers first (due to foreign key constraints)
            var requestIds = oldRequests.Select(r => r.Id).ToList();
            var oldOffers = await db.Offers
                .Where(o => requestIds.Contains(o.RequestId))
                .ToListAsync(cancellationToken);

            db.Offers.RemoveRange(oldOffers);
            db.Requests.RemoveRange(oldRequests);

            await db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Successfully cleaned up {RequestCount} requests and {OfferCount} offers",
                oldRequests.Count,
                oldOffers.Count);
        }
        else
        {
            _logger.LogDebug("No old requests to clean up");
        }
    }
}

