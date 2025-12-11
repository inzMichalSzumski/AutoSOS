using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Models;

namespace AutoSOS.Api.Data;

public static class DatabaseInitializer
{
    /// <summary>
    /// Applies pending migrations and seeds initial data if needed
    /// </summary>
    public static async Task InitializeAsync(AutoSOSDbContext db, CancellationToken cancellationToken = default)
    {
        // Apply pending migrations (Code First approach)
        await db.Database.MigrateAsync(cancellationToken);
        
        // Seed equipment if database is empty
        if (!await db.Equipment.AnyAsync(cancellationToken))
        {
            await SeedEquipmentAsync(db, cancellationToken);
        }
        
        // NOTE: Operators are no longer seeded - they must register through the application
    }
    
    private static async Task SeedEquipmentAsync(AutoSOSDbContext db, CancellationToken cancellationToken = default)
    {
        // Seed standard equipment types
        var equipmentData = new[]
        {
            new { Name = "Rozruch", Description = "Do rozładowanego akumulatora - pomoc na miejscu", RequiresTransport = false },
            new { Name = "Mobilna wulkanizacja", Description = "Do przebitych opon - naprawa na miejscu", RequiresTransport = false },
            new { Name = "Laweta", Description = "Do transportu samochodu - wymaga transportu", RequiresTransport = true },
            new { Name = "Ładowanie elektryka", Description = "Ładowanie pojazdów elektrycznych - pomoc na miejscu", RequiresTransport = false }
        };
        
        foreach (var data in equipmentData)
        {
            var equipment = new Equipment
            {
                Id = Guid.NewGuid(),
                Name = data.Name,
                Description = data.Description,
                RequiresTransport = data.RequiresTransport,
                CreatedAt = DateTime.UtcNow
            };
            
            db.Equipment.Add(equipment);
        }
        
        await db.SaveChangesAsync(cancellationToken);
        Console.WriteLine($"✅ Seeded {equipmentData.Length} equipment types to database");
    }
}

