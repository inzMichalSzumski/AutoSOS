using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Models;

namespace AutoSOS.Api.Data;

public static class DatabaseInitializer
{
    /// <summary>
    /// Applies pending migrations and seeds initial data if needed
    /// </summary>
    public static async Task InitializeAsync(AutoSOSDbContext db)
    {
        // Apply pending migrations (Code First approach)
        await db.Database.MigrateAsync();
        
        // Seed operators if database is empty
        if (!await db.Operators.AnyAsync())
        {
            await SeedOperatorsAsync(db);
        }
    }
    
    private static async Task SeedOperatorsAsync(AutoSOSDbContext db)
    {
        var operatorsData = new[]
        {
            new { Name = "Laweta Express", Phone = "+48 123 456 789", VehicleType = "Laweta", Lat = 52.2297, Lng = 21.0122, Available = true, Radius = 25 },
            new { Name = "Pomoc Drogowa 24h", Phone = "+48 987 654 321", VehicleType = "Laweta", Lat = 52.2370, Lng = 21.0175, Available = true, Radius = 30 },
            new { Name = "Auto Serwis Warszawa", Phone = "+48 555 123 456", VehicleType = "Mechanik", Lat = 52.2500, Lng = 21.0000, Available = true, Radius = 20 },
            new { Name = "Laweta Premium", Phone = "+48 600 700 800", VehicleType = "Laweta", Lat = 52.2000, Lng = 21.0300, Available = true, Radius = 35 },
            new { Name = "Pomoc Drogowa Express", Phone = "+48 501 234 567", VehicleType = "Laweta", Lat = 52.2600, Lng = 21.0500, Available = false, Radius = 25 }
        };
        
        // Create User and Operator for each entry
        foreach (var data in operatorsData)
        {
            var userId = Guid.NewGuid();
            
            var user = new User
            {
                Id = userId,
                PhoneNumber = data.Phone,
                Email = $"operator_{data.Name.Replace(" ", "_").ToLower()}@autosos.pl",
                Role = UserRole.Operator,
                IsVerified = true,
                CreatedAt = DateTime.UtcNow
            };
            
            var operatorEntity = new Operator
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = data.Name,
                Phone = data.Phone,
                VehicleType = data.VehicleType,
                CurrentLatitude = data.Lat,
                CurrentLongitude = data.Lng,
                IsAvailable = data.Available,
                ServiceRadiusKm = data.Radius,
                CreatedAt = DateTime.UtcNow
            };
            
            db.Users.Add(user);
            db.Operators.Add(operatorEntity);
        }
        
        await db.SaveChangesAsync();
        Console.WriteLine($"✅ Seeded {operatorsData.Length} operators to database");
    }
}

