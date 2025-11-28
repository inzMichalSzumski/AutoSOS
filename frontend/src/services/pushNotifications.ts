import { apiClient } from './api'

// VAPID public key - will be generated on backend
// For now it's a placeholder, needs to be generated
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null

  /**
   * Inicjalizuje service worker i sprawdza wsparcie dla powiadomień
   */
  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      return false
    }

    if (!('PushManager' in window)) {
      console.warn('Push notifications not supported')
      return false
    }

    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return false
    }

    try {
      // Wait for service worker registration
      this.registration = await navigator.serviceWorker.ready
      return true
    } catch (error) {
      console.error('Error initializing push notifications:', error)
      return false
    }
  }

  /**
   * Sprawdza czy użytkownik już wyraził zgodę na powiadomienia
   */
  getPermissionState(): NotificationPermission {
    return Notification.permission
  }

  /**
   * Prosi użytkownika o zgodę na powiadomienia
   */
  async requestPermission(): Promise<NotificationPermission> {
    const permission = await Notification.requestPermission()
    return permission
  }

  /**
   * Subskrybuje użytkownika do push notifications
   */
  async subscribe(operatorId: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.error('Service Worker not registered')
      return null
    }

    // Validate VAPID public key is configured
    if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.trim() === '') {
      console.error(
        'VAPID public key is not configured. Please set VITE_VAPID_PUBLIC_KEY environment variable. ' +
        'See docs/WEB_PUSH_SETUP.md for instructions on generating VAPID keys.'
      )
      return null
    }

    try {
      // Check if subscription already exists
      let subscription = await this.registration.pushManager.getSubscription()

      if (!subscription) {
        // Create new subscription
        const vapidPublicKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        })
      }

      // Send subscription to backend
      await this.sendSubscriptionToBackend(operatorId, subscription)

      return subscription
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      return null
    }
  }

  /**
   * Anuluje subskrypcję push notifications
   */
  async unsubscribe(operatorId: string): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription()
      
      if (subscription) {
        // Remove subscription from backend
        await this.removeSubscriptionFromBackend(operatorId, subscription)
        
        // Unsubscribe
        await subscription.unsubscribe()
      }

      return true
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }

  /**
   * Sprawdza czy użytkownik jest zasubskrybowany
   */
  async isSubscribed(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription()
      return subscription !== null
    } catch (error) {
      console.error('Error checking subscription:', error)
      return false
    }
  }

  /**
   * Wyświetla powiadomienie testowe (dla testowania)
   */
  async showTestNotification(): Promise<void> {
    if (!this.registration) {
      console.error('Service Worker not registered')
      return
    }

    await this.registration.showNotification('AutoSOS - Test', {
      body: 'Powiadomienia działają poprawnie!',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
      tag: 'test-notification',
      requireInteraction: false,
    })
  }

  /**
   * Wysyła subskrypcję na backend
   */
  private async sendSubscriptionToBackend(
    operatorId: string,
    subscription: PushSubscription
  ): Promise<void> {
    const subscriptionData = {
      operatorId,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')),
      },
    }

    await apiClient.savePushSubscription(subscriptionData)
  }

  /**
   * Usuwa subskrypcję z backendu
   */
  private async removeSubscriptionFromBackend(
    operatorId: string,
    subscription: PushSubscription
  ): Promise<void> {
    await apiClient.removePushSubscription(operatorId, subscription.endpoint)
  }

  /**
   * Konwertuje VAPID key z base64 do Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  /**
   * Konwertuje ArrayBuffer do base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return ''
    
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }
}

export const pushNotificationService = new PushNotificationService()

