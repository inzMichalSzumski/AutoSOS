namespace AutoSOS.Api.Models;

public class Equipment
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "Jumpstarter", "Mobile tire service", "Tow truck"
    public string Description { get; set; } = string.Empty; // Description of equipment/service
    public bool RequiresTransport { get; set; } = false; // Whether this equipment requires vehicle transport (true for tow truck)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// Junction table for many-to-many relationship
public class OperatorEquipment
{
    public Guid OperatorId { get; set; }
    public Operator Operator { get; set; } = null!;
    
    public Guid EquipmentId { get; set; }
    public Equipment Equipment { get; set; } = null!;
}

