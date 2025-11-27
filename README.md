# AutoSOS 🚗

A PWA application for roadside assistance. Connects people in need with operators providing roadside assistance services (tow trucks, mechanics).

## 🚀 Features

### For Users
- **Help request form** - simple interface to submit assistance request
- **Location selection** - mark point A (start) and optionally point B (destination) on map
- **List of available operators** - browse available help nearby with prices and arrival time
- **Real-time updates** - instant notifications about offers via SignalR

### For Operators
- **Operator panel** - dashboard with incoming requests
- **Real-time notifications** - SignalR + Web Push notifications
- **Push notifications** - receive alerts even when browser tab is closed
- **Sound alerts** - audio notifications for new requests
- **Offer management** - send offers with price and estimated time

### Technical
- **PWA** - app works offline and can be installed on device
- **Optimization for weak networks** - caching maps and data for better performance
- **Service Worker** - background notifications and offline support

## 🛠️ Technologies

### Frontend
- **React** + **TypeScript** - framework and typing
- **Vite** - build tool
- **Tailwind CSS** - styling
- **Leaflet** + **OpenStreetMap** - maps (free, no query limits)
- **PWA** - service worker and manifest for app installation
- **React Router** - routing for multiple views
- **Web Push API** - push notifications
- **Web Audio API** - notification sounds

### Backend
- **.NET 10** - backend API
- **SQL Server** + **Entity Framework Core** - database
- **SignalR** - real-time communication (WebSocket)
- **JWT Authentication** - secure operator authentication
- **BCrypt** - password hashing
- **Web Push Protocol** - push notification delivery

## 📁 Project Structure

```
AutoSOS/
├── frontend/                    # React PWA application
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── pages/              # Page components (user/operator)
│   │   ├── services/           # API and auth services
│   │   ├── hooks/              # Custom React hooks
│   │   └── types/              # TypeScript types
│   └── package.json
└── backend/                     # .NET API
    └── AutoSOS.Api/
        ├── Endpoints/          # API endpoints
        ├── Models/             # Database models
        ├── Data/               # DbContext and migrations
        └── Services/           # Business logic
```

## 🚀 Local Development

### Backend

```bash
cd backend/AutoSOS.Api
dotnet run
```

Backend will be available at `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Application will be available at `http://localhost:5173`

### Production Build

```bash
cd frontend
npm run build
```

Production-ready files will be in `frontend/dist`

## 🌐 Deployment

### GitHub Pages

Project is automatically deployed to GitHub Pages after each push to `main` branch.

To enable GitHub Pages:
1. Go to Settings → Pages in repository
2. Select "GitHub Actions" as source
3. Workflow will automatically deploy the application after build

Application will be available at:
`https://[your-username].github.io/AutoSOS/`

## 📝 Current Status

### ✅ Completed (v0.2 - Operator Panel)
- [x] Backend .NET API
- [x] SignalR integration for real-time updates
- [x] SQL Server database
- [x] Operator panel with authentication and dashboard
- [x] JWT authentication system
- [x] **Web Push Notifications** - alerts even when tab is closed
- [x] **Notification sounds** - audio alerts for operators
- [x] **Real-time request list** - incoming requests via SignalR
- [x] Request and offer management
- [x] Service Worker for background notifications

### 🚧 In Progress
- [ ] Price calculation based on A→B route
- [ ] Request history
- [ ] Operator location tracking on map

### 📋 Planned Features
- [ ] Payment integration (Stripe/PayU)
- [ ] SMS notifications
- [ ] Admin panel
- [ ] Mobile app (React Native)
- [ ] Rating system
- [ ] Chat between user and operator

## 🔐 Security Features

- JWT token-based authentication
- BCrypt password hashing
- Protected API endpoints
- CORS configuration
- Input validation

## 📚 Documentation

- [ROADMAP.md](ROADMAP.md) - Development roadmap
- [OPERATOR_PANEL.md](docs/OPERATOR_PANEL.md) - Operator panel documentation
- [WEB_PUSH_SETUP.md](docs/WEB_PUSH_SETUP.md) - Web Push notifications setup guide
- [SECURITY_TASKS.md](docs/SECURITY_TASKS.md) - Security improvements backlog
- [GITHUB_PROJECT_MANAGEMENT.md](docs/GITHUB_PROJECT_MANAGEMENT.md) - Project management guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview

## 🤝 Contributing

Project is under active development. All suggestions and pull requests are welcome!

## 📄 License

MIT
