# Testowanie Systemu Powiadomień - Instrukcja

## Przygotowanie środowiska

### 1. Uruchom backend

```bash
cd backend/AutoSOS.Api
dotnet run
```

Backend powinien być dostępny na `http://localhost:5000`

### 2. Uruchom frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend powinien być dostępny na `http://localhost:5173`

### 3. Sprawdź bazę danych

Upewnij się, że migracja została zastosowana:

```bash
cd backend/AutoSOS.Api
dotnet ef database update
```

## Test 1: Rejestracja i logowanie operatora

### Krok 1: Zarejestruj operatora

1. Otwórz: http://localhost:5173/operator/register
2. Wypełnij formularz:
   - Nazwa: "Test Operator"
   - Telefon: "+48123456789"
   - Email: "operator@test.pl"
   - Hasło: "Test123!"
   - Typ pojazdu: "Laweta"
3. Kliknij "Zarejestruj się"

### Krok 2: Zaloguj się

1. Zostaniesz przekierowany do logowania
2. Zaloguj się używając:
   - Email: "operator@test.pl"
   - Hasło: "Test123!"
3. Powinieneś zobaczyć panel operatora

**Oczekiwany rezultat**: ✅ Operator zalogowany, widoczny panel z nagłówkiem "Panel Operatora"

## Test 2: Włączanie powiadomień

### Krok 1: Banner powiadomień

1. W panelu operatora powinieneś zobaczyć niebieski banner:
   "Włącz powiadomienia o nowych zgłoszeniach"

### Krok 2: Włącz powiadomienia

1. Kliknij przycisk "Włącz powiadomienia"
2. Przeglądarka pokaże dialog z prośbą o zgodę
3. Kliknij "Zezwól" / "Allow"

### Krok 3: Weryfikacja

1. Banner powinien zmienić się na zielony: "Powiadomienia włączone"
2. Powinieneś usłyszeć dźwięk powiadomienia (2-tonowy beep)

**Oczekiwany rezultat**: 
- ✅ Banner zmienił kolor na zielony
- ✅ Dźwięk został odtworzony
- ✅ W konsoli przeglądarki: "Subscribed to push notifications"

### Krok 4: Test powiadomienia

1. Kliknij "Test powiadomienia" w zielonym bannerze
2. Powinieneś zobaczyć powiadomienie systemowe:
   - Tytuł: "AutoSOS - Test"
   - Treść: "Powiadomienia działają poprawnie!"

**Oczekiwany rezultat**: ✅ Powiadomienie systemowe wyświetlone

### Krok 5: Test dźwięku

1. Kliknij "Test dźwięku" w zielonym bannerze
2. Powinieneś usłyszeć 3-tonowy dźwięk (urgent)

**Oczekiwany rezultat**: ✅ Dźwięk urgent odtworzony (3 tony)

## Test 3: SignalR - Powiadomienia w czasie rzeczywistym (karta otwarta)

### Krok 1: Przygotowanie

1. Zostaw panel operatora otwarty w jednej karcie
2. Otwórz nową kartę: http://localhost:5173 (strona użytkownika)

### Krok 2: Utwórz zgłoszenie jako użytkownik

1. W karcie użytkownika wypełnij formularz:
   - Telefon: "+48987654321"
   - Opis: "Test zgłoszenia - potrzebuję lawety"
2. Kliknij na mapie A (lokalizacja startowa) - np. centrum Warszawy
3. Kliknij "Znajdź dostępną pomoc"

### Krok 3: Sprawdź panel operatora

1. Przełącz się na kartę z panelem operatora
2. W ciągu 1-2 sekund powinieneś:
   - Usłyszeć dźwięk powiadomienia (3-tonowy urgent)
   - Zobaczyć nowe zgłoszenie na liście

**Oczekiwany rezultat**:
- ✅ Dźwięk powiadomienia odtworzony
- ✅ Zgłoszenie pojawiło się na liście
- ✅ Widoczne: numer telefonu, dystans, opis
- ✅ W konsoli: "New request received: {id}"

### Krok 4: Wyślij ofertę

