namespace AutoSOS.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PasswordHash { get; set; } // For operators
    public UserRole Role { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsVerified { get; set; } = false; // For SMS OTP
    
    // Navigation property
    public Operator? Operator { get; set; }
}

public enum UserRole
{
    Customer = 0,
    Operator = 1
}

