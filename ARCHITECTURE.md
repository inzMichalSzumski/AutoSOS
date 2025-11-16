# Architektura AutoSOS - Wyjaśnienie Krok po Kroku

Dokument opisuje strukturę aplikacji w kolejności tworzenia.

---

## 📦 KROK 1: Konfiguracja projektu i zależności

### `frontend/package.json`
**Co to jest:** Plik definiujący projekt Node.js - lista zależności i skrypty

**Co zawiera:**
- **Dependencies** (biblioteki potrzebne w produkcji):
  - `react`, `react-dom` - framework React
  - `react-router-dom` - routing (na razie nieużywany, przygotowany na przyszłość)
  - `leaflet`, `react-leaflet` - biblioteki do map
- **DevDependencies** (narzędzia deweloperskie):
  - `vite` - narzędzie do buildowania (szybsze niż webpack)
  - `typescript` - typowanie
  - `tailwindcss` - framework CSS
  - `vite-plugin-pwa` - konfiguracja PWA
  - `eslint` - sprawdzanie jakości kodu

**Dlaczego to pierwsze:** Zanim napiszemy kod, musimy określić, z jakich narzędzi korzystamy.

---

### `frontend/vite.config.ts`
**Co to jest:** Konfiguracja narzędzia Vite (budowa aplikacji)

**Co robi:**
1. **Pluginy:**
   - `react()` - obsługa React
   - `VitePWA()` - konfiguracja PWA:
     - `manifest` - plik JSON mówiący przeglądarce, że to aplikacja (ikonki, kolory, nazwa)
     - `workbox` - service worker do cache'owania:
       - API calls - `NetworkFirst` (najpierw sieć, potem cache) - dla słabych sieci
       - Mapy OpenStreetMap - `CacheFirst` (najpierw cache) - oszczędność danych

2. **Base path:** `/AutoSOS/` - potrzebne dla GitHub Pages (aplikacja nie jest w root)

**Dlaczego to ważne:** Vite musi wiedzieć, jak skompilować kod TypeScript/React do zwykłego JavaScript.

---

### `frontend/tsconfig.json` i `frontend/tsconfig.node.json`
**Co to jest:** Konfiguracja TypeScript

**Co robi:**
- Mówi TypeScriptowi, jak interpretować kod
- Definiuje poziomy ścisłości (`strict: true`)
- Określa, jakie biblioteki mogą być importowane (DOM, ES2020)

**Dlaczego:** TypeScript wymaga konfiguracji, aby działać poprawnie.

---

### `frontend/tailwind.config.js` i `frontend/postcss.config.js`
**Co to jest:** Konfiguracja Tailwind CSS (framework do stylów)

**Co robi:**
- Definiuje kolory (primary, danger)
- Mówi Tailwindowi, gdzie szukać klas CSS (w plikach `.tsx`, `.ts`)

**Dlaczego:** Tailwind pozwala pisać style bezpośrednio w JSX (`className="bg-blue-500"`).

---

## 🎨 KROK 2: Punkt wejścia aplikacji

### `frontend/index.html`
**Co to jest:** Główny plik HTML - jedyny plik HTML w aplikacji React

**Co zawiera:**
- `<div id="root">` - miejsce, gdzie React "wstawi" całą aplikację
- `<script src="/src/main.tsx">` - wczytanie głównego pliku JavaScript

**Jak to działa:** 
1. Przeglądarka ładuje `index.html`
2. Wczytuje `main.tsx`
3. React renderuje komponenty do `#root`

---

### `frontend/src/index.css`
**Co to jest:** Globalne style CSS

**Co zawiera:**
- `@tailwind` - importuje klasy Tailwind
- Style dla map Leaflet (naprawienie wysokości)

**Dlaczego:** Wszystkie strony dziedziczą te style.

---

### `frontend/src/main.tsx`
**Co to jest:** Punkt wejścia aplikacji React

**Co robi:**
1. Importuje `App` (główny komponent)
2. Importuje style (`index.css`, `leaflet.css`)
3. `ReactDOM.createRoot()` - renderuje `App` do elementu `#root` w HTML
4. `React.StrictMode` - tryb deweloperski React (wykrywa błędy)

**Przepływ:**
```
index.html → main.tsx → App.tsx → komponenty
```

---

## 🧩 KROK 3: Główny komponent aplikacji

### `frontend/src/App.tsx`
**Co to jest:** Główny komponent - "mózg" aplikacji

**Co robi:**

