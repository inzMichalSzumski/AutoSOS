# 🔐 Zadania Bezpieczeństwa - Gotowe do utworzenia jako Issues

Skopiuj poniższe zadania i utwórz jako GitHub Issues.

---

## Issue #1: Rate Limiting dla endpointów autentykacji

**Title:** `[SECURITY] Implementować rate limiting dla logowania i rejestracji`

**Labels:** `security`, `enhancement`, `priority: high`, `backend`

**Description:**
```markdown
## 🔐 Opis
Dodać rate limiting, aby zapobiec atakom brute-force na endpointy:
- POST /api/auth/login
- POST /api/auth/register

## ⚠️ Priorytet
- [x] Wysoki - należy zrobić w najbliższym czasie

## 💡 Proponowane rozwiązanie
Użyć biblioteki `AspNetCoreRateLimit` lub custom middleware:
- Max 5 prób logowania na IP w ciągu 1 minuty
- Max 3 rejestracje na IP w ciągu 1 godziny
- Po przekroczeniu: HTTP 429 Too Many Requests

## ✅ Kryteria akceptacji
- [ ] Rate limiting dla POST /api/auth/login (5/min)
- [ ] Rate limiting dla POST /api/auth/register (3/h)
- [ ] Zwracanie odpowiedniego komunikatu błędu
- [ ] Testy jednostkowe
- [ ] Dokumentacja w README

## 📚 Dokumentacja
- https://github.com/stefanprodan/AspNetCoreRateLimit
- https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit
```

---

## Issue #2: CAPTCHA po nieudanych próbach logowania

**Title:** `[SECURITY] Dodać CAPTCHA po 3 nieudanych próbach logowania`

**Labels:** `security`, `enhancement`, `priority: medium`, `frontend`, `backend`

**Description:**
```markdown
## 🔐 Opis
Po 3 nieudanych próbach logowania wymagać rozwiązania CAPTCHA przed kolejną próbą.

## ⚠️ Priorytet
- [x] Średni - planowane ulepszenie

## 💡 Proponowane rozwiązanie
- Frontend: Google reCAPTCHA v3 (niewidoczne) lub hCaptcha
- Backend: Weryfikacja tokenu CAPTCHA przed logowaniem
- Tracking nieudanych prób po IP lub email

## ✅ Kryteria akceptacji
- [ ] Integracja reCAPTCHA v3 w formularz logowania
- [ ] Backend weryfikuje token CAPTCHA
- [ ] Licznik nieudanych prób (w pamięci lub Redis)
- [ ] Reset licznika po udanym logowaniu
- [ ] Testy E2E
- [ ] Dokumentacja

## 📚 Dokumentacja
- https://www.google.com/recaptcha/about/
- https://www.hcaptcha.com/
```

---

## Issue #3: Password Strength Meter

**Title:** `[SECURITY] Dodać password strength meter przy rejestracji`

**Labels:** `security`, `enhancement`, `priority: medium`, `frontend`

**Description:**
```markdown
## 🔐 Opis
Wizualna walidacja siły hasła podczas rejestracji operatora.

## ⚠️ Priorytet
- [x] Średni - planowane ulepszenie

## 💡 Proponowane rozwiązanie
Biblioteka: `zxcvbn` (używana przez Dropbox)

Wymagania:
- Minimum 8 znaków (zwiększone z 6)
- Przynajmniej 1 wielka litera
- Przynajmniej 1 cyfra
- Przynajmniej 1 znak specjalny

Wizualizacja:
- Czerwony: Słabe
- Żółty: Średnie
- Zielony: Silne

## ✅ Kryteria akceptacji
- [ ] Komponent PasswordStrengthMeter
- [ ] Real-time walidacja podczas wpisywania
- [ ] Kolorowe wskaźniki (czerwony/żółty/zielony)
- [ ] Podpowiedzi jak poprawić hasło
- [ ] Backend również weryfikuje siłę hasła
- [ ] Testy jednostkowe
- [ ] Dokumentacja

## 📚 Dokumentacja
- https://github.com/dropbox/zxcvbn
```

