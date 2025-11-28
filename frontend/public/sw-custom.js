// Custom Service Worker for handling push notifications
// This file extends the auto-generated Workbox service worker

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event)

  let notificationData = {
    title: 'AutoSOS - Nowe zgłoszenie',
    body: 'Otrzymałeś nowe zgłoszenie o pomoc',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'new-request',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: '/operator',
    },
  }

  // Parsuj dane z push notification
  if (event.data) {
    try {
      const data = event.data.json()
      
      notificationData = {
        title: data.title || 'AutoSOS - Nowe zgłoszenie',
        body: data.body || `Nowe zgłoszenie w odległości ${data.distance || '?'} km`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `request-${data.requestId || Date.now()}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        data: {
          url: '/operator',
          requestId: data.requestId,
          distance: data.distance,
          phoneNumber: data.phoneNumber,
        },
        actions: [
          {
            action: 'view',
            title: 'Zobacz zgłoszenie',
          },
          {
            action: 'close',
            title: 'Zamknij',
          },
        ],
      }
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error)
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  )
})

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event)

  event.notification.close()

  if (event.action === 'close') {
    return
  }

  // Otwórz aplikację lub przenieś focus na już otwartą kartę
  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        const url = event.notification.data?.url || '/operator'

        // Sprawdź czy aplikacja jest już otwarta
        for (const client of clientList) {
          if (client.url.includes('/operator') && 'focus' in client) {
            return client.focus()
          }
        }

        // Jeśli nie ma otwartej karty, otwórz nową
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event)
})

// Obsługa wiadomości z aplikacji
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

