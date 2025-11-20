namespace AutoSOS.Api.Models;

public class Equipment
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty; // np. "Jumpstarter", "Mobilna wulkanizacja", "Laweta"
    public string Description { get; set; } = string.Empty; // Opis sprzętu/usługi
    public bool RequiresTransport { get; set; } = false; // Czy ten sprzęt wymaga transportu samochodu (true dla lawety)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// Tabela pośrednicząca dla relacji many-to-many
public class OperatorEquipment
{
    public Guid OperatorId { get; set; }
    public Operator Operator { get; set; } = null!;
    
    public Guid EquipmentId { get; set; }
    public Equipment Equipment { get; set; } = null!;
}

