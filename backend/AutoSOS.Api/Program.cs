using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using AutoSOS.Api.Data;
using AutoSOS.Api.Hubs;
using AutoSOS.Api.Models;
using AutoSOS.Api.Services;
using AutoSOS.Api.Features.Auth;
using AutoSOS.Api.Features.Requests;
using AutoSOS.Api.Features.Operators;
using AutoSOS.Api.Features.Offers;
using AutoSOS.Api.Features.Equipment;
using AutoSOS.Api.Features.PushSubscriptions;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();

// Authentication & Authorization
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

builder.Services.AddAuthorization();

// Database
builder.Services.AddDbContext<AutoSOSDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// SignalR
builder.Services.AddSignalR();

// Services
builder.Services.AddHttpClient();
builder.Services.AddSingleton<WebPushService>();

// Background Services
builder.Services.AddHostedService<RequestNotificationService>();
builder.Services.AddHostedService<RequestCleanupService>();

// CORS - allow frontend from GitHub Pages and production
builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
        ?? new[] { "http://localhost:5173", "https://inzmichalszumski.github.io" };
    
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Rate Limiting - prevent spam on request creation
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("CreateRequestRateLimit", httpContext =>
    {
        // Extract phone number from request body for partitioning
        // Each phone number gets its own rate limit bucket
        var phoneNumber = "anonymous";
        
        if (httpContext.Request.ContentType?.Contains("application/json") == true)
        {
            try
            {
                // Enable buffering to allow reading the body multiple times
                httpContext.Request.EnableBuffering();
                
                // Read the request body
                var originalPosition = httpContext.Request.Body.Position;
                httpContext.Request.Body.Position = 0;
                
                using var reader = new StreamReader(
                    httpContext.Request.Body, 
                    encoding: System.Text.Encoding.UTF8,
                    detectEncodingFromByteOrderMarks: false,
                    leaveOpen: true);
                
                var body = reader.ReadToEndAsync().GetAwaiter().GetResult();
                
                // Reset stream position for the endpoint to read
                httpContext.Request.Body.Position = originalPosition;
                
                // Parse JSON to extract phone number
                if (!string.IsNullOrEmpty(body))
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(body);
                    if (doc.RootElement.TryGetProperty("phoneNumber", out var phoneElement))
                    {
                        phoneNumber = phoneElement.GetString() ?? "anonymous";
                    }
                }
            }
            catch
            {
                // If we can't read the body, fall back to anonymous
                phoneNumber = "anonymous";
            }
        }

        return RateLimitPartition.GetFixedWindowLimiter(phoneNumber, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 3, // Max 3 requests
            Window = TimeSpan.FromMinutes(1), // Per 1 minute
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0 // No queuing
        });
    });

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Too many requests. Please try again later.",
            retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)
                ? (double?)retryAfter.TotalSeconds
                : null
        }, cancellationToken);
    };
});

var app = builder.Build();

// Database initialization
await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AutoSOSDbContext>();
    await DatabaseInitializer.InitializeAsync(db);
}

// Configure the HTTP request pipeline
app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// SignalR Hub
app.MapHub<RequestHub>("/hubs/request");

// API Endpoints - Vertical Slices Architecture
app.MapAuthEndpoints();
app.MapRequestEndpoints();
app.MapOperatorEndpoints(); // Includes operator equipment endpoints
app.MapOfferEndpoints();
app.MapEquipmentEndpoints();
app.MapPushSubscriptionEndpoints();

app.Run();

