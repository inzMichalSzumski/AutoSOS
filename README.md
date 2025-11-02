# AutoSOS 🚗

Aplikacja PWA do wezwania pomocy drogowej. Łączy osoby potrzebujące pomocy z operatorami świadczącymi usługi pomocy drogowej (lawety, mechanicy).

## 🚀 Funkcjonalności

- **Formularz wezwania pomocy** - prosty interfejs do zgłoszenia potrzeby pomocy
- **Wybór lokalizacji** - wskazanie punktu A (start) i opcjonalnie punktu B (cel) na mapie
- **Lista dostępnych operatorów** - przeglądanie dostępnej pomocy w okolicy z cenami i czasem dojazdu
- **PWA** - aplikacja działa offline i może być zainstalowana na urządzeniu
- **Optymalizacja dla słabych sieci** - caching map i danych dla lepszej wydajności

## 🛠️ Technologie

### Frontend
- **React** + **TypeScript** - framework i typowanie
- **Vite** - build tool
- **Tailwind CSS** - styling
- **Leaflet** + **OpenStreetMap** - mapy (darmowe, bez limitu zapytań)
- **PWA** - service worker i manifest dla instalacji aplikacji

### Backend (w planach)
- **.NET 8** - backend API
- **PostgreSQL** + **Entity Framework Core** - baza danych
- **SignalR** - real-time komunikacja
- **Azure App Service** - hosting

## 📁 Struktura projektu

```
AutoSOS/
├── frontend/          # React PWA aplikacja
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── backend/           # .NET API (w planach)
```

## 🚀 Uruchomienie lokalne

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:5173`

### Build produkcyjny

```bash
cd frontend
npm run build
```

Pliki gotowe do wdrożenia znajdą się w `frontend/dist`

## 🌐 Deployment

### GitHub Pages

Projekt jest automatycznie wdrażany na GitHub Pages po każdym pushu do brancha `main`.

Aby włączyć GitHub Pages:
1. Przejdź do Settings → Pages w repozytorium
2. Wybierz "GitHub Actions" jako source
3. Workflow automatycznie wdroży aplikację po buildzie

Aplikacja będzie dostępna pod adresem:
`https://[twoja-nazwa-użytkownika].github.io/AutoSOS/`

## 📝 TODO

- [ ] Backend .NET z API
- [ ] Integracja SignalR dla real-time updates
- [ ] Baza danych PostgreSQL
- [ ] Panel operatora (aplikacja do zarządzania zgłoszeniami)
- [ ] System autentykacji
- [ ] Powiadomienia push
- [ ] Kalkulacja ceny na podstawie trasy A→B
- [ ] Historia zgłoszeń

## 🤝 Współpraca

Projekt jest w fazie rozwoju. Wszelkie sugestie i pull requesty są mile widziane!

## 📄 Licencja

MIT
