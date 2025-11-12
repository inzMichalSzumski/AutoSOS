# AutoSOS Backend API

Backend API dla aplikacji AutoSOS - .NET 10 Minimal APIs.

## 🛠️ Technologie

- **.NET 10** - LTS wersja
- **Entity Framework Core** - ORM
- **Azure SQL Database** - baza danych (darmowy tier)
- **SignalR** - real-time komunikacja
- **Minimal APIs** - lekkie endpointy

## 📁 Struktura projektu

```
AutoSOS.Api/
├── Data/
│   └── AutoSOSDbContext.cs    # Kontekst EF Core
├── Models/
│   ├── User.cs                 # Użytkownik (Customer/Operator)
│   ├── Request.cs              # Zgłoszenie pomocy
│   ├── Offer.cs                # Oferta operatora
│   └── Operator.cs             # Profil operatora
├── DTOs/
│   └── CreateRequestDto.cs     # DTO dla tworzenia zgłoszenia
├── Hubs/
│   └── RequestHub.cs           # SignalR hub
└── Program.cs                   # Konfiguracja i endpointy
```

## 🚀 Uruchomienie lokalne

### Wymagania
- .NET 10 SDK
- SQL Server (LocalDB lub Azure SQL)

### Kroki

1. **Zainstaluj .NET 10 SDK:**
   ```bash
   # Sprawdź czy masz .NET 10
   dotnet --version
   ```

2. **Skonfiguruj connection string w `appsettings.Development.json`**

3. **Utwórz migracje:**
   ```bash
   cd AutoSOS.Api
   dotnet ef migrations add InitialCreate
   dotnet ef database update
   ```

4. **Uruchom aplikację:**
   ```bash
   dotnet run
   ```

5. **Otwórz Swagger:**
   - http://localhost:5000/swagger

## 📝 Endpointy API (planowane)

- `POST /api/requests` - Tworzenie zgłoszenia
- `GET /api/operators?lat={lat}&lng={lng}&radius={km}` - Wyszukiwanie operatorów w promieniu
- `POST /api/offers` - Operator składa ofertę
- `POST /api/offers/{id}/accept` - Akceptacja oferty
- `GET /api/requests/{id}` - Pobranie zgłoszenia
- SignalR: `/hubs/request` - Real-time updates

## 🔐 Autoryzacja (TODO)

- **Operator:** JWT token (email/hasło)
- **Użytkownik:** SMS OTP (Twilio lub podobne)

## 🌐 Deployment

- **Azure App Service** (darmowy tier)
- **Azure SQL Database** (darmowy tier)

## 📄 Licencja

MIT

