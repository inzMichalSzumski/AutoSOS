using System.ComponentModel.DataAnnotations;

namespace AutoSOS.Api.Models;

public class Offer
{
    public Guid Id { get; set; }
    public Guid RequestId { get; set; }
    public Request Request { get; set; } = null!;
    public Guid OperatorId { get; set; }
    public Operator Operator { get; set; } = null!;
    public decimal Price { get; set; }
    public int? EstimatedTimeMinutes { get; set; }
    public OfferStatus Status { get; set; } = OfferStatus.Proposed;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
    
    /// <summary>
    /// Row version for optimistic concurrency control.
    /// Automatically updated by SQL Server on each UPDATE.
    /// </summary>
    [Timestamp]
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}

public enum OfferStatus
{
    Proposed = 0,
    Accepted = 1,
    Rejected = 2,
    Cancelled = 3
}

