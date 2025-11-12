using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Models;

namespace AutoSOS.Api.Data;

public class AutoSOSDbContext : DbContext
{
    public AutoSOSDbContext(DbContextOptions<AutoSOSDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Request> Requests { get; set; }
    public DbSet<Offer> Offers { get; set; }
    public DbSet<Operator> Operators { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PhoneNumber).IsRequired().HasMaxLength(20);
            entity.HasIndex(e => e.PhoneNumber);
            entity.Property(e => e.Role).IsRequired();
        });

        // Request configuration
        modelBuilder.Entity<Request>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PhoneNumber).IsRequired().HasMaxLength(20);
            entity.Property(e => e.FromLatitude).IsRequired();
            entity.Property(e => e.FromLongitude).IsRequired();
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            
            entity.HasIndex(e => e.Status);
        });

        // Offer configuration
        modelBuilder.Entity<Offer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Price).IsRequired().HasPrecision(10, 2);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            
            entity.HasOne(e => e.Request)
                .WithMany()
                .HasForeignKey(e => e.RequestId)
                .OnDelete(DeleteBehavior.Restrict);
            
            entity.HasOne(e => e.Operator)
                .WithMany()
                .HasForeignKey(e => e.OperatorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Operator configuration
        modelBuilder.Entity<Operator>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Phone).IsRequired().HasMaxLength(20);
            entity.Property(e => e.VehicleType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.IsAvailable).IsRequired();
            
            entity.HasOne(e => e.User)
                .WithOne()
                .HasForeignKey<Operator>(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}

