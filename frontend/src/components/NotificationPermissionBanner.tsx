import { useState, useEffect } from 'react'
import { pushNotificationService } from '../services/pushNotifications'
import { notificationSoundService } from '../services/notificationSound'

interface NotificationPermissionBannerProps {
  operatorId: string
}

export default function NotificationPermissionBanner({ operatorId }: NotificationPermissionBannerProps) {
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkPermissionAndSubscription()
  }, [operatorId])

  const checkPermissionAndSubscription = async () => {
    const permission = pushNotificationService.getPermissionState()
    setPermissionState(permission)

    if (permission === 'granted') {
      const initialized = await pushNotificationService.initialize()
      if (initialized) {
        const subscribed = await pushNotificationService.isSubscribed()
        setIsSubscribed(subscribed)
        setShowBanner(!subscribed)
      }
    } else if (permission === 'default') {
      setShowBanner(true)
    }
  }

  const handleEnableNotifications = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Initialize audio context (requires user interaction)
      await notificationSoundService.initialize()

      // Initialize push notifications
      const initialized = await pushNotificationService.initialize()
      if (!initialized) {
        setError('Twoja przeglądarka nie obsługuje powiadomień push')
        setIsLoading(false)
        return
      }

      // Request permission
      const permission = await pushNotificationService.requestPermission()
      setPermissionState(permission)

      if (permission === 'granted') {
        // Subscribe to push notifications
        const subscription = await pushNotificationService.subscribe(operatorId)
        
        if (subscription) {
          setIsSubscribed(true)
          setShowBanner(false)
          
          // Play test sound
          await notificationSoundService.play()
        } else {
          setError('Nie udało się zapisać subskrypcji powiadomień')
        }
      } else if (permission === 'denied') {
        setError('Powiadomienia zostały zablokowane. Odblokuj je w ustawieniach przeglądarki.')
      }
    } catch (err) {
      console.error('Error enabling notifications:', err)
      setError('Wystąpił błąd podczas włączania powiadomień')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestNotification = async () => {
    try {
      await pushNotificationService.showTestNotification()
      await notificationSoundService.play()
    } catch (err) {
      console.error('Error showing test notification:', err)
    }
  }

  const handleTestSound = async () => {
    try {
      await notificationSoundService.playUrgent()
    } catch (err) {
      console.error('Error playing test sound:', err)
    }
  }

  if (!showBanner && isSubscribed) {
    // Show small status indicator when notifications are enabled
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-lg">🔔</span>
            <span className="text-sm text-green-800 font-medium">
              Powiadomienia włączone
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTestSound}
              className="text-xs text-green-700 hover:text-green-900 underline"
            >
              Test dźwięku
            </button>
            <button
              onClick={handleTestNotification}
              className="text-xs text-green-700 hover:text-green-900 underline"
            >
              Test powiadomienia
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!showBanner) {
    return null
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="text-3xl">🔔</div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-blue-900 mb-2">
            Włącz powiadomienia o nowych zgłoszeniach
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            Otrzymuj natychmiastowe powiadomienia o nowych zgłoszeniach, nawet gdy aplikacja jest zamknięta.
            Powiadomienia zawierają dźwięk i wibracje.
          </p>
          
          {error && (
            <div className="bg-red-100 border border-red-300 rounded p-2 mb-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {permissionState === 'denied' && (
            <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-3">
              <p className="text-sm text-yellow-800">
                <strong>Powiadomienia zablokowane.</strong> Aby je włączyć:
              </p>
              <ol className="text-xs text-yellow-700 mt-2 ml-4 list-decimal">
                <li>Kliknij ikonę kłódki/informacji w pasku adresu</li>
                <li>Znajdź ustawienia "Powiadomienia"</li>
                <li>Zmień na "Zezwalaj"</li>
                <li>Odśwież stronę</li>
              </ol>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleEnableNotifications}
              disabled={isLoading || permissionState === 'denied'}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? 'Włączanie...' : 'Włącz powiadomienia'}
            </button>
            {permissionState !== 'denied' && (
              <button
                onClick={() => setShowBanner(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Później
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

