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
    public async Task<bool> SendNotificationToOperatorAsync(
        AutoSOSDbContext db,
        Guid operatorId,
        object notificationData)
    {
        var subscriptions = await db.PushSubscriptions
            .Where(ps => ps.OperatorId == operatorId && ps.IsActive)
            .ToListAsync();

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
                var sent = await SendPushNotificationAsync(subscription, notificationData);
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

        await db.SaveChangesAsync();
        return success;
    }

    /// <summary>
    /// Send push notification to multiple operators
    /// </summary>
    public async Task<int> SendNotificationToOperatorsAsync(
        AutoSOSDbContext db,
        IEnumerable<Guid> operatorIds,
        object notificationData)
    {
        var successCount = 0;

        foreach (var operatorId in operatorIds)
        {
            var sent = await SendNotificationToOperatorAsync(db, operatorId, notificationData);
            if (sent)
            {
                successCount++;
            }
        }

        return successCount;
    }

    /// <summary>
    /// Send push notification to a specific subscription
    /// </summary>
    private async Task<bool> SendPushNotificationAsync(
        Models.PushSubscription subscription,
        object payload)
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

