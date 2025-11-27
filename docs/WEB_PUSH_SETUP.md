# Web Push Notifications Setup

## Przegląd

AutoSOS używa Web Push API do wysyłania powiadomień operatorom o nowych zgłoszeniach, nawet gdy aplikacja jest zamknięta w przeglądarce.

## Architektura

### Frontend
- **Service Worker** (`frontend/public/sw-custom.js`) - obsługuje powiadomienia push w tle
- **Push Notification Service** (`frontend/src/services/pushNotifications.ts`) - zarządza subskrypcjami
- **Notification Sound Service** (`frontend/src/services/notificationSound.ts`) - odtwarza dźwięki powiadomień
- **UI Component** (`frontend/src/components/NotificationPermissionBanner.tsx`) - prosi o zgodę użytkownika

### Backend
- **PushSubscription Model** - przechowuje subskrypcje operatorów w bazie danych
- **WebPushService** - wysyła powiadomienia push
- **RequestNotificationService** - integruje push z systemem notyfikacji

## Konfiguracja VAPID Keys

VAPID (Voluntary Application Server Identification) keys są wymagane do wysyłania Web Push notifications.

### Generowanie kluczy

#### Opcja 1: Użyj web-push CLI (Node.js)

```bash
# Zainstaluj web-push globalnie
npm install -g web-push

# Wygeneruj klucze VAPID
web-push generate-vapid-keys
```

Otrzymasz output podobny do:

```
=======================================
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib27SDbQjfTeeAcdcvGN2ePOtfKjrTWOpaSbFc...

Private Key:
p6YrrVn5_l1-28znQ3MHhHb3qUgDk0qmYizat6h5_Yg
=======================================
```

#### Opcja 2: Użyj online generator

Możesz użyć: https://vapidkeys.com/

### Konfiguracja w aplikacji

1. **Backend** - dodaj klucze do `appsettings.Development.json`:

```json
{
  "WebPush": {
    "VapidPublicKey": "TWÓJ_PUBLIC_KEY",
    "VapidPrivateKey": "TWÓJ_PRIVATE_KEY",
    "VapidSubject": "mailto:twoj-email@autosos.pl"
  }
}
```

2. **Frontend** - dodaj public key do `.env`:

```bash
VITE_VAPID_PUBLIC_KEY=TWÓJ_PUBLIC_KEY
```

**WAŻNE:** 
- Nigdy nie commituj private key do repozytorium!
- Użyj zmiennych środowiskowych lub Azure Key Vault w produkcji
- Public key może być publiczny (stąd nazwa)

## Jak to działa

### 1. Operator włącza powiadomienia

```
Operator loguje się → Panel operatora pokazuje banner
→ Operator klika "Włącz powiadomienia"
→ Przeglądarka prosi o zgodę
→ Po akceptacji: tworzona jest subskrypcja push
→ Subskrypcja wysyłana na backend i zapisywana w DB
```

### 2. Nowe zgłoszenie przychodzi

```
Użytkownik tworzy zgłoszenie
→ RequestNotificationService znajduje operatorów w pobliżu
→ Dla każdego operatora:
   a) Wysyła powiadomienie przez SignalR (jeśli połączony)
   b) Wysyła powiadomienie przez Web Push (działa zawsze)
→ Service Worker w przeglądarce operatora otrzymuje push
→ Wyświetla powiadomienie systemowe + dźwięk + wibracje
```

### 3. Operator klika powiadomienie

```
Kliknięcie powiadomienia
→ Service Worker otwiera/fokusuje kartę z panelem operatora
→ Operator widzi nowe zgłoszenie i może wysłać ofertę
```

## Testowanie

### 1. Testowanie lokalne

```bash
# Backend
cd backend/AutoSOS.Api
dotnet run

# Frontend
cd frontend
npm run dev
```

1. Zaloguj się jako operator: http://localhost:5173/operator/login
2. Kliknij "Włącz powiadomienia" w bannerze
3. Zaakceptuj powiadomienia w przeglądarce
4. Kliknij "Test powiadomienia" - powinno wyświetlić się powiadomienie systemowe
5. Kliknij "Test dźwięku" - powinien odtworzyć się dźwięk

### 2. Testowanie z prawdziwym zgłoszeniem