---

## Issue #4: Walidacja danych wejściowych na backendzie

**Title:** `[SECURITY] Dodać kompleksową walidację wszystkich endpointów`

**Labels:** `security`, `bug`, `priority: high`, `backend`

**Description:**
```markdown
## 🔐 Opis
Wszystkie endpointy powinny mieć walidację po stronie backendu, aby zapobiec:
- SQL Injection
- XSS
- Invalid data

## ⚠️ Priorytet
- [x] Wysoki - należy zrobić w najbliższym czasie

## 💡 Proponowane rozwiązanie
Użyć FluentValidation dla wszystkich DTOs:

Przykład:
```csharp
public class RegisterOperatorDtoValidator : AbstractValidator<RegisterOperatorDto>
{
    public RegisterOperatorDtoValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).MinimumLength(8).Matches(@"[A-Z]").Matches(@"[0-9]");
        RuleFor(x => x.Phone).Matches(@"^\+?[1-9]\d{1,14}$");
        RuleFor(x => x.ServiceRadiusKm).InclusiveBetween(5, 100);
    }
}
```

## ✅ Kryteria akceptacji
- [ ] Zainstalować FluentValidation.AspNetCore
- [ ] Validatory dla wszystkich DTOs (Auth, Request, Offer, Operator)
- [ ] Zwracanie szczegółowych błędów walidacji (400 Bad Request)
- [ ] Sanityzacja stringów (usuwanie HTML tags)
- [ ] Testy jednostkowe dla validatorów
- [ ] Dokumentacja

## 📚 Dokumentacja
- https://docs.fluentvalidation.net/
```

---

## Issue #5: CORS - konfiguracja dla produkcji

**Title:** `[SECURITY] Skonfigurować CORS dla środowiska produkcyjnego`

**Labels:** `security`, `devops`, `priority: high`, `backend`

**Description:**
```markdown
## 🔐 Opis
Obecna konfiguracja CORS jest zbyt permisywna. Należy ograniczyć origins do konkretnych domen.

## ⚠️ Priorytet
- [x] Wysoki - krytyczne przed wdrożeniem na produkcję

## 💡 Proponowane rozwiązanie
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var origins = builder.Configuration
            .GetSection("AllowedOrigins")
            .Get<string[]>() ?? Array.Empty<string>();
            
        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
```

appsettings.Production.json:
```json
{
  "AllowedOrigins": [
    "https://autosos.pl",
    "https://www.autosos.pl"
  ]
}
```

## ✅ Kryteria akceptacji
- [ ] CORS origins z appsettings (nie hardcoded)
- [ ] Różne origins dla Development/Production
- [ ] Brak `AllowAnyOrigin()` na produkcji
- [ ] Testy weryfikujące CORS policy
- [ ] Dokumentacja deployment

## 📚 Dokumentacja
- https://learn.microsoft.com/en-us/aspnet/core/security/cors
```

---

## Issue #6: Security Headers (Helmet.js equivalent)

**Title:** `[SECURITY] Dodać security headers (CSP, X-Frame-Options, etc.)`

**Labels:** `security`, `enhancement`, `priority: medium`, `backend`

**Description:**
```markdown
## 🔐 Opis
Dodać security headers aby chronić przed różnymi atakami:
- XSS
- Clickjacking
- MIME sniffing
- itp.

## ⚠️ Priorytet
- [x] Średni - planowane ulepszenie

## 💡 Proponowane rozwiązanie
Dodać middleware w Program.cs:

```csharp
app.Use(async (context, next) =>
{
    context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Add("X-Frame-Options", "DENY");
    context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Add("Referrer-Policy", "no-referrer");
    context.Response.Headers.Add("Permissions-Policy", "geolocation=(self)");
    
    // Content Security Policy
    context.Response.Headers.Add("Content-Security-Policy", 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:;");
    
    await next();
});
```

