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
    public DbSet<Equipment> Equipment { get; set; }
    public DbSet<OperatorEquipment> OperatorEquipment { get; set; }
    public DbSet<PushSubscription> PushSubscriptions { get; set; }

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
            entity.HasIndex(e => e.UserId);
            
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
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
                .WithOne(u => u.Operator)
                .HasForeignKey<Operator>(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Equipment configuration
        modelBuilder.Entity<Equipment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.RequiresTransport).IsRequired();
        });

        // OperatorEquipment - many-to-many relationship
        modelBuilder.Entity<OperatorEquipment>(entity =>
        {
            entity.ToTable("OperatorEquipment");
            entity.HasKey(e => new { e.OperatorId, e.EquipmentId });
            
            entity.HasOne(e => e.Operator)
                .WithMany(o => o.OperatorEquipment)
                .HasForeignKey(e => e.OperatorId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.Equipment)
                .WithMany()
                .HasForeignKey(e => e.EquipmentId)
                .OnDelete(DeleteBehavior.Restrict);
            
            entity.HasIndex(e => e.OperatorId);
            entity.HasIndex(e => e.EquipmentId);
        });

        // Request configuration - add RequiredEquipment relationship
        modelBuilder.Entity<Request>(entity =>
        {
            entity.HasOne(e => e.RequiredEquipment)
                .WithMany()
                .HasForeignKey(e => e.RequiredEquipmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // PushSubscription configuration
        modelBuilder.Entity<PushSubscription>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Endpoint).IsRequired().HasMaxLength(500);
            entity.Property(e => e.P256dhKey).IsRequired().HasMaxLength(200);
            entity.Property(e => e.AuthKey).IsRequired().HasMaxLength(200);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.IsActive).IsRequired();

            entity.HasIndex(e => e.OperatorId);
            entity.HasIndex(e => e.Endpoint);

            entity.HasOne(e => e.Operator)
                .WithMany()
                .HasForeignKey(e => e.OperatorId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