1. W innej karcie/oknie otwórz: http://localhost:5173
2. Wypełnij formularz zgłoszenia jako użytkownik
3. Operator powinien otrzymać:
   - Powiadomienie systemowe (jeśli karta zamknięta/w tle)
   - Dźwięk powiadomienia
   - Nowe zgłoszenie na liście

### 3. Testowanie z zamkniętą kartą

1. Włącz powiadomienia jako operator
2. **Zamknij kartę** z panelem operatora (ale zostaw przeglądarkę otwartą)
3. Utwórz zgłoszenie jako użytkownik
4. Powinieneś otrzymać powiadomienie systemowe nawet z zamkniętą kartą!

## Ograniczenia

### Przeglądarka zamknięta
- **Windows/Linux**: Powiadomienia NIE działają gdy przeglądarka jest całkowicie zamknięta
- **macOS**: Safari może wysyłać powiadomienia nawet gdy zamknięty (zależy od systemu)
- **Rozwiązanie**: Aplikacja mobilna (planowana)

### iOS Safari
- Web Push na iOS Safari ma ograniczone wsparcie (dostępne od iOS 16.4+)
- Wymaga dodania aplikacji do ekranu głównego (Add to Home Screen)
- **Rozwiązanie**: Aplikacja mobilna natywna dla iOS

### Autoplay policy
- Dźwięki mogą być zablokowane przez autoplay policy przeglądarki
- Wymaga pierwszej interakcji użytkownika (kliknięcie "Włącz powiadomienia")
- Po pierwszej interakcji dźwięki działają normalnie

## Produkcja

### 1. Wygeneruj production VAPID keys

```bash
web-push generate-vapid-keys
```

### 2. Zapisz klucze bezpiecznie

- **Azure Key Vault** (zalecane)
- **Environment variables** na serwerze
- **GitHub Secrets** dla CI/CD

### 3. Skonfiguruj HTTPS

Web Push wymaga HTTPS (localhost jest wyjątkiem).

### 4. Skonfiguruj CORS

Upewnij się, że backend akceptuje requesty z domeny frontend:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("https://twoja-domena.pl")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
```

## Monitoring

### Logi do sprawdzenia

Backend:
```
[RequestNotificationService] Sent notifications for request {id} to {count} operators
[WebPushService] Would send push notification to {endpoint}
```

Frontend Console:
```
[Service Worker] Push received: {...}
[Service Worker] Notification clicked: {...}
```

### Metryki

- Liczba aktywnych subskrypcji: `GET /api/push-subscriptions/{operatorId}`
- Nieaktywne subskrypcje (410 Gone) - automatycznie oznaczane jako `IsActive = false`

## Troubleshooting

### Powiadomienia nie działają

1. Sprawdź czy VAPID keys są skonfigurowane
2. Sprawdź czy operator wyraził zgodę (Notification.permission === 'granted')
3. Sprawdź czy subskrypcja została zapisana w DB
4. Sprawdź logi backendu

### Dźwięk nie działa

1. Sprawdź czy użytkownik kliknął "Włącz powiadomienia" (wymaga interakcji)
2. Sprawdź czy dźwięk nie jest wyciszony w systemie
3. Sprawdź console czy nie ma błędów AudioContext

### Service Worker nie aktualizuje się

1. W Chrome DevTools → Application → Service Workers → kliknij "Update"
2. Lub użyj Ctrl+Shift+R (hard refresh)
3. Lub odznacz "Update on reload" w DevTools

## Dalsze kroki

1. **Implementacja pełnego Web Push Protocol** - obecnie używamy uproszczonej wersji
2. **Aplikacja mobilna** - natywne powiadomienia push (Firebase Cloud Messaging)
3. **Backup notifications** - email/SMS gdy operator nie reaguje przez X sekund
4. **Rich notifications** - obrazki, przyciski akcji w powiadomieniach
5. **Grupowanie powiadomień** - gdy przychodzi wiele zgłoszeń naraz

## Przydatne linki

- [Web Push Protocol (RFC 8030)](https://datatracker.ietf.org/doc/html/rfc8030)
- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN: Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [web-push library](https://github.com/web-push-libs/web-push)
- [Can I Use: Push API](https://caniuse.com/push-api)