Lub użyć biblioteki: `NWebsec.AspNetCore.Middleware`

## ✅ Kryteria akceptacji
- [ ] Wszystkie security headers dodane
- [ ] CSP skonfigurowane dla aplikacji
- [ ] Testy weryfikujące obecność headers
- [ ] Dokumentacja w README

## 📚 Dokumentacja
- https://github.com/NWebsec/NWebsec
- https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
```

---

## Issue #7: 2FA (Two-Factor Authentication)

**Title:** `[SECURITY] Implementować 2FA dla operatorów (SMS)`

**Labels:** `security`, `enhancement`, `priority: low`, `backend`, `frontend`

**Description:**
```markdown
## 🔐 Opis
Dodatkowa warstwa bezpieczeństwa - 2FA przez SMS dla operatorów.

## ⚠️ Priorytet
- [x] Niski - nice to have

## 💡 Proponowane rozwiązanie
1. Użytkownik włącza 2FA w ustawieniach
2. Przy logowaniu po prawidłowym haśle:
   - Wysyłany jest SMS z kodem (6 cyfr)
   - Użytkownik ma 5 minut na wpisanie kodu
   - Po 3 błędnych próbach - timeout 15 minut

Serwisy SMS:
- Twilio (płatne, globalne)
- SMS API (polskie)
- Vonage/Nexmo

## ✅ Kryteria akceptacji
- [ ] Endpoint POST /api/auth/enable-2fa
- [ ] Endpoint POST /api/auth/verify-2fa
- [ ] Wysyłanie SMS z kodem
- [ ] Weryfikacja kodu (timeout 5 min)
- [ ] Rate limiting dla wysyłania kodów (max 3/h)
- [ ] UI w panelu operatora (włącz/wyłącz 2FA)
- [ ] Testy E2E
- [ ] Dokumentacja

## 📚 Dokumentacja
- https://www.twilio.com/docs/verify/quickstarts
```

---

## Issue #8: Logowanie security events

**Title:** `[SECURITY] Dodać audit log dla zdarzeń bezpieczeństwa`

**Labels:** `security`, `enhancement`, `priority: medium`, `backend`

**Description:**
```markdown
## 🔐 Opis
Logować wszystkie ważne zdarzenia bezpieczeństwa:
- Nieudane próby logowania
- Udane logowania
- Zmiany hasła
- Włączenie/wyłączenie 2FA
- Zmiany danych wrażliwych
- Suspicious activity (wiele requestów z jednego IP)

## ⚠️ Priorytet
- [x] Średni - planowane ulepszenie

## 💡 Proponowane rozwiązanie
Użyć Serilog z sink do:
- Plik (local development)
- Azure Application Insights (production)
- Seq (opcjonalnie dla dev)

Przykład:
```csharp
Log.Information("Login attempt: {Email} from {IP}", email, ipAddress);
Log.Warning("Failed login attempt #{Count} for {Email}", failedAttempts, email);
Log.Error("Suspicious activity detected: {IP} made {Count} requests in 1 minute", ip, count);
```

## ✅ Kryteria akceptacji
- [ ] Serilog skonfigurowany
- [ ] Wszystkie security events logowane
- [ ] Structured logging (łatwe do zapytań)
- [ ] Dashboard do przeglądania logów (Seq/App Insights)
- [ ] Alerty przy suspicious activity
- [ ] Dokumentacja

## 📚 Dokumentacja
- https://serilog.net/
- https://datalust.co/seq
```

---

## Issue #9: HTTPS wymuszony na produkcji

**Title:** `[SECURITY] Wymuszać HTTPS na produkcji`

**Labels:** `security`, `devops`, `priority: high`, `backend`

**Description:**
```markdown
## 🔐 Opis
Cała komunikacja musi być przez HTTPS. HTTP automatycznie przekierowywany na HTTPS.

