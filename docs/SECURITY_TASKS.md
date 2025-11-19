# 🔐 Security Tasks - Ready to Create as Issues

Copy the tasks below and create them as GitHub Issues.

---

## Issue #1: Rate Limiting for Authentication Endpoints

**Title:** `[SECURITY] Implement rate limiting for login and registration`

**Labels:** `security`, `enhancement`, `priority: high`, `backend`

**Description:**
```markdown
## 🔐 Description
Add rate limiting to prevent brute-force attacks on endpoints:
- POST /api/auth/login
- POST /api/auth/register

## ⚠️ Priority
- [x] High - should be done soon

## 💡 Proposed Solution
Use `AspNetCoreRateLimit` library or custom middleware:
- Max 5 login attempts per IP in 1 minute
- Max 3 registrations per IP in 1 hour
- When exceeded: HTTP 429 Too Many Requests

## ✅ Acceptance Criteria
- [ ] Rate limiting for POST /api/auth/login (5/min)
- [ ] Rate limiting for POST /api/auth/register (3/h)
- [ ] Return appropriate error message
- [ ] Unit tests
- [ ] Documentation in README

## 📚 Documentation
- https://github.com/stefanprodan/AspNetCoreRateLimit
- https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit
```

---

## Issue #2: CAPTCHA After Failed Login Attempts

**Title:** `[SECURITY] Add CAPTCHA after 3 failed login attempts`

**Labels:** `security`, `enhancement`, `priority: medium`, `frontend`, `backend`

**Description:**
```markdown
## 🔐 Description
After 3 failed login attempts, require solving CAPTCHA before next attempt.

## ⚠️ Priority
- [x] Medium - planned improvement

## 💡 Proposed Solution
- Frontend: Google reCAPTCHA v3 (invisible) or hCaptcha
- Backend: Verify CAPTCHA token before login
- Track failed attempts by IP or email

## ✅ Acceptance Criteria
- [ ] Integrate reCAPTCHA v3 in login form
- [ ] Backend verifies CAPTCHA token
- [ ] Failed attempts counter (in memory or Redis)
- [ ] Reset counter after successful login
- [ ] E2E tests
- [ ] Documentation

## 📚 Documentation
- https://www.google.com/recaptcha/about/
- https://www.hcaptcha.com/
```

---

## Issue #3: Password Strength Meter

**Title:** `[SECURITY] Add password strength meter during registration`

**Labels:** `security`, `enhancement`, `priority: medium`, `frontend`

**Description:**
```markdown
## 🔐 Description
Visual validation of password strength during operator registration.

## ⚠️ Priority
- [x] Medium - planned improvement

## 💡 Proposed Solution
Library: `zxcvbn` (used by Dropbox)

Requirements:
- Minimum 8 characters (increased from 6)
- At least 1 uppercase letter
- At least 1 digit
- At least 1 special character

Visualization:
- Red: Weak
- Yellow: Medium
- Green: Strong

## ✅ Acceptance Criteria
- [ ] PasswordStrengthMeter component
- [ ] Real-time validation while typing
- [ ] Color indicators (red/yellow/green)
- [ ] Hints on how to improve password
- [ ] Backend also verifies password strength
- [ ] Unit tests
- [ ] Documentation

## 📚 Documentation
- https://github.com/dropbox/zxcvbn
```

---

## Issue #4: Backend Input Validation

**Title:** `[SECURITY] Add comprehensive validation for all endpoints`

**Labels:** `security`, `bug`, `priority: high`, `backend`

**Description:**
```markdown
## 🔐 Description
All endpoints should have backend validation to prevent:
- SQL Injection
- XSS
- Invalid data

## ⚠️ Priority
- [x] High - should be done soon

## 💡 Proposed Solution
Use FluentValidation for all DTOs:

Example:
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

## ✅ Acceptance Criteria
- [ ] Install FluentValidation.AspNetCore
- [ ] Validators for all DTOs (Auth, Request, Offer, Operator)
- [ ] Return detailed validation errors (400 Bad Request)
- [ ] String sanitization (remove HTML tags)
- [ ] Unit tests for validators
- [ ] Documentation

## 📚 Documentation
- https://docs.fluentvalidation.net/
```

---

## Issue #5: CORS Configuration for Production

**Title:** `[SECURITY] Configure CORS for production environment`

**Labels:** `security`, `devops`, `priority: high`, `backend`

**Description:**
```markdown
## 🔐 Description
Current CORS configuration is too permissive. Should limit origins to specific domains.

## ⚠️ Priority
- [x] High - critical before production deployment

## 💡 Proposed Solution
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

## ✅ Acceptance Criteria
- [ ] CORS origins from appsettings (not hardcoded)
- [ ] Different origins for Development/Production
- [ ] No `AllowAnyOrigin()` in production
- [ ] Tests verifying CORS policy
- [ ] Deployment documentation

## 📚 Documentation
- https://learn.microsoft.com/en-us/aspnet/core/security/cors
```

---

## Issue #6: Security Headers (Helmet.js Equivalent)

**Title:** `[SECURITY] Add security headers (CSP, X-Frame-Options, etc.)`

**Labels:** `security`, `enhancement`, `priority: medium`, `backend`

**Description:**
```markdown
## 🔐 Description
Add security headers to protect against various attacks:
- XSS
- Clickjacking
- MIME sniffing
- etc.

## ⚠️ Priority
- [x] Medium - planned improvement

## 💡 Proposed Solution
Add middleware in Program.cs:

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

Or use library: `NWebsec.AspNetCore.Middleware`

## ✅ Acceptance Criteria
- [ ] All security headers added
- [ ] CSP configured for application
- [ ] Tests verifying header presence
- [ ] Documentation in README

## 📚 Documentation
- https://github.com/NWebsec/NWebsec
- https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
```

