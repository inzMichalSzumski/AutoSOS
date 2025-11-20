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
        // Więcej operatorów w okolicach Warszawy
        var operatorsData = new[]
        {
            // Centrum Warszawy
            new { Name = "Laweta Express", Phone = "+48 123 456 789", VehicleType = "Laweta", Lat = 52.2297, Lng = 21.0122, Available = true, Radius = 25 },
            new { Name = "Pomoc Drogowa 24h", Phone = "+48 987 654 321", VehicleType = "Laweta", Lat = 52.2370, Lng = 21.0175, Available = true, Radius = 30 },
            new { Name = "Auto Serwis Warszawa", Phone = "+48 555 123 456", VehicleType = "Mechanik", Lat = 52.2500, Lng = 21.0000, Available = true, Radius = 20 },
            new { Name = "Laweta Premium", Phone = "+48 600 700 800", VehicleType = "Laweta", Lat = 52.2000, Lng = 21.0300, Available = true, Radius = 35 },
            
            // Północ Warszawy
            new { Name = "Pomoc Drogowa Bielany", Phone = "+48 501 234 567", VehicleType = "Laweta", Lat = 52.2800, Lng = 20.9500, Available = true, Radius = 25 },
            new { Name = "Laweta Żoliborz", Phone = "+48 502 345 678", VehicleType = "Laweta", Lat = 52.2700, Lng = 20.9800, Available = true, Radius = 20 },
            new { Name = "Auto Pomoc Mokotów", Phone = "+48 503 456 789", VehicleType = "Mechanik", Lat = 52.1900, Lng = 21.0100, Available = true, Radius = 30 },
            
            // Wschód Warszawy
            new { Name = "Laweta Praga", Phone = "+48 504 567 890", VehicleType = "Laweta", Lat = 52.2400, Lng = 21.0500, Available = true, Radius = 25 },
            new { Name = "Pomoc Drogowa Targówek", Phone = "+48 505 678 901", VehicleType = "Laweta", Lat = 52.2600, Lng = 21.0600, Available = true, Radius = 22 },
            new { Name = "Auto Serwis Wawer", Phone = "+48 506 789 012", VehicleType = "Mechanik", Lat = 52.2100, Lng = 21.1500, Available = true, Radius = 28 },
            
            // Południe Warszawy
            new { Name = "Laweta Ursynów", Phone = "+48 507 890 123", VehicleType = "Laweta", Lat = 52.1500, Lng = 21.0500, Available = true, Radius = 25 },
            new { Name = "Pomoc Drogowa Wilanów", Phone = "+48 508 901 234", VehicleType = "Laweta", Lat = 52.1600, Lng = 21.0900, Available = true, Radius = 30 },
            new { Name = "Auto Pomoc Włochy", Phone = "+48 509 012 345", VehicleType = "Mechanik", Lat = 52.1800, Lng = 20.9500, Available = true, Radius = 20 },
            
            // Zachód Warszawy
            new { Name = "Laweta Ochota", Phone = "+48 510 123 456", VehicleType = "Laweta", Lat = 52.2200, Lng = 20.9800, Available = true, Radius = 25 },
            new { Name = "Pomoc Drogowa Wola", Phone = "+48 511 234 567", VehicleType = "Laweta", Lat = 52.2300, Lng = 20.9600, Available = true, Radius = 22 },
            new { Name = "Auto Serwis Bemowo", Phone = "+48 512 345 678", VehicleType = "Mechanik", Lat = 52.2500, Lng = 20.9200, Available = true, Radius = 25 },
            
            // Okolice Warszawy
            new { Name = "Laweta Pruszków", Phone = "+48 513 456 789", VehicleType = "Laweta", Lat = 52.1700, Lng = 20.8000, Available = true, Radius = 30 },
            new { Name = "Pomoc Drogowa Otwock", Phone = "+48 514 567 890", VehicleType = "Laweta", Lat = 52.1100, Lng = 21.2600, Available = true, Radius = 25 },
            new { Name = "Auto Pomoc Piaseczno", Phone = "+48 515 678 901", VehicleType = "Mechanik", Lat = 52.0800, Lng = 21.0200, Available = true, Radius = 28 }
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