## ⚠️ Priorytet
- [x] Wysoki - krytyczne przed wdrożeniem na produkcję

## 💡 Proponowane rozwiązanie
Backend:
```csharp
if (app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
    app.UseHsts(); // HTTP Strict Transport Security
}
```

Frontend (vite.config.ts):
```typescript
server: {
  https: true // tylko dla local testów HTTPS
}
```

Produkcja:
- Azure App Service: automatyczne HTTPS
- Let's Encrypt: darmowy certyfikat SSL

## ✅ Kryteria akceptacji
- [ ] HTTPS wymuszony na produkcji
- [ ] HSTS header dodany (max-age=31536000)
- [ ] HTTP → HTTPS redirect
- [ ] Certyfikat SSL skonfigurowany
- [ ] Mixed content warnings naprawione
- [ ] Testy weryfikujące HTTPS
- [ ] Dokumentacja deployment

## 📚 Dokumentacja
- https://letsencrypt.org/
- https://learn.microsoft.com/en-us/aspnet/core/security/enforcing-ssl
```

---

## Issue #10: Szyfrowanie wrażliwych danych (GDPR)

**Title:** `[SECURITY] Szyfrować wrażliwe dane w bazie (numery telefonów, emaile)`

**Labels:** `security`, `enhancement`, `priority: medium`, `backend`, `database`

**Description:**
```markdown
## 🔐 Opis
Zgodnie z GDPR, wrażliwe dane osobowe powinny być szyfrowane w bazie danych.

## ⚠️ Priorytet
- [x] Średni - wymagane dla GDPR compliance

## 💡 Proponowane rozwiązanie
Użyć Entity Framework Core Value Converters:

```csharp
public class EncryptedStringConverter : ValueConverter<string, string>
{
    public EncryptedStringConverter() 
        : base(
            v => Encrypt(v),
            v => Decrypt(v))
    { }
    
    private static string Encrypt(string value) 
    {
        // AES encryption
    }
    
    private static string Decrypt(string value)
    {
        // AES decryption
    }
}

// W DbContext:
modelBuilder.Entity<User>()
    .Property(u => u.PhoneNumber)
    .HasConversion<EncryptedStringConverter>();
```

Klucz szyfrowania w Azure Key Vault (nie w appsettings!).

## ✅ Kryteria akceptacji
- [ ] Numery telefonów szyfrowane w bazie
- [ ] Emaile szyfrowane w bazie
- [ ] Klucz szyfrowania w Azure Key Vault
- [ ] Migracja istniejących danych
- [ ] Testy szyfrowania/deszyfrowania
- [ ] Dokumentacja GDPR compliance

## 📚 Dokumentacja
- https://learn.microsoft.com/en-us/ef/core/modeling/value-conversions
- https://azure.microsoft.com/en-us/products/key-vault
```

---

## 🚀 Jak utworzyć te Issues?

### Opcja 1: Ręcznie przez GitHub
1. Wejdź na https://github.com/TWOJ_USERNAME/AutoSOS/issues
2. New Issue → wybierz "Security Enhancement"
3. Skopiuj tytuł i opis z powyższych tasków
4. Dodaj odpowiednie labels
5. Submit

### Opcja 2: Przez GitHub CLI
```bash
# Issue #1
gh issue create \
  --title "[SECURITY] Implementować rate limiting dla logowania i rejestracji" \
  --body-file issue1.md \
  --label security,enhancement,priority:high,backend

# Issue #2
gh issue create \
  --title "[SECURITY] Dodać CAPTCHA po 3 nieudanych próbach logowania" \
  --body-file issue2.md \
  --label security,enhancement,priority:medium,frontend,backend

# ... i tak dalej
```

### Opcja 3: Bulk import (script)
Mogę utworzyć skrypt PowerShell/Bash, który utworzy wszystkie issues naraz.

---

**Powodzenia z zabezpieczaniem AutoSOS!** 🔐