1. **Stan aplikacji (useState):**
   ```typescript
   currentRequest - aktualne zgłoszenie (null = brak zgłoszenia)
   availableOperators - lista operatorów w okolicy
   requestStatus - status zgłoszenia ('draft', 'searching', 'accepted'...)
   selectedOperator - wybrany operator
   ```

2. **Funkcje obsługi:**
   - `handleRequestSubmit` - gdy użytkownik wyśle formularz:
     - Zapisuje zgłoszenie
     - Zmienia status na 'searching'
     - Ustawia mock danych operatorów (TODO: połączenie z backendem)
   
   - `handleOperatorSelect` - gdy użytkownik kliknie operatora:
     - Zapisuje wybranego operatora
     - Zmienia status na 'offer_received'
   
   - `handleAcceptOffer` - gdy użytkownik akceptuje ofertę:
     - Status zmienia się na 'accepted'
   
   - `handleNewRequest` - resetuje wszystko (nowe zgłoszenie)

3. **Renderowanie warunkowe:**
   - Jeśli `!currentRequest` → pokazuj **HelpRequestForm**
   - Jeśli `status === 'searching'` lub `'offer_received'` → pokazuj **OperatorList**
   - W przeciwnym razie → pokazuj **RequestStatus**

**Dlaczego to ważne:** App.tsx zarządza całym przepływem użytkownika przez aplikację.

---

## 📝 KROK 4: Komponent formularza

### `frontend/src/components/HelpRequestForm.tsx`
**Co to jest:** Formularz do tworzenia zgłoszenia

**Co zawiera:**

1. **Stan lokalny:**
   - `phoneNumber`, `description` - dane formularza
   - `fromLocation`, `toLocation` - współrzędne GPS
   - `locationError` - błędy geolokalizacji
   - `mapCenter` - centrum mapy (domyślnie Warszawa)

2. **Komponent `LocationPicker`:**
   - Hook `useMapEvents` - nasłuchuje kliknięć na mapie
   - Po kliknięciu aktualizuje lokalizację
   - Wyświetla marker na mapie

3. **Funkcje:**
   - `getCurrentLocation()` - używa `navigator.geolocation` do pobrania GPS
   - `handleSubmit()` - waliduje dane i tworzy obiekt `HelpRequest`

4. **UI:**
   - Input telefonu
   - Textarea opisu
   - Dwie mapy Leaflet:
     - Mapa A (wymagana) - lokalizacja startowa
     - Mapa B (opcjonalna) - lokalizacja docelowa
   - Przycisk submit

**Przepływ:**
```
Użytkownik wypełnia formularz 
→ klika "Znajdź dostępną pomoc" 
→ handleSubmit tworzy HelpRequest 
→ wywołuje onSubmit(request) 
→ App.tsx odbiera i przechodzi do następnego ekranu
```

---

## 🏢 KROK 5: Lista operatorów

### `frontend/src/components/OperatorList.tsx`
**Co to jest:** Ekran wyboru operatora

**Co robi:**

1. **Stany wyświetlania:**
   - Jeśli `status === 'searching' && operators.length === 0` → pokazuje loader
   - Jeśli `operators.length === 0` → komunikat "brak operatorów"
   - W przeciwnym razie → lista operatorów

2. **Renderowanie operatora:**
   - Karta z nazwą, typem pojazdu
   - Cena, czas dojazdu, dystans
   - Numer telefonu
   - Efekt hover (powiększenie)
   - Jeśli wybrany → zielony przycisk "Akceptuję ofertę"

3. **Interakcje:**
   - Kliknięcie na kartę → wybór operatora (`onSelect`)
   - Kliknięcie "Akceptuję" → akceptacja oferty (`onAccept`)

**Dlaczego osobny komponent:** Dzięki temu App.tsx jest prostszy, łatwiej testować.

---

## 📊 KROK 6: Status zgłoszenia

### `frontend/src/components/RequestStatus.tsx`
**Co to jest:** Ekran pokazujący szczegóły zgłoszenia

**Co zawiera:**

1. **Słowniki (maps):**
   - `statusMessages` - tłumaczenie statusu na polski
   - `statusColors` - kolory dla różnych statusów

2. **Wyświetlane informacje:**
   - Status zgłoszenia (kolorowa etykieta)
   - Dane operatora (jeśli wybrany)
   - Numer telefonu użytkownika
   - Opis problemu
   - Lokalizacja A (link do Google Maps)
   - Lokalizacja B (jeśli podana)
   - Przycisk "Nowe Zgłoszenie"

