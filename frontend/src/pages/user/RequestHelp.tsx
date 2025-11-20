import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { apiClient, type Equipment } from '../../services/api'
import type { HelpRequest, Location } from '../../types'

export default function RequestHelp() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Pobierz dane z state (przekazane przez navigate)
  const routeData = location.state as {
    fromLocation: Location
    toLocation: Location | null
    routeDistance: number | null
    routeDuration: number | null
  } | null

  const [phoneNumber, setPhoneNumber] = useState('')
  const [description, setDescription] = useState('')
  const [requiredEquipmentId, setRequiredEquipmentId] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [loadingEquipment, setLoadingEquipment] = useState(true)
  const [equipmentError, setEquipmentError] = useState<string | null>(null)

  // Pobierz dostępne sprzęty z API
  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const response = await apiClient.getEquipment()
        setEquipment(response.equipment)
      } catch (err) {
        console.error('Error loading equipment:', err)
        setLocationError('Nie udało się załadować listy sprzętów')
      } finally {
        setLoadingEquipment(false)
      }
    }
    loadEquipment()
  }, [])

  // Jeśli brak danych, przekieruj do głównej strony
  useEffect(() => {
    if (!routeData || !routeData.fromLocation) {
      navigate('/', { replace: true })
    }
  }, [routeData, navigate])

  if (!routeData || !routeData.fromLocation) {
    return null // Przekierowanie w toku
  }

  const { fromLocation, toLocation, routeDistance, routeDuration } = routeData

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phoneNumber.trim()) {
      alert('Proszę podać numer telefonu')
      return
    }

    setIsSubmitting(true)

    const request: HelpRequest = {
      id: '', // ID zostanie ustawione przez backend
      phoneNumber,
      description,
      fromLocation,
      toLocation: toLocation || undefined,
    }

    try {
      // 1. Create request in backend
      const response = await apiClient.createRequest({
        phoneNumber: request.phoneNumber,
        fromLatitude: request.fromLocation.lat,
        fromLongitude: request.fromLocation.lng,
        toLatitude: request.toLocation?.lat,
        toLongitude: request.toLocation?.lng,
        description: request.description,
        requiredEquipmentId: requiredEquipmentId || undefined,
      })

      // 2. Update request with ID from backend
      const updatedRequest: HelpRequest = {
        ...request,
        id: response.id,
      }

      // 3. Przekieruj do UserApp z danymi zgłoszenia
      navigate('/', { 
        state: { 
          request: updatedRequest,
          routeDistance,
          routeDuration
        } 
      })
    } catch (error) {
      console.error('Error creating request:', error)
      alert('Nie udało się utworzyć zgłoszenia. Spróbuj ponownie.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Wróć do mapy</span>
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Wezwij Pomoc Drogową</h1>

          {locationError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 text-sm">{locationError}</p>
            </div>
          )}

          {/* Informacje o lokalizacji */}
          <div className="space-y-3 mb-6">
            {fromLocation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm font-medium">
                  ✓ Lokalizacja startowa: {fromLocation.lat.toFixed(6)}, {fromLocation.lng.toFixed(6)}
                </p>
              </div>
            )}

            {toLocation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm font-medium">
                  ✓ Lokalizacja docelowa: {toLocation.lat.toFixed(6)}, {toLocation.lng.toFixed(6)}
                </p>
              </div>
            )}

            {routeDistance !== null && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-gray-800 text-sm font-medium">
                  📍 Dystans: {routeDistance.toFixed(1)} km
                  {routeDuration && ` • ~${Math.round(routeDuration / 60)} min jazdy`}
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Numer telefonu *
              </label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+48 123 456 789"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Opis problemu
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opisz problem (np. awaria silnika, przebita opona, brak paliwa...)"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Jaka pomoc jest potrzebna?
              </label>
              {loadingEquipment ? (
                <div className="text-sm text-gray-500">Ładowanie opcji...</div>
              ) : (
                <>
                  {equipmentError && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <p className="text-yellow-800 text-sm">{equipmentError}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {equipment.map((eq) => {
                      const isDisabled = eq.requiresTransport && !toLocation
                      return (
                        <label 
                          key={eq.id} 
                          className={`flex items-start gap-3 p-3 border border-gray-200 rounded-lg transition-colors ${
                            isDisabled 
                              ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                              : 'cursor-pointer hover:bg-gray-50'
                          }`}
                          onClick={(e) => {
                            if (isDisabled) {
                              e.preventDefault()
                              setEquipmentError('Aby wybrać sprzęt wymagający transportu (laweta), musisz najpierw ustawić punkt docelowy na mapie.')
                            }
                          }}
                        >
                          <input
                            type="radio"
                            name="equipment"
                            checked={requiredEquipmentId === eq.id}
                            onChange={() => {
                              if (isDisabled) {
                                setEquipmentError('Aby wybrać sprzęt wymagający transportu (laweta), musisz najpierw ustawić punkt docelowy na mapie.')
                                return
                              }
                              setEquipmentError(null)
                              setRequiredEquipmentId(eq.id)
                            }}
                            disabled={isDisabled}
                            className="w-4 h-4 text-primary-600 focus:ring-primary-500 mt-0.5 disabled:cursor-not-allowed"
                          />
                          <div className="flex-1">
                            <span className="text-gray-700 font-medium">{eq.name}</span>
                            {eq.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{eq.description}</p>
                            )}
                            {isDisabled && (
                              <p className="text-xs text-yellow-600 mt-1 font-medium">
                                ⚠️ Wymaga ustawienia punktu docelowego
                              </p>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-danger-600 hover:bg-danger-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
            >
              {isSubmitting ? 'Wysyłanie...' : '🔍 Znajdź dostępną pomoc'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

