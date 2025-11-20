namespace AutoSOS.Api.Models;

public class Request
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string PhoneNumber { get; set; } = string.Empty;
    public double FromLatitude { get; set; }
    public double FromLongitude { get; set; }
    public double? ToLatitude { get; set; }
    public double? ToLongitude { get; set; }
    public string? Description { get; set; }
    public Guid? RequiredEquipmentId { get; set; } // ID of equipment/service required for this request
    public Equipment? RequiredEquipment { get; set; } // Navigation property
    public RequestStatus Status { get; set; } = RequestStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public enum RequestStatus
{
    Pending = 0,
    Searching = 1,
    OfferReceived = 2,
    Accepted = 3,
    OnTheWay = 4,
    Completed = 5,
    Cancelled = 6
}

