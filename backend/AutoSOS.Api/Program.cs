using Microsoft.EntityFrameworkCore;
using AutoSOS.Api.Data;
using AutoSOS.Api.Hubs;
using AutoSOS.Api.Models;
using AutoSOS.Api.Services;
using AutoSOS.Api.Endpoints;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();

// Database
builder.Services.AddDbContext<AutoSOSDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// SignalR
builder.Services.AddSignalR();

// CORS - pozwól frontendowi na GitHub Pages
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "https://inzmichalszumski.github.io"
            )
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

// SignalR Hub
app.MapHub<RequestHub>("/hubs/request");

// API Endpoints
app.MapRequestEndpoints();
app.MapOperatorEndpoints();
app.MapOfferEndpoints();

app.Run();

