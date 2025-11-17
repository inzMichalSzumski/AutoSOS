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
        var operators = new[]
        {
            new Operator
            {
                Id = Guid.NewGuid(),
                Name = "Laweta Express",
                Phone = "+48 123 456 789",
                VehicleType = "Laweta",
                CurrentLatitude = 52.2297, // Warszawa centrum
                CurrentLongitude = 21.0122,
                IsAvailable = true,
                ServiceRadiusKm = 25,
                CreatedAt = DateTime.UtcNow
            },
            new Operator
            {
                Id = Guid.NewGuid(),
                Name = "Pomoc Drogowa 24h",
                Phone = "+48 987 654 321",
                VehicleType = "Laweta",
                CurrentLatitude = 52.2370, // Warszawa, okolice
                CurrentLongitude = 21.0175,
                IsAvailable = true,
                ServiceRadiusKm = 30,
                CreatedAt = DateTime.UtcNow
            },
            new Operator
            {
                Id = Guid.NewGuid(),
                Name = "Auto Serwis Warszawa",
                Phone = "+48 555 123 456",
                VehicleType = "Mechanik",
                CurrentLatitude = 52.2500, // Warszawa północ
                CurrentLongitude = 21.0000,
                IsAvailable = true,
                ServiceRadiusKm = 20,
                CreatedAt = DateTime.UtcNow
            },
            new Operator
            {
                Id = Guid.NewGuid(),
                Name = "Laweta Premium",
                Phone = "+48 600 700 800",
                VehicleType = "Laweta",
                CurrentLatitude = 52.2000, // Warszawa południe
                CurrentLongitude = 21.0300,
                IsAvailable = true,
                ServiceRadiusKm = 35,
                CreatedAt = DateTime.UtcNow
            },
            new Operator
            {
                Id = Guid.NewGuid(),
                Name = "Pomoc Drogowa Express",
                Phone = "+48 501 234 567",
                VehicleType = "Laweta",
                CurrentLatitude = 52.2600, // Warszawa wschód
                CurrentLongitude = 21.0500,
                IsAvailable = false, // Niedostępny dla testów
                ServiceRadiusKm = 25,
                CreatedAt = DateTime.UtcNow
            }
        };
        
        // Create User for each operator
        foreach (var op in operators)
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                PhoneNumber = op.Phone,
                Email = $"operator_{op.Name.Replace(" ", "_").ToLower()}@autosos.pl",
                Role = UserRole.Operator,
                IsVerified = true,
                CreatedAt = DateTime.UtcNow
            };
            
            db.Users.Add(user);
            op.UserId = user.Id;
            db.Operators.Add(op);
        }
        
        await db.SaveChangesAsync();
        Console.WriteLine($"✅ Seeded {operators.Length} operators to database");
    }
}

