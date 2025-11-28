namespace AutoSOS.Api.Models;

/// <summary>
/// Represents a Web Push subscription for an operator
/// </summary>
public class PushSubscription
{
    public Guid Id { get; set; }

    public Guid OperatorId { get; set; }

    public Operator Operator { get; set; } = null!;

    /// <summary>
    /// Push subscription endpoint URL
    /// </summary>
    public string Endpoint { get; set; } = string.Empty;

    /// <summary>
    /// P256DH key for encryption
    /// </summary>
    public string P256dhKey { get; set; } = string.Empty;

    /// <summary>
    /// Auth secret for encryption
    /// </summary>
    public string AuthKey { get; set; } = string.Empty;

    /// <summary>
    /// When the subscription was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the subscription was last used successfully
    /// </summary>
    public DateTime? LastUsedAt { get; set; }

    /// <summary>
    /// Whether the subscription is still active
    /// </summary>
    public bool IsActive { get; set; } = true;
}

