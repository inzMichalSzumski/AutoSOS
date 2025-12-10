using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
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

