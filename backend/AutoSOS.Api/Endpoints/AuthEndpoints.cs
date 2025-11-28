using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AutoSOS.Api.Data;
using AutoSOS.Api.DTOs;
using AutoSOS.Api.Models;

namespace AutoSOS.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Authentication")
            .WithOpenApi();

        // POST /api/auth/register - Register operator
        group.MapPost("/register", async (
            RegisterOperatorDto dto,
            AutoSOSDbContext db,
            CancellationToken cancellationToken) =>
        {
            // Validation
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return Results.BadRequest(new { error = "Email and password are required" });
            }

            if (dto.Password.Length < 6)
            {
                return Results.BadRequest(new { error = "Password must be at least 6 characters" });
            }

            // Check if email is already taken
            if (await db.Users.AnyAsync(u => u.Email == dto.Email))
            {
                return Results.BadRequest(new { error = "Email already exists" });
            }

            // Hash password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            // Create user
            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = dto.Email,
                PhoneNumber = dto.Phone,
                PasswordHash = passwordHash,
                Role = UserRole.Operator,
                CreatedAt = DateTime.UtcNow,
                IsVerified = true // Operators are automatically verified
            };

            // Create operator
            var operatorEntity = new Operator
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Name = dto.Name,
                Phone = dto.Phone,
                VehicleType = dto.VehicleType,
                ServiceRadiusKm = dto.ServiceRadiusKm ?? 20,
                IsAvailable = false, // Unavailable by default
                CreatedAt = DateTime.UtcNow
            };

            // Add equipment to operator
            if (dto.EquipmentIds != null && dto.EquipmentIds.Any())
            {
                var equipment = await db.Equipment
                    .Where(e => dto.EquipmentIds.Contains(e.Id))
                    .ToListAsync(cancellationToken);
                
                foreach (var eq in equipment)
                {
                    operatorEntity.OperatorEquipment.Add(new OperatorEquipment
                    {
                        OperatorId = operatorEntity.Id,
                        EquipmentId = eq.Id
                    });
                }
            }

            db.Users.Add(user);
            db.Operators.Add(operatorEntity);
            await db.SaveChangesAsync(cancellationToken);

            return Results.Ok(new
            {
                success = true,
                message = "Operator account created",
                operatorId = operatorEntity.Id
            });
        })
        .WithName("RegisterOperator")
        .WithOpenApi();

        // POST /api/auth/login - Login operator
        group.MapPost("/login", async (
            LoginDto dto,
            AutoSOSDbContext db,
            IConfiguration config) =>
        {
            // Validation
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return Results.BadRequest(new { error = "Email and password are required" });
            }

            // Find user
            var user = await db.Users
                .Include(u => u.Operator)
                .FirstOrDefaultAsync(u => u.Email == dto.Email && u.Role == UserRole.Operator);

            if (user == null || string.IsNullOrEmpty(user.PasswordHash))
            {
                return Results.Unauthorized();
            }

            // Verify password
            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return Results.Unauthorized();
            }

            // Check if operator exists
            if (user.Operator == null)
            {
                return Results.BadRequest(new { error = "Operator account does not exist" });
            }

            // Generate JWT token
            var token = GenerateJwtToken(user, user.Operator, config);

            return Results.Ok(new AuthResponseDto(
                Token: token,
                OperatorId: user.Operator.Id,
                Name: user.Operator.Name,
                Email: user.Email ?? ""
            ));
        })
        .WithName("LoginOperator")
        .WithOpenApi();

        // GET /api/auth/me - Get current user
        group.MapGet("/me", async (
            HttpContext context,
            AutoSOSDbContext db) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Results.Unauthorized();
            }

            var user = await db.Users
                .Include(u => u.Operator)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null || user.Operator == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(new
            {
                operatorId = user.Operator.Id,
                name = user.Operator.Name,
                email = user.Email,
                phone = user.Operator.Phone,
                vehicleType = user.Operator.VehicleType,
                isAvailable = user.Operator.IsAvailable
            });
        })
        .WithName("GetCurrentUser")
        .RequireAuthorization()
        .WithOpenApi();
    }

    private static string GenerateJwtToken(User user, Operator operatorEntity, IConfiguration config)
    {
        var jwtKey = config["Jwt:Key"];
        if (string.IsNullOrEmpty(jwtKey))
        {
            throw new InvalidOperationException("Jwt:Key is not configured");
        }

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email ?? ""),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("OperatorId", operatorEntity.Id.ToString()),
            new Claim("OperatorName", operatorEntity.Name)
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

