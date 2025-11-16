namespace AutoSOS.Api.Models;

public class Operator
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string VehicleType { get; set; } = string.Empty; // "Laweta", "Mechanik", etc.
    public double? CurrentLatitude { get; set; }
    public double? CurrentLongitude { get; set; }
    public bool IsAvailable { get; set; } = true;
    public int? ServiceRadiusKm { get; set; } = 20; // Domyślnie 20 km
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

