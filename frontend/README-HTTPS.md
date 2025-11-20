# HTTPS dla Developmentu

Aplikacja używa HTTPS w trybie deweloperskim, aby geolokalizacja działała na telefonie.

## Jak to działa

1. Vite automatycznie generuje self-signed certificate
2. Przy pierwszym uruchomieniu przeglądarka pokaże ostrzeżenie o niezaufanym certyfikacie
3. Musisz zaakceptować certyfikat (kliknij "Zaawansowane" → "Przejdź do strony")

## Uruchomienie

```bash
npm run dev
```

Serwer będzie dostępny pod adresem `https://localhost:5173` (lub inny port jeśli 5173 jest zajęty).

## Dostęp z telefonu

1. Upewnij się, że komputer i telefon są w tej samej sieci WiFi
2. Znajdź IP komputera:
   - Windows: `ipconfig` → szukaj "IPv4 Address"
   - Mac/Linux: `ifconfig` lub `ip addr`
3. Na telefonie otwórz: `https://[IP-KOMPUTERA]:5173`
   - Np. `https://192.168.1.100:5173`
4. Zaakceptuj ostrzeżenie o certyfikacie (self-signed)

## Uwaga

- Self-signed certificate może wymagać akceptacji w przeglądarce
- Niektóre przeglądarki mogą blokować self-signed certificates - wtedy użyj Chrome lub Firefox
- Na produkcji użyj prawidłowego certyfikatu SSL (Let's Encrypt, etc.)

