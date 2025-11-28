using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.Models;
using System.Text.Json;
using WebPush;

namespace AutoSOS.Api.Services;

/// <summary>
/// Service for sending Web Push notifications
/// Implements the Web Push Protocol (RFC 8030)
/// </summary>
public class WebPushService
{
    private readonly ILogger<WebPushService> _logger;
    private readonly IConfiguration _configuration;
    private readonly WebPushClient _webPushClient;

    // VAPID keys - should be generated once and stored in configuration
    // Generate real VAPID keys using: npx web-push generate-vapid-keys
    private readonly string _vapidPublicKey;
    private readonly string _vapidPrivateKey;
    private readonly string _vapidSubject;

    public WebPushService(
        ILogger<WebPushService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _webPushClient = new WebPushClient();

        // Load VAPID keys from configuration
        _vapidPublicKey = _configuration["WebPush:VapidPublicKey"] ?? string.Empty;
        _vapidPrivateKey = _configuration["WebPush:VapidPrivateKey"] ?? string.Empty;
        _vapidSubject = _configuration["WebPush:VapidSubject"] ?? "mailto:operator@autosos.pl";
    }

    /// <summary>
    /// Send push notification to specific operator
    /// </summary>
    /// <param name="db">Database context</param>
    /// <param name="operatorId">Operator ID to send notification to</param>
    /// <param name="notificationData">Notification payload</param>
    /// <param name="saveChanges">Whether to save changes to database immediately (default: true)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if notification was sent successfully to at least one subscription</returns>
    public async Task<bool> SendNotificationToOperatorAsync(
        AutoSOSDbContext db,
        Guid operatorId,
        object notificationData,
        bool saveChanges = true,
        CancellationToken cancellationToken = default)
    {
        var subscriptions = await db.PushSubscriptions
            .Where(ps => ps.OperatorId == operatorId && ps.IsActive)
            .ToListAsync(cancellationToken);

        if (!subscriptions.Any())
        {
            _logger.LogWarning($"No active push subscriptions found for operator {operatorId}");
            return false;
        }

        var success = false;
        foreach (var subscription in subscriptions)
        {
            try
            {
                var sent = await SendPushNotificationAsync(subscription, notificationData, cancellationToken);
                if (sent)
                {
                    subscription.LastUsedAt = DateTime.UtcNow;
                    success = true;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending push notification to subscription {subscription.Id}");
                
                // If subscription is invalid (410 Gone), mark as inactive
                if (ex.Message.Contains("410"))
                {
                    subscription.IsActive = false;
                }
            }
        }

        if (saveChanges)
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        return success;
    }

    /// <summary>
    /// Send push notification to multiple operators
    /// Batches database saves for efficiency - only saves once after all notifications are sent
    /// </summary>
    /// <param name="db">Database context</param>
    /// <param name="operatorIds">Collection of operator IDs to send notifications to</param>
    /// <param name="notificationData">Notification payload</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of operators successfully notified</returns>
    public async Task<int> SendNotificationToOperatorsAsync(
        AutoSOSDbContext db,
        IEnumerable<Guid> operatorIds,
        object notificationData,
        CancellationToken cancellationToken = default)
    {
        var successCount = 0;

        // Send to all operators without saving changes after each one
        foreach (var operatorId in operatorIds)
        {
            var sent = await SendNotificationToOperatorAsync(db, operatorId, notificationData, saveChanges: false, cancellationToken);
            if (sent)
            {
                successCount++;
            }
        }

        // Save all changes once at the end
        await db.SaveChangesAsync(cancellationToken);

        return successCount;
    }

    /// <summary>
    /// Send push notification to a specific subscription
    /// </summary>
    private async Task<bool> SendPushNotificationAsync(
        Models.PushSubscription subscription,
        object payload,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_vapidPublicKey) || string.IsNullOrEmpty(_vapidPrivateKey))
        {
            _logger.LogWarning("VAPID keys not configured. Push notifications will not be sent.");
            return false;
        }

        try
        {
            var payloadJson = JsonSerializer.Serialize(payload);
            
            // Create push subscription object for WebPush library
            var pushSubscription = new WebPush.PushSubscription(
                subscription.Endpoint,
                subscription.P256dhKey,
                subscription.AuthKey
            );

            // Create VAPID details
            var vapidDetails = new VapidDetails(
                _vapidSubject,
                _vapidPublicKey,
                _vapidPrivateKey
            );

            // Send the push notification
            // Note: WebPush library doesn't support CancellationToken in SendNotificationAsync
            await _webPushClient.SendNotificationAsync(
                pushSubscription,
                payloadJson,
                vapidDetails
            );

            _logger.LogInformation($"Successfully sent push notification to {subscription.Endpoint}");
            return true;
        }
        catch (WebPushException ex)
        {
            _logger.LogError(ex, $"WebPush error sending notification to {subscription.Endpoint}. Status: {ex.StatusCode}");
            
            // If subscription is invalid (410 Gone or 404 Not Found), throw to mark as inactive
            if (ex.StatusCode == System.Net.HttpStatusCode.Gone || 
                ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new Exception($"410 - Subscription no longer valid", ex);
            }
            
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error sending push notification to {subscription.Endpoint}");
            return false;
        }
    }
}

