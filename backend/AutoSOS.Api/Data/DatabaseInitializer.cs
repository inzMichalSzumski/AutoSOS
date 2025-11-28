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
        
        // Seed equipment if database is empty
        if (!await db.Equipment.AnyAsync())
        {
            await SeedEquipmentAsync(db);
        }
        
        // Seed operators if database is empty
        if (!await db.Operators.AnyAsync())
        {
            await SeedOperatorsAsync(db);
        }
    }
    
    private static async Task SeedEquipmentAsync(AutoSOSDbContext db)
    {
        // ========================================
        // TODO: TEMPORARY - Seed data for equipment - to be removed when real data is available
        // ========================================
        
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
        
        await db.SaveChangesAsync();
        Console.WriteLine($"✅ Seeded {equipmentData.Length} equipment types to database");
        
        // ========================================
        // END OF TEMPORARY CODE - Seed data for equipment
        // ========================================
    }
    
    private static async Task SeedOperatorsAsync(AutoSOSDbContext db)
    {
        // ========================================
        // TODO: TEMPORARY - Seed data for operators - to be removed when real operators are available
        // ========================================
        
        // More operators around Warsaw
        var operatorsData = new[]
        {
            // Warsaw city center
            new { Name = "Laweta Express", Phone = "+48 123 456 789", VehicleType = "Laweta", Lat = 52.2297, Lng = 21.0122, Available = true, Radius = 25 },
            new { Name = "Pomoc Drogowa 24h", Phone = "+48 987 654 321", VehicleType = "Laweta", Lat = 52.2370, Lng = 21.0175, Available = true, Radius = 30 },
            new { Name = "Auto Serwis Warszawa", Phone = "+48 555 123 456", VehicleType = "Mechanik", Lat = 52.2500, Lng = 21.0000, Available = true, Radius = 20 },
            new { Name = "Laweta Premium", Phone = "+48 600 700 800", VehicleType = "Laweta", Lat = 52.2000, Lng = 21.0300, Available = true, Radius = 35 },
            
            // North Warsaw
            new { Name = "Pomoc Drogowa Bielany", Phone = "+48 501 234 567", VehicleType = "Laweta", Lat = 52.2800, Lng = 20.9500, Available = true, Radius = 25 },
            new { Name = "Laweta Żoliborz", Phone = "+48 502 345 678", VehicleType = "Laweta", Lat = 52.2700, Lng = 20.9800, Available = true, Radius = 20 },
            new { Name = "Auto Pomoc Mokotów", Phone = "+48 503 456 789", VehicleType = "Mechanik", Lat = 52.1900, Lng = 21.0100, Available = true, Radius = 30 },
            
            // East Warsaw
            new { Name = "Laweta Praga", Phone = "+48 504 567 890", VehicleType = "Laweta", Lat = 52.2400, Lng = 21.0500, Available = true, Radius = 25 },
            new { Name = "Pomoc Drogowa Targówek", Phone = "+48 505 678 901", VehicleType = "Laweta", Lat = 52.2600, Lng = 21.0600, Available = true, Radius = 22 },
            new { Name = "Auto Serwis Wawer", Phone = "+48 506 789 012", VehicleType = "Mechanik", Lat = 52.2100, Lng = 21.1500, Available = true, Radius = 28 },
            
            // South Warsaw
            new { Name = "Laweta Ursynów", Phone = "+48 507 890 123", VehicleType = "Laweta", Lat = 52.1500, Lng = 21.0500, Available = true, Radius = 25 },
            new { Name = "Pomoc Drogowa Wilanów", Phone = "+48 508 901 234", VehicleType = "Laweta", Lat = 52.1600, Lng = 21.0900, Available = true, Radius = 30 },
            new { Name = "Auto Pomoc Włochy", Phone = "+48 509 012 345", VehicleType = "Mechanik", Lat = 52.1800, Lng = 20.9500, Available = true, Radius = 20 },
            
            // West Warsaw
            new { Name = "Laweta Ochota", Phone = "+48 510 123 456", VehicleType = "Laweta", Lat = 52.2200, Lng = 20.9800, Available = true, Radius = 25 },
            new { Name = "Pomoc Drogowa Wola", Phone = "+48 511 234 567", VehicleType = "Laweta", Lat = 52.2300, Lng = 20.9600, Available = true, Radius = 22 },
            new { Name = "Auto Serwis Bemowo", Phone = "+48 512 345 678", VehicleType = "Mechanik", Lat = 52.2500, Lng = 20.9200, Available = true, Radius = 25 },
            
            // Warsaw area
            new { Name = "Laweta Pruszków", Phone = "+48 513 456 789", VehicleType = "Laweta", Lat = 52.1700, Lng = 20.8000, Available = true, Radius = 30 },
            new { Name = "Pomoc Drogowa Otwock", Phone = "+48 514 567 890", VehicleType = "Laweta", Lat = 52.1100, Lng = 21.2600, Available = true, Radius = 25 },
            new { Name = "Auto Pomoc Piaseczno", Phone = "+48 515 678 901", VehicleType = "Mechanik", Lat = 52.0800, Lng = 21.0200, Available = true, Radius = 28 },
            
            // Otwock area - more operators
            new { Name = "Laweta Otwock Centrum", Phone = "+48 516 789 012", VehicleType = "Laweta", Lat = 52.1050, Lng = 21.2700, Available = true, Radius = 30 },
            new { Name = "Pomoc Drogowa Otwock 24h", Phone = "+48 517 890 123", VehicleType = "Laweta", Lat = 52.1150, Lng = 21.2500, Available = true, Radius = 25 },
            new { Name = "Auto Serwis Otwock", Phone = "+48 518 901 234", VehicleType = "Mechanik", Lat = 52.1000, Lng = 21.2800, Available = true, Radius = 28 },
            new { Name = "Laweta Express Otwock", Phone = "+48 519 012 345", VehicleType = "Laweta", Lat = 52.1200, Lng = 21.2400, Available = true, Radius = 30 },
            new { Name = "Pomoc Drogowa Karczew", Phone = "+48 520 123 456", VehicleType = "Laweta", Lat = 52.0800, Lng = 21.2500, Available = true, Radius = 25 },
            new { Name = "Auto Pomoc Józefów", Phone = "+48 521 234 567", VehicleType = "Mechanik", Lat = 52.1400, Lng = 21.2300, Available = true, Radius = 28 },
            
            // Janów near Otwock
            new { Name = "Pomoc Drogowa Janów", Phone = "+48 522 345 678", VehicleType = "Laweta", Lat = 52.0850, Lng = 21.2650, Available = true, Radius = 30 },
            new { Name = "Auto Serwis Janów", Phone = "+48 523 456 789", VehicleType = "Mechanik", Lat = 52.0900, Lng = 21.2600, Available = true, Radius = 25 }
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
            
            // Determine available equipment based on vehicle type
            var allEquipment = await db.Equipment.ToListAsync();
            var equipmentToAssign = new List<Equipment>();
            
            if (data.VehicleType == "Laweta")
            {
                // Tow truck has all equipment types
                equipmentToAssign = allEquipment.ToList();
            }
            else if (data.VehicleType == "Mechanik")
            {
                // Mechanic has jumpstarter and mobile tire service
                equipmentToAssign = allEquipment
                    .Where(e => e.Name == "Rozruch" || e.Name == "Mobilna wulkanizacja")
                    .ToList();
            }
            else if (data.VehicleType == "Elektryk samochodowy")
            {
                // Electrician has only jumpstarter
                equipmentToAssign = allEquipment
                    .Where(e => e.Name == "Rozruch")
                    .ToList();
            }
            
            // Assign equipment to operator
            foreach (var equipment in equipmentToAssign)
            {
                operatorEntity.OperatorEquipment.Add(new OperatorEquipment
                {
                    OperatorId = operatorEntity.Id,
                    EquipmentId = equipment.Id
                });
            }
            
            db.Users.Add(user);
            db.Operators.Add(operatorEntity);
        }
        
        await db.SaveChangesAsync();
        Console.WriteLine($"✅ Seeded {operatorsData.Length} operators to database");
        
        // ========================================
        // END OF TEMPORARY CODE - Seed data
        // ========================================
    }
}

