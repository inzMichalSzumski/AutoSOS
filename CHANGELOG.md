# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-11-27

### Added - Operator Panel Notifications

#### Frontend
- **Web Push Notifications** - powiadomienia systemowe nawet gdy karta jest zamknięta
  - Service Worker z obsługą push events (`frontend/public/sw-custom.js`)
  - Push Notification Service (`frontend/src/services/pushNotifications.ts`)
  - Integracja z Web Push API
  - Subskrypcje VAPID dla bezpiecznej komunikacji

- **Notification Sounds** - dźwiękowe powiadomienia dla operatorów
  - Notification Sound Service (`frontend/src/services/notificationSound.ts`)
  - Web Audio API do generowania dźwięków
  - Dwa typy dźwięków: normalny (2-tonowy) i urgent (3-tonowy)
  - Automatyczne odtwarzanie przy nowych zgłoszeniach

- **Notification Permission Banner** - UI do zarządzania powiadomieniami
  - Komponent proszący o zgodę na powiadomienia (`frontend/src/components/NotificationPermissionBanner.tsx`)
  - Status indicator gdy powiadomienia włączone
  - Przyciski testowe: "Test powiadomienia" i "Test dźwięku"
  - Instrukcje odblokowania gdy powiadomienia zablokowane

- **Operator Panel Enhancements**
  - Integracja z push notifications
  - Automatyczne dźwięki przy nowych zgłoszeniach przez SignalR
  - Real-time aktualizacje listy zgłoszeń

#### Backend
- **PushSubscription Model** - model do przechowywania subskrypcji push
  - Endpoint, P256DH key, Auth key
  - Tracking aktywności subskrypcji
  - Automatyczne oznaczanie nieaktywnych subskrypcji

- **Push Subscription Endpoints** - API do zarządzania subskrypcjami
  - `POST /api/push-subscriptions` - zapisz subskrypcję
  - `DELETE /api/push-subscriptions` - usuń subskrypcję
  - `GET /api/push-subscriptions/{operatorId}` - lista subskrypcji operatora

- **WebPushService** - serwis do wysyłania powiadomień push
  - Integracja z Web Push Protocol (RFC 8030)
  - VAPID authentication
  - Obsługa wielu subskrypcji na operatora
  - Automatyczne usuwanie nieaktywnych subskrypcji (410 Gone)

- **RequestNotificationService Updates** - rozszerzenie systemu notyfikacji
  - Wysyłanie powiadomień przez SignalR (real-time)
  - Wysyłanie powiadomień przez Web Push (background)
  - Dual-channel notifications dla maksymalnej niezawodności

#### Database
- **Migration: AddPushSubscriptions** - nowa tabela PushSubscriptions
  - Relacja z Operators (cascade delete)
  - Indeksy na OperatorId i Endpoint
  - Tracking CreatedAt i LastUsedAt

#### Configuration
- **VAPID Keys Configuration** - konfiguracja kluczy VAPID
  - Placeholder w appsettings.Development.json
  - Instrukcje generowania kluczy
  - Environment variables support

#### Documentation
- **WEB_PUSH_SETUP.md** - kompletny przewodnik po Web Push
  - Architektura systemu powiadomień
  - Instrukcje generowania VAPID keys
  - Konfiguracja frontend i backend
  - Jak to działa (flow diagramy)
  - Testowanie i debugging
  - Ograniczenia i znane problemy
  - Deployment do produkcji

- **OPERATOR_PANEL.md** - dokumentacja panelu operatora
  - Przegląd funkcji
  - Przepływy pracy (scenariusze)
  - Konfiguracja operatora
  - Powiadomienia (włączanie, testowanie)
  - Troubleshooting
  - API endpoints
  - Wsparcie przeglądarek

- **TESTING_NOTIFICATIONS.md** - instrukcje testowania
  - 8 szczegółowych scenariuszy testowych
  - Checklist końcowy
  - Debugging tips
  - Znane problemy i rozwiązania

#### Updates
- **README.md** - aktualizacja głównej dokumentacji
  - Nowa sekcja "Features" z podziałem na Users/Operators/Technical
  - Aktualizacja listy technologii
  - Status projektu (v0.2)
  - Linki do nowej dokumentacji

### Technical Details

#### Service Worker
- Custom service worker dla obsługi push events
- Integracja z Workbox (vite-plugin-pwa)
- Obsługa notification click events
- Automatyczne otwieranie/fokusowanie aplikacji

#### Audio System
- Web Audio API dla generowania dźwięków
- Obejście autoplay policy (wymaga interakcji użytkownika)
- Dwa typy powiadomień dźwiękowych
- Graceful degradation gdy audio niedostępne

#### Push Notifications
- VAPID authentication dla bezpieczeństwa
- Dual-channel delivery (SignalR + Web Push)
- Automatic retry dla nieudanych wysyłek
- Subscription lifecycle management

#### Real-time Updates
- SignalR dla aktywnych połączeń
- Web Push dla zamkniętych kart
- Polling jako backup (co 30 sekund)
- Automatic reconnection

### Configuration Required

⚠️ **IMPORTANT**: Przed uruchomieniem w produkcji:

1. Wygeneruj VAPID keys:
   ```bash
   npm install -g web-push
   web-push generate-vapid-keys
   ```

2. Dodaj klucze do konfiguracji:
   - Backend: `appsettings.json` → `WebPush:VapidPublicKey/PrivateKey`
   - Frontend: `.env` → `VITE_VAPID_PUBLIC_KEY`

3. Zastosuj migrację bazy danych:
   ```bash
   cd backend/AutoSOS.Api
   dotnet ef database update
   ```

### Browser Support

- ✅ Chrome 90+ (full support)
- ✅ Edge 90+ (full support)
- ✅ Firefox 88+ (full support)
- ⚠️ Safari 16.4+ (limited - requires Add to Home Screen)
- ❌ iOS Safari < 16.4 (no Web Push support)

### Known Limitations

1. **Browser closed**: Powiadomienia nie działają gdy przeglądarka jest całkowicie zamknięta (Windows/Linux)
2. **iOS Safari**: Ograniczone wsparcie, wymaga dodania do ekranu głównego
3. **Autoplay policy**: Dźwięki wymagają pierwszej interakcji użytkownika
4. **VAPID keys**: Muszą być wygenerowane i skonfigurowane ręcznie

### Future Improvements

- [ ] Pełna implementacja Web Push Protocol z encryption
- [ ] Aplikacja mobilna (natywne powiadomienia)
- [ ] Rich notifications (obrazki, przyciski akcji)
- [ ] Backup notifications (email/SMS)
- [ ] Grupowanie powiadomień

---

## [0.1.0] - 2025-11-20

### Added - Initial MVP

#### Frontend
- React + TypeScript application
- PWA with service worker
- Leaflet maps integration
- User help request form
- Operator list component
- Request status tracking

#### Backend
- .NET 10 API
- SQL Server database
- Entity Framework Core
- SignalR for real-time communication
- JWT authentication
- BCrypt password hashing

#### Features
- User can create help requests
- Location selection on map (A → B)
- Operator registration and login
- Basic operator panel
- Request and offer management
- Real-time updates via SignalR

#### Database
- Users table
- Operators table
- Requests table
- Offers table
- Equipment table
- OperatorEquipment junction table

#### Documentation
- README.md
- ROADMAP.md
- ARCHITECTURE.md
- CODE_STYLE.md
- SECURITY_TASKS.md

[Unreleased]: https://github.com/InzMichalSzumski/AutoSOS/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/InzMichalSzumski/AutoSOS/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/InzMichalSzumski/AutoSOS/releases/tag/v0.1.0

