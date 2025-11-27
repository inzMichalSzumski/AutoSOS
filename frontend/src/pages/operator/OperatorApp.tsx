import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../services/api'
import { signalRService } from '../../services/signalr'
import { notificationSoundService } from '../../services/notificationSound'
import * as signalR from '@microsoft/signalr'
import NotificationPermissionBanner from '../../components/NotificationPermissionBanner'
import OperatorLocationSetup from '../../components/OperatorLocationSetup'

interface AvailableRequest {
  id: string
  phoneNumber: string
  fromLatitude: number
  fromLongitude: number
  toLatitude?: number
  toLongitude?: number
  description?: string
  status: string
  createdAt: string
  distance: number
}

interface OperatorLocation {
  lat: number
  lng: number
}

export default function OperatorApp() {
  const { operatorName, operatorId, logout } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<AvailableRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<AvailableRequest | null>(null)
  const [offerPrice, setOfferPrice] = useState('')
  const [offerTime, setOfferTime] = useState('')
  const [submittingOffer, setSubmittingOffer] = useState(false)
  const [operatorLocation, setOperatorLocation] = useState<OperatorLocation | null>(null)
  const [showLocationSetup, setShowLocationSetup] = useState(false)
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false)

  // Check operator location on mount
  useEffect(() => {
    checkOperatorLocation()
  }, [operatorId])

  useEffect(() => {
    // Don't load requests if location is not set
    if (!operatorLocation) {
      return
    }

    loadRequests()
    
    // Connect to SignalR to receive real-time notifications
    let connection: signalR.HubConnection | null = null
    
    const setupSignalR = async () => {
      if (!operatorId) return
      
      try {
        connection = await signalRService.connectToOperatorHub(operatorId)
        
        // Listen for new requests
        connection.on('NewRequest', (request: AvailableRequest) => {
          // Play notification sound
          notificationSoundService.playUrgent().catch(err => 
            console.error('Error playing notification sound:', err)
          )
          
          // Add new request to list if it doesn't exist yet
          setRequests(prev => {
            const exists = prev.some(r => r.id === request.id)
            if (exists) return prev
            return [request, ...prev].sort((a, b) => a.distance - b.distance)
          })
        })
      } catch (error) {
        console.error('Error setting up SignalR:', error)
      }
    }
    
    setupSignalR()
    
    // Refresh every 30 seconds (SignalR will be the primary source of notifications)
    const interval = setInterval(loadRequests, 30000)
    
    return () => {
      clearInterval(interval)
      if (connection) {
        connection.off('NewRequest')
      }
    }
  }, [operatorId, operatorLocation])

  const checkOperatorLocation = async () => {
    if (!operatorId) return

    try {
      const operator = await apiClient.getOperatorDetails(operatorId)
      
      if (operator.currentLatitude && operator.currentLongitude) {
        setOperatorLocation({
          lat: operator.currentLatitude,
          lng: operator.currentLongitude
        })
      } else {
        // No location set, show setup modal
        setShowLocationSetup(true)
      }
    } catch (error) {
      console.error('Error fetching operator details:', error)
      // Try localStorage as fallback
      const savedLocation = localStorage.getItem(`operator_location_${operatorId}`)
      if (savedLocation) {
        try {
          const location = JSON.parse(savedLocation)
          setOperatorLocation(location)
        } catch (parseError) {
          console.error('Error parsing saved location:', parseError)
          setShowLocationSetup(true)
        }
      } else {
        setShowLocationSetup(true)
      }
    }
  }

  const handleLocationSet = async (location: OperatorLocation) => {
    if (!operatorId) return

    setIsUpdatingLocation(true)
    try {
      await apiClient.updateOperatorLocation(operatorId, location.lat, location.lng)
      setOperatorLocation(location)
      // Save to localStorage as backup
      localStorage.setItem(`operator_location_${operatorId}`, JSON.stringify(location))
      setShowLocationSetup(false)
    } catch (error) {
      console.error('Error updating location:', error)
      alert('Failed to update location. Please try again.')
    } finally {
      setIsUpdatingLocation(false)
    }
  }

  const loadRequests = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAvailableRequests()
      setRequests(response.requests)
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitOffer = async () => {
    if (!selectedRequest || !operatorId || !offerPrice) {
      alert('Proszę wypełnić wszystkie wymagane pola')
      return
    }

    try {
      setSubmittingOffer(true)
      await apiClient.createOffer({
        requestId: selectedRequest.id,
        operatorId: operatorId,
        price: parseFloat(offerPrice),
        estimatedTimeMinutes: offerTime ? parseInt(offerTime) : undefined,
      })
      alert('Oferta została wysłana!')
      setSelectedRequest(null)
      setOfferPrice('')
      setOfferTime('')
      loadRequests()
    } catch (error) {
      console.error('Error submitting offer:', error)
      alert('Nie udało się wysłać oferty. Spróbuj ponownie.')
    } finally {
      setSubmittingOffer(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/operator/login')
  }

  // Show location setup fullscreen if needed
  if (showLocationSetup) {
    return (
      <OperatorLocationSetup
        initialLocation={operatorLocation}
        onLocationSet={handleLocationSet}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                🚗 Panel Operatora
              </h1>
              <p className="text-gray-600 mt-1">
                Witaj, {operatorName}!
              </p>
              {operatorLocation && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    📍 Location: {operatorLocation.lat.toFixed(4)}, {operatorLocation.lng.toFixed(4)}
                  </span>
                  <button
                    onClick={() => setShowLocationSetup(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Wyloguj się
            </button>
          </div>
        </div>

        {/* Notification Permission Banner */}
        {operatorId && <NotificationPermissionBanner operatorId={operatorId} />}

        {/* Dashboard Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Dostępne zgłoszenia
            </h2>
            <button
              onClick={loadRequests}
              disabled={loading}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Ładowanie...' : '🔄 Odśwież'}
            </button>
          </div>

          {loading && requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Ładowanie zgłoszeń...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-lg">Brak dostępnych zgłoszeń</p>
              <p className="text-gray-500 text-sm mt-2">
                Nowe zgłoszenia pojawią się tutaj automatycznie
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          Zgłoszenie #{request.id.slice(0, 8)}
                        </h3>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          {request.status === 'Pending' ? 'Oczekujące' : 'Szukanie'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>📞 {request.phoneNumber}</p>
                        <p>📍 Dystans: {request.distance} km</p>
                        {request.description && (
                          <p className="mt-2 text-gray-700">{request.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Utworzono: {new Date(request.createdAt).toLocaleString('pl-PL')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Wyślij ofertę
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Offer Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Wyślij ofertę
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cena (zł) *
                  </label>
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="150"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Szacowany czas (minuty)
                  </label>
                  <input
                    type="number"
                    value={offerTime}
                    onChange={(e) => setOfferTime(e.target.value)}
                    placeholder="30"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setSelectedRequest(null)
                      setOfferPrice('')
                      setOfferTime('')
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSubmitOffer}
                    disabled={submittingOffer || !offerPrice}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {submittingOffer ? 'Wysyłanie...' : 'Wyślij ofertę'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