---

## Issue #7: 2FA (Two-Factor Authentication)

**Title:** `[SECURITY] Implement 2FA for operators (SMS)`

**Labels:** `security`, `enhancement`, `priority: low`, `backend`, `frontend`

**Description:**
```markdown
## 🔐 Description
Additional security layer - 2FA via SMS for operators.

## ⚠️ Priority
- [x] Low - nice to have

## 💡 Proposed Solution
1. User enables 2FA in settings
2. When logging in after correct password:
   - SMS sent with code (6 digits)
   - User has 5 minutes to enter code
   - After 3 wrong attempts - 15 minute timeout

SMS Services:
- Twilio (paid, global)
- SMS API (Polish)
- Vonage/Nexmo

## ✅ Acceptance Criteria
- [ ] Endpoint POST /api/auth/enable-2fa
- [ ] Endpoint POST /api/auth/verify-2fa
- [ ] Send SMS with code
- [ ] Verify code (5 min timeout)
- [ ] Rate limiting for sending codes (max 3/h)
- [ ] UI in operator panel (enable/disable 2FA)
- [ ] E2E tests
- [ ] Documentation

## 📚 Documentation
- https://www.twilio.com/docs/verify/quickstarts
```

---

## Issue #8: Security Event Logging

**Title:** `[SECURITY] Add audit log for security events`

**Labels:** `security`, `enhancement`, `priority: medium`, `backend`

**Description:**
```markdown
## 🔐 Description
Log all important security events:
- Failed login attempts
- Successful logins
- Password changes
- 2FA enable/disable
- Changes to sensitive data
- Suspicious activity (many requests from one IP)

## ⚠️ Priority
- [x] Medium - planned improvement

## 💡 Proposed Solution
Use Serilog with sinks to:
- File (local development)
- Azure Application Insights (production)
- Seq (optionally for dev)

Example:
```csharp
Log.Information("Login attempt: {Email} from {IP}", email, ipAddress);
Log.Warning("Failed login attempt #{Count} for {Email}", failedAttempts, email);
Log.Error("Suspicious activity detected: {IP} made {Count} requests in 1 minute", ip, count);
```

## ✅ Acceptance Criteria
- [ ] Serilog configured
- [ ] All security events logged
- [ ] Structured logging (easy to query)
- [ ] Dashboard for viewing logs (Seq/App Insights)
- [ ] Alerts for suspicious activity
- [ ] Documentation

## 📚 Documentation
- https://serilog.net/
- https://datalust.co/seq
```

---

## Issue #9: Enforce HTTPS in Production

**Title:** `[SECURITY] Enforce HTTPS in production`

**Labels:** `security`, `devops`, `priority: high`, `backend`

**Description:**
```markdown
## 🔐 Description
All communication must be over HTTPS. HTTP automatically redirected to HTTPS.

## ⚠️ Priority
- [x] High - critical before production deployment

## 💡 Proposed Solution
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
  https: true // only for local HTTPS tests
}
```

Production:
- Azure App Service: automatic HTTPS
- Let's Encrypt: free SSL certificate

## ✅ Acceptance Criteria
- [ ] HTTPS enforced in production
- [ ] HSTS header added (max-age=31536000)
- [ ] HTTP → HTTPS redirect
- [ ] SSL certificate configured
- [ ] Mixed content warnings fixed
- [ ] Tests verifying HTTPS
- [ ] Deployment documentation

## 📚 Documentation
- https://letsencrypt.org/
- https://learn.microsoft.com/en-us/aspnet/core/security/enforcing-ssl
```

---

## Issue #10: Encrypt Sensitive Data (GDPR)

**Title:** `[SECURITY] Encrypt sensitive data in database (phone numbers, emails)`

**Labels:** `security`, `enhancement`, `priority: medium`, `backend`, `database`

**Description:**
```markdown
## 🔐 Description
According to GDPR, sensitive personal data should be encrypted in the database.

## ⚠️ Priority
- [x] Medium - required for GDPR compliance

## 💡 Proposed Solution
Use Entity Framework Core Value Converters:

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

// In DbContext:
modelBuilder.Entity<User>()
    .Property(u => u.PhoneNumber)
    .HasConversion<EncryptedStringConverter>();
```

Encryption key in Azure Key Vault (not in appsettings!).

## ✅ Acceptance Criteria
- [ ] Phone numbers encrypted in database
- [ ] Emails encrypted in database
- [ ] Encryption key in Azure Key Vault
- [ ] Migration of existing data
- [ ] Encryption/decryption tests
- [ ] GDPR compliance documentation

## 📚 Documentation
- https://learn.microsoft.com/en-us/ef/core/modeling/value-conversions
- https://azure.microsoft.com/en-us/products/key-vault
```

---

## 🚀 How to Create These Issues?

### Option 1: Manually via GitHub
1. Go to https://github.com/YOUR_USERNAME/AutoSOS/issues
2. New Issue → select "Security Enhancement"
3. Copy title and description from above tasks
4. Add appropriate labels
5. Submit

### Option 2: Via GitHub CLI
```bash
# Issue #1
gh issue create \
  --title "[SECURITY] Implement rate limiting for login and registration" \
  --body-file issue1.md \
  --label security,enhancement,priority:high,backend

# Issue #2
gh issue create \
  --title "[SECURITY] Add CAPTCHA after 3 failed login attempts" \
  --body-file issue2.md \
  --label security,enhancement,priority:medium,frontend,backend

# ... and so on
```

### Option 3: Bulk Import (Script)
I can create a PowerShell/Bash script that creates all issues at once.

---

**Good luck securing AutoSOS!** 🔐
