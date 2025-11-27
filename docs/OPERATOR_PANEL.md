# Panel Operatora - Dokumentacja

## Przegląd

Panel operatora to interfejs webowy dla operatorów pomocy drogowej, który umożliwia:
- Otrzymywanie powiadomień o nowych zgłoszeniach w czasie rzeczywistym
- Przeglądanie dostępnych zgłoszeń
- Wysyłanie ofert pomocy użytkownikom
- Zarządzanie powiadomieniami push

## Funkcje

### 1. Powiadomienia Real-Time

#### SignalR (WebSocket)
- Natychmiastowe powiadomienia gdy karta jest otwarta
- Automatyczne dźwięki przy nowych zgłoszeniach
- Brak opóźnień

#### Web Push Notifications
- Powiadomienia systemowe nawet gdy karta zamknięta
- Działa w tle (przeglądarka musi być otwarta)
- Dźwięk + wibracje
- Klikalne - otwiera panel operatora

### 2. Lista zgłoszeń

Operator widzi:
- **ID zgłoszenia** - unikalny identyfikator
- **Numer telefonu** - kontakt do użytkownika
- **Dystans** - odległość od operatora (w km)
- **Status** - Oczekujące / Szukanie
- **Opis** - dodatkowe informacje od użytkownika
- **Data utworzenia** - kiedy zgłoszenie zostało utworzone

Zgłoszenia są sortowane według odległości (najbliższe na górze).

### 3. Wysyłanie ofert

Operator może wysłać ofertę zawierającą:
- **Cenę** (wymagane) - koszt usługi w PLN
- **Szacowany czas** (opcjonalne) - czas przyjazdu w minutach

Po wysłaniu oferty:
- Użytkownik otrzymuje powiadomienie
- Zgłoszenie znika z listy operatora (już ma ofertę)
- Użytkownik może zaakceptować lub odrzucić ofertę

### 4. Automatyczne odświeżanie

- **SignalR** - natychmiastowe aktualizacje
- **Polling** - co 30 sekund (backup)
- **Ręczne odświeżanie** - przycisk "Odśwież"

## Przepływ pracy

### Scenariusz 1: Operator online z włączonymi powiadomieniami

```
1. Operator loguje się do panelu
2. Włącza powiadomienia push (jednorazowo)
3. Użytkownik tworzy zgłoszenie
4. Operator otrzymuje:
   - Powiadomienie w aplikacji (SignalR)
   - Dźwięk powiadomienia
   - Nowe zgłoszenie pojawia się na liście
5. Operator klika "Wyślij ofertę"
6. Wypełnia cenę i czas
7. Wysyła ofertę
8. Użytkownik otrzymuje ofertę
```

### Scenariusz 2: Operator z zamkniętą kartą

```
1. Operator ma włączone powiadomienia
2. Zamyka kartę z panelem (ale przeglądarka jest otwarta)
3. Użytkownik tworzy zgłoszenie
4. Operator otrzymuje:
   - Powiadomienie systemowe (Windows notification)
   - Dźwięk + wibracje
5. Operator klika powiadomienie
6. Otwiera się panel operatora
7. Operator widzi zgłoszenie i wysyła ofertę
```

### Scenariusz 3: Operator offline

```
1. Operator jest offline (przeglądarka zamknięta)
2. Użytkownik tworzy zgłoszenie
3. System szuka innych operatorów w pobliżu
4. Po 30 sekundach bez odpowiedzi - rozszerza zasięg
5. Maksymalnie 3 rozszerzenia (15 + 10 + 10 + 10 operatorów)
6. Jeśli nikt nie odpowie - zgłoszenie anulowane
```

## Konfiguracja operatora

### Dane operatora (w bazie danych)

```csharp
public class Operator
{
    public string Name { get; set; }              // Nazwa firmy/operatora
    public string Phone { get; set; }             // Telefon kontaktowy
    public string VehicleType { get; set; }       // Typ pojazdu (laweta, holownik)
    public bool IsAvailable { get; set; }         // Czy dostępny
    public double? CurrentLatitude { get; set; }  // Aktualna lokalizacja
    public double? CurrentLongitude { get; set; }
    public int? ServiceRadiusKm { get; set; }     // Promień działania (domyślnie 20km)
}
```

### Aktualizacja lokalizacji

Operator może zaktualizować swoją lokalizację przez API:

```typescript
await apiClient.updateOperatorLocation(operatorId, latitude, longitude)
```

### Dostępność

Operator może zmienić swój status dostępności:

```typescript
await apiClient.updateOperatorAvailability(operatorId, isAvailable)
```

## Powiadomienia

### Włączanie powiadomień

1. Operator widzi banner "Włącz powiadomienia"
2. Klika "Włącz powiadomienia"
3. Przeglądarka prosi o zgodę
4. Po akceptacji:
   - Tworzona jest subskrypcja push
   - Subskrypcja zapisywana w bazie danych
   - Odtwarzany jest testowy dźwięk
5. Banner zmienia się na status "Powiadomienia włączone"

### Testowanie powiadomień

Operator może przetestować:
- **Test powiadomienia** - wyświetla testowe powiadomienie systemowe
- **Test dźwięku** - odtwarza dźwięk powiadomienia (3-tonowy urgent)

### Typy dźwięków

- **Normalny** - 2-tonowy (A5 → E5)
- **Pilny** - 3-tonowy (A5 → A5 → C6) - używany dla nowych zgłoszeń

## Bezpieczeństwo

### Autentykacja

Panel operatora wymaga logowania:
- **JWT token** - przechowywany w localStorage
- **Token expiration** - automatyczne wylogowanie po wygaśnięciu
- **Protected routes** - nieautoryzowani przekierowani do logowania

