# HTTPS for Development

The application uses HTTPS in development mode so geolocation works on mobile devices.

## How it works

1. Vite automatically generates a self-signed certificate
2. On first run, the browser will show a warning about an untrusted certificate
3. You must accept the certificate (click "Advanced" → "Proceed to site")

## Running

```bash
npm run dev
```

The server will be available at `https://localhost:5173` (or another port if 5173 is taken).

## Access from phone

1. Make sure the computer and phone are on the same WiFi network
2. Find the computer's IP:
   - Windows: `ipconfig` → look for "IPv4 Address"
   - Mac/Linux: `ifconfig` or `ip addr`
3. On your phone, open: `https://[COMPUTER-IP]:5173`
   - E.g. `https://192.168.1.100:5173`
4. Accept the certificate warning (self-signed)

## Notes

- Self-signed certificate may require acceptance in the browser
- Some browsers may block self-signed certificates - then use Chrome or Firefox
- In production, use a proper SSL certificate (Let's Encrypt, etc.)