1. Kliknij "Wyślij ofertę" przy zgłoszeniu
2. Wypełnij:
   - Cena: 250
   - Szacowany czas: 30
3. Kliknij "Wyślij ofertę"

**Oczekiwany rezultat**:
- ✅ Alert: "Oferta została wysłana!"
- ✅ Zgłoszenie znika z listy (ma już ofertę)

## Test 4: Web Push - Powiadomienia z zamkniętą kartą

### Krok 1: Przygotowanie

1. Upewnij się, że powiadomienia są włączone (zielony banner)
2. **Zamknij kartę** z panelem operatora (ale zostaw przeglądarkę otwartą!)
3. Zostaw otwartą tylko kartę użytkownika

### Krok 2: Utwórz nowe zgłoszenie

1. W karcie użytkownika utwórz nowe zgłoszenie:
   - Telefon: "+48111222333"
   - Opis: "Test powiadomienia push"
2. Kliknij na mapie i wyślij zgłoszenie

### Krok 3: Sprawdź powiadomienie systemowe

1. Po ~2-3 sekundach powinieneś zobaczyć powiadomienie systemowe:
   - Tytuł: "AutoSOS - Nowe zgłoszenie"
   - Treść: "Nowe zgłoszenie w odległości X km"
   - Dźwięk + wibracje (jeśli obsługiwane)

**Oczekiwany rezultat**:
- ✅ Powiadomienie systemowe wyświetlone (mimo zamkniętej karty!)
- ✅ Dźwięk odtworzony
- ✅ Wibracje (na urządzeniach mobilnych)

### Krok 4: Kliknij powiadomienie

1. Kliknij na powiadomienie systemowe
2. Powinna otworzyć się nowa karta z panelem operatora
3. Zgłoszenie powinno być widoczne na liście

**Oczekiwany rezultat**:
- ✅ Panel operatora otwarty
- ✅ Zgłoszenie widoczne na liście

## Test 5: Automatyczne rozszerzanie zasięgu

### Krok 1: Przygotowanie

1. Zamknij **całą przeglądarkę** (operator offline)
2. Otwórz tylko kartę użytkownika

### Krok 2: Utwórz zgłoszenie

1. Utwórz nowe zgłoszenie jako użytkownik
2. Poczekaj 30 sekund

### Krok 3: Sprawdź logi backendu

W konsoli backendu powinieneś zobaczyć:

```
[RequestNotificationService] Sent notifications for request {id} to {count} operators (expansion 0)
... (po 30 sekundach)
[RequestNotificationService] Sent notifications for request {id} to {count} operators (expansion 1)
... (po kolejnych 30 sekundach)
[RequestNotificationService] Sent notifications for request {id} to {count} operators (expansion 2)
```

**Oczekiwany rezultat**:
- ✅ System automatycznie rozszerza zasięg co 30 sekund
- ✅ Maksymalnie 3 rozszerzenia (15 + 10 + 10 + 10 operatorów)
- ✅ Po 4 rozszerzeniach bez odpowiedzi - zgłoszenie anulowane

## Test 6: Wielokrotne zgłoszenia

### Krok 1: Otwórz panel operatora

1. Zaloguj się jako operator
2. Upewnij się, że powiadomienia są włączone

### Krok 2: Utwórz wiele zgłoszeń

1. W osobnych kartach utwórz 3 zgłoszenia jako użytkownik
2. Odstęp między zgłoszeniami: ~5 sekund

### Krok 3: Sprawdź panel operatora

**Oczekiwany rezultat**:
- ✅ Wszystkie 3 zgłoszenia widoczne na liście
- ✅ Dźwięk odtworzony dla każdego zgłoszenia
- ✅ Zgłoszenia posortowane według odległości (najbliższe na górze)

## Test 7: Odświeżanie listy

### Krok 1: Ręczne odświeżanie

1. W panelu operatora kliknij przycisk "🔄 Odśwież"
2. Lista powinna się zaktualizować

**Oczekiwany rezultat**:
- ✅ Przycisk zmienia się na "Ładowanie..."
- ✅ Lista zgłoszeń zaktualizowana
- ✅ Spinner widoczny podczas ładowania