**Dlaczego:** Użytkownik musi widzieć, co się dzieje z jego zgłoszeniem.

---

## 🚀 KROK 7: Deployment (GitHub Actions)

### `.github/workflows/deploy-frontend.yml`
**Co to jest:** Automatyczny proces wdrożenia na GitHub Pages

**Co robi:**

1. **Trigger:** Uruchamia się gdy:
   - Push do brancha `main` (i zmiany w `frontend/**`)
   - Ręczne uruchomienie (`workflow_dispatch`)

2. **Job "build":**
   - Pobiera kod (`checkout`)
   - Instaluje Node.js 20
   - Instaluje zależności (`npm ci`)
   - Buduje aplikację (`npm run build`)
   - Tworzy artifact (pliki w `frontend/dist`)

3. **Job "deploy":**
   - Pobiera artifact z buildu
   - Wysyła na GitHub Pages

**Dlaczego automatycznie:** Po każdym merge do `main` aplikacja automatycznie się aktualizuje.

---

## 🔄 Przepływ danych w aplikacji

```
1. Użytkownik wypełnia HelpRequestForm
   ↓
2. handleSubmit tworzy HelpRequest obiekt
   ↓
3. onSubmit(request) → App.tsx.handleRequestSubmit
   ↓
4. App.tsx ustawia currentRequest, requestStatus='searching'
   ↓
5. App.tsx renderuje OperatorList
   ↓
6. Użytkownik klika operatora
   ↓
7. onSelect(operator) → App.tsx.handleOperatorSelect
   ↓
8. App.tsx ustawia selectedOperator, status='offer_received'
   ↓
9. Użytkownik klika "Akceptuję ofertę"
   ↓
10. onAccept() → App.tsx.handleAcceptOffer
   ↓
11. App.tsx ustawia status='accepted'
   ↓
12. App.tsx renderuje RequestStatus
```

---

## 📁 Struktura plików (podsumowanie)

```
frontend/
├── package.json          # Zależności Node.js
├── vite.config.ts        # Konfiguracja buildowania + PWA
├── tsconfig.json         # Konfiguracja TypeScript
├── tailwind.config.js    # Konfiguracja Tailwind CSS
├── index.html            # Główny HTML (punkt wejścia)
└── src/
    ├── main.tsx          # Renderuje App do #root
    ├── index.css         # Globalne style
    ├── App.tsx           # Główny komponent (logika aplikacji)
    └── components/
        ├── HelpRequestForm.tsx   # Formularz zgłoszenia
        ├── OperatorList.tsx      # Lista operatorów
        └── RequestStatus.tsx     # Status zgłoszenia
```

---

## 🎯 Kluczowe koncepcje

### State Management
- **Lokalny stan:** `useState` w każdym komponencie
- **Główny stan:** W `App.tsx` (currentRequest, operators, status)
- **Komunikacja:** Komponenty przekazują dane przez `props` i callbacki (`onSubmit`, `onSelect`)

### React Patterns
- **Komponenty funkcyjne:** Wszystkie komponenty to funkcje
- **Hooks:** `useState`, `useEffect`, `useMapEvents`
- **Conditional Rendering:** `if/else` w JSX

### TypeScript
- **Interfejsy:** Definicje typów (`HelpRequest`, `Operator`, `Location`)
- **Type safety:** TypeScript sprawdza typy w kompilacji

### PWA
- **Service Worker:** Cache'uje zasoby dla offline
- **Manifest:** Informacje dla przeglądarki (ikonki, kolory)
- **Strategie cache:** Różne dla API i map

---

## ❓ FAQ

**Q: Dlaczego dwa MapContainer w HelpRequestForm?**  
A: Jeden dla lokalizacji A (wymagany), drugi dla B (opcjonalny). Każda ma własny marker.

**Q: Dlaczego base: '/AutoSOS/' w vite.config?**  
A: GitHub Pages hostuje pod `/AutoSOS/`, nie w root. Musimy o tym poinformować Vite.

**Q: Gdzie są dane z backendu?**  
A: Na razie mock (w `App.tsx.handleRequestSubmit`). TODO: połączenie z API.

**Q: Jak działa PWA?**  
A: Service Worker cache'uje pliki. Po pierwszym otwarciu działa offline (mapy są w cache).

---

To wszystko! Jeśli masz pytania do konkretnego pliku - pytaj 😊