### Autoryzacja

Tylko zalogowani operatorzy mogą:
- Widzieć dostępne zgłoszenia
- Wysyłać oferty
- Zapisywać subskrypcje push

### CORS

Backend akceptuje requesty tylko z:
- `http://localhost:5173` (development)
- `https://inzmichalszumski.github.io` (production)

## Optymalizacja

### Wydajność

- **SignalR connection pooling** - jedno połączenie na operatora
- **Request caching** - cache zgłoszeń na 30 sekund
- **Lazy loading** - komponenty ładowane on-demand
- **Debouncing** - ograniczenie częstotliwości requestów

### Sieć

- **Automatic reconnection** - SignalR automatycznie się łączy
- **Offline detection** - wykrywa brak połączenia
- **Retry logic** - ponawia nieudane requesty

### UX

- **Loading states** - wskaźniki ładowania
- **Error handling** - przyjazne komunikaty błędów
- **Optimistic updates** - natychmiastowa reakcja UI
- **Skeleton screens** - placeholdery podczas ładowania

## Troubleshooting

### Nie otrzymuję powiadomień

**Problem**: Operator nie otrzymuje powiadomień o nowych zgłoszeniach

**Rozwiązania**:
1. Sprawdź czy powiadomienia są włączone (zielony banner)
2. Sprawdź czy status operatora to "Dostępny" (`IsAvailable = true`)
3. Sprawdź czy lokalizacja operatora jest ustawiona
4. Sprawdź czy zgłoszenie jest w promieniu działania (domyślnie 20km)
5. Sprawdź logi backendu

### Dźwięk nie działa

**Problem**: Powiadomienia przychodzą, ale bez dźwięku

**Rozwiązania**:
1. Sprawdź czy kliknąłeś "Włącz powiadomienia" (wymaga interakcji użytkownika)
2. Sprawdź czy dźwięk nie jest wyciszony w systemie
3. Sprawdź czy przeglądarka ma pozwolenie na odtwarzanie dźwięku
4. Użyj "Test dźwięku" do weryfikacji

### SignalR się rozłącza

**Problem**: Połączenie SignalR często się rozłącza

**Rozwiązania**:
1. Sprawdź stabilność połączenia internetowego
2. SignalR automatycznie się ponownie łączy
3. Sprawdź logi konsoli przeglądarki
4. Sprawdź czy backend jest dostępny

### Zgłoszenia nie pojawiają się na liście

**Problem**: Lista zgłoszeń jest pusta mimo że są zgłoszenia

**Rozwiązania**:
1. Kliknij "Odśwież"
2. Sprawdź czy operator jest dostępny (`IsAvailable = true`)
3. Sprawdź czy lokalizacja operatora jest ustawiona
4. Sprawdź czy zgłoszenia są w promieniu działania
5. Sprawdź czy zgłoszenia nie mają już ofert (wtedy znikają z listy)

## Metryki i monitoring

### Kluczowe metryki

- **Czas reakcji operatora** - od otrzymania powiadomienia do wysłania oferty
- **Wskaźnik odpowiedzi** - % zgłoszeń z ofertą vs. bez oferty
- **Aktywni operatorzy** - liczba operatorów online
- **Subskrypcje push** - liczba aktywnych subskrypcji

### Logi do monitorowania

```
[OperatorApp] Connected to SignalR
[OperatorApp] New request received: {id}
[OperatorApp] Offer submitted: {offerId}
[NotificationPermissionBanner] Notifications enabled
[PushNotificationService] Subscribed to push notifications
```

## Przyszłe ulepszenia

### Krótkoterminowe
- [ ] Mapa ze zgłoszeniami i lokalizacją operatora
- [ ] Filtrowanie zgłoszeń (po dystansie, dacie)
- [ ] Historia wysłanych ofert
- [ ] Statystyki operatora (liczba ofert, akceptacji)

### Średnioterminowe
- [ ] Chat z użytkownikiem
- [ ] Nawigacja GPS do zgłoszenia
- [ ] Zdjęcia zgłoszenia
- [ ] Oceny i opinie użytkowników

### Długoterminowe
- [ ] Aplikacja mobilna (iOS/Android)
- [ ] Integracja z systemami płatności
- [ ] Automatyczne fakturowanie
- [ ] CRM dla operatorów

## API Endpoints

### Zgłoszenia

```
GET  /api/requests/available          - Lista dostępnych zgłoszeń
GET  /api/requests/{id}                - Szczegóły zgłoszenia
```

### Oferty

```
POST /api/offers                       - Wyślij ofertę
```

### Operator

```
PUT  /api/operators/{id}/location      - Zaktualizuj lokalizację
PUT  /api/operators/{id}/availability  - Zmień dostępność
```

### Push Notifications

```
POST   /api/push-subscriptions         - Zapisz subskrypcję
DELETE /api/push-subscriptions         - Usuń subskrypcję
GET    /api/push-subscriptions/{id}    - Lista subskrypcji operatora
```

### SignalR Hub

```
/hubs/request                          - Hub dla real-time komunikacji

Events:
- NewRequest       - Nowe zgłoszenie
- OfferReceived    - Oferta otrzymana przez użytkownika
- RequestTimeout   - Zgłoszenie anulowane (timeout)
```

## Wsparcie przeglądarek

### Pełne wsparcie
- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+
- ✅ Safari 16.4+ (z ograniczeniami)

### Ograniczone wsparcie
- ⚠️ Safari < 16.4 (brak Web Push)
- ⚠️ iOS Safari (wymaga Add to Home Screen)

### Brak wsparcia
- ❌ Internet Explorer
- ❌ Opera Mini