### Krok 2: Automatyczne odświeżanie

1. Poczekaj 30 sekund bez interakcji
2. Lista powinna się automatycznie odświeżyć (polling)

**Oczekiwany rezultat**:
- ✅ Lista automatycznie odświeżona po 30 sekundach
- ✅ W konsoli: "Loading requests..."

## Test 8: Obsługa błędów

### Test 8.1: Brak połączenia z backendem

1. Zatrzymaj backend (Ctrl+C)
2. Spróbuj odświeżyć listę w panelu operatora

**Oczekiwany rezultat**:
- ✅ W konsoli: "Error loading requests"
- ✅ Lista pozostaje niezmieniona (nie crashuje)

### Test 8.2: Blokada powiadomień

1. W ustawieniach przeglądarki zablokuj powiadomienia dla localhost
2. Spróbuj włączyć powiadomienia w panelu

**Oczekiwany rezultat**:
- ✅ Banner pokazuje komunikat o blokadzie
- ✅ Instrukcje jak odblokować powiadomienia
- ✅ Przycisk "Włącz powiadomienia" zablokowany

### Test 8.3: Nieobsługiwana przeglądarka

1. Otwórz aplikację w starszej przeglądarce (np. IE11)

**Oczekiwany rezultat**:
- ✅ Banner pokazuje: "Twoja przeglądarka nie obsługuje powiadomień push"
- ✅ Aplikacja nadal działa (graceful degradation)

## Checklist końcowy

Po wykonaniu wszystkich testów sprawdź:

- [ ] Operator może się zarejestrować i zalogować
- [ ] Powiadomienia można włączyć (zgoda użytkownika)
- [ ] Test powiadomienia działa
- [ ] Test dźwięku działa
- [ ] SignalR wysyła powiadomienia w czasie rzeczywistym
- [ ] Dźwięk odtwarzany przy nowych zgłoszeniach
- [ ] Web Push działa z zamkniętą kartą
- [ ] Kliknięcie powiadomienia otwiera panel
- [ ] Operator może wysłać ofertę
- [ ] Lista zgłoszeń się aktualizuje
- [ ] Automatyczne rozszerzanie zasięgu działa
- [ ] Obsługa błędów działa poprawnie

## Debugging

### Sprawdź Service Worker

1. Otwórz DevTools (F12)
2. Zakładka "Application" → "Service Workers"
3. Sprawdź czy service worker jest aktywny

### Sprawdź Push Subscription

1. W konsoli przeglądarki:

```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub)
  })
})
```

### Sprawdź logi backendu

```
[RequestNotificationService] Sent notifications for request {id} to {count} operators
[WebPushService] Would send push notification to {endpoint}
```

### Sprawdź bazę danych

```sql
-- Sprawdź subskrypcje
SELECT * FROM PushSubscriptions WHERE IsActive = 1

-- Sprawdź operatorów
SELECT * FROM Operators WHERE IsAvailable = 1

-- Sprawdź zgłoszenia
SELECT * FROM Requests WHERE Status = 'Searching'
```

## Znane problemy

### Dźwięk nie działa przy pierwszym załadowaniu

**Problem**: Autoplay policy przeglądarki blokuje dźwięk

**Rozwiązanie**: Użytkownik musi kliknąć "Włącz powiadomienia" (interakcja)

### Powiadomienia nie działają na iOS Safari < 16.4

**Problem**: Brak wsparcia dla Web Push

**Rozwiązanie**: Użyj nowszej wersji iOS lub aplikacji mobilnej

### SignalR rozłącza się po dłuższym czasie

**Problem**: Timeout połączenia

**Rozwiązanie**: SignalR automatycznie się ponownie łączy (withAutomaticReconnect)

## Wsparcie

Jeśli masz problemy z testowaniem:

1. Sprawdź logi w konsoli przeglądarki (F12)
2. Sprawdź logi backendu
3. Sprawdź czy wszystkie serwisy są uruchomione
4. Sprawdź dokumentację: [WEB_PUSH_SETUP.md](WEB_PUSH_SETUP.md)

