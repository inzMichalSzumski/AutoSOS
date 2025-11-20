import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, ZoomControl } from 'react-leaflet'
import { Icon } from 'leaflet'
import type { HelpRequest, Location } from '../types'
import { searchAddresses, searchPOI, reverseGeocode, calculateDistance, type GeocodingResult, type POIResult } from '../services/geocoding'

// Fix dla ikon Leaflet w Vite
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Workaround dla TypeScript - użyj bezpośrednio ścieżek
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const DefaultIcon = new Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const DestinationIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const POIIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [20, 32],
  iconAnchor: [10, 32],
})

interface HelpRequestFormProps {
  onSubmit: (request: HelpRequest) => void
}

// Component to track map center and update location
function MapCenterTracker({ 
  fromPosition, 
  toPosition,
  onFromPositionChange,
  isSelectingStart
}: { 
  fromPosition: Location | null
  toPosition: Location | null
  onFromPositionChange: (loc: Location) => void
  isSelectingStart: boolean
}) {
  const map = useMap()
  
  useEffect(() => {
    const updateLocation = () => {
      if (isSelectingStart) {
        const center = map.getCenter()
        onFromPositionChange({ lat: center.lat, lng: center.lng })
      }
    }

    // Aktualizuj lokalizację przy przesuwaniu mapy
    map.on('moveend', updateLocation)
    
    // Aktualizuj od razu
    updateLocation()

    return () => {
      map.off('moveend', updateLocation)
    }
  }, [map, isSelectingStart, onFromPositionChange])

  return (
    <>
      {/* Pinezka startowa - pokazuj tylko gdy nie wybieramy lokalizacji */}
      {fromPosition && !isSelectingStart && <Marker position={[fromPosition.lat, fromPosition.lng]} icon={DefaultIcon} />}
      {toPosition && <Marker position={[toPosition.lat, toPosition.lng]} icon={DestinationIcon} />}
    </>
  )
}

// Component to center map on location
function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

export default function HelpRequestForm({ onSubmit }: HelpRequestFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [description, setDescription] = useState('')
  const [fromLocation, setFromLocation] = useState<Location | null>(null)
  const [toLocation, setToLocation] = useState<Location | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.2297, 21.0122]) // Warszawa
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<(GeocodingResult | POIResult)[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchMode, setSearchMode] = useState<'address' | 'poi'>('address')
  const [poiMarkers, setPoiMarkers] = useState<POIResult[]>([])
  const [showFormPanel, setShowFormPanel] = useState(false)
  const [isSelectingStart, setIsSelectingStart] = useState(false) // Tryb wyboru lokalizacji startowej
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    getCurrentLocation()
  }, [])

  // Automatycznie włącz tryb wyboru na mapie, jeśli nie ma lokalizacji startowej
  useEffect(() => {
    if (!fromLocation && !locationError) {
      // Poczekaj chwilę, żeby geolokalizacja mogła się wykonać
      const timer = setTimeout(() => {
        if (!fromLocation) {
          setIsSelectingStart(true)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [fromLocation, locationError])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Twoja przeglądarka nie obsługuje geolokalizacji. Kliknij na mapie, aby wskazać lokalizację.')
      return
    }

    // Wyczyść poprzedni błąd
    setLocationError(null)

    const options: PositionOptions = {
      enableHighAccuracy: true, // Użyj GPS jeśli dostępny
      timeout: 15000, // 15 sekund timeout
      maximumAge: 60000, // Akceptuj pozycję starszą niż 1 minuta
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setFromLocation(loc)
        setMapCenter([loc.lat, loc.lng])
        setLocationError(null)
        setIsSelectingStart(false)
        console.log('Geolokalizacja udana:', loc)
      },
      (error) => {
        let errorMessage = 'Nie udało się uzyskać lokalizacji. '
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Brak uprawnień do lokalizacji. Sprawdź ustawienia przeglądarki i zezwól na dostęp do lokalizacji. Uwaga: Geolokalizacja wymaga HTTPS (na telefonie).'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Lokalizacja niedostępna. Sprawdź czy GPS jest włączony w ustawieniach telefonu.'
            break
          case error.TIMEOUT:
            errorMessage += 'Przekroczono czas oczekiwania. Spróbuj ponownie lub kliknij na mapie, aby wskazać lokalizację ręcznie.'
            break
          default:
            errorMessage += 'Kliknij na mapie, aby wskazać lokalizację ręcznie. Uwaga: Geolokalizacja wymaga HTTPS na telefonie.'
            break
        }
        
        setLocationError(errorMessage)
        console.error('Błąd geolokalizacji:', error.code, error.message)
        
        // Fallback: spróbuj użyć mniej precyzyjnej lokalizacji
        if (error.code === error.TIMEOUT) {
          console.log('Próba użycia mniej precyzyjnej lokalizacji...')
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const loc = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              }
              setFromLocation(loc)
              setMapCenter([loc.lat, loc.lng])
              setLocationError(null)
              console.log('Geolokalizacja udana (fallback):', loc)
            },
            () => {
              // Jeśli fallback też nie zadziała, pozostaw komunikat błędu
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 300000, // 5 minut
            }
          )
        }
      },
      options
    )
  }

  // Handle search input with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowResults(false)
      setPoiMarkers([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        if (searchMode === 'address') {
          const results = await searchAddresses(searchQuery, 10) // Pobierz więcej wyników do sortowania
          
          // Jeśli znana jest lokalizacja użytkownika, sortuj wyniki według odległości
          let sortedResults = results
          if (fromLocation) {
            sortedResults = results
              .map(result => ({
                ...result,
                distance: calculateDistance(
                  fromLocation.lat,
                  fromLocation.lng,
                  result.lat,
                  result.lon
                )
              }))
              .sort((a, b) => (a.distance || 0) - (b.distance || 0))
              .slice(0, 5) // Weź 5 najbliższych
          }
          
          setSearchResults(sortedResults)
          setShowResults(true)
        } else {
          // POI search
          const center = fromLocation || { lat: mapCenter[0], lng: mapCenter[1] }
          const results = await searchPOI(searchQuery, center.lat, center.lng, 10000, 10)
          setSearchResults(results)
          setPoiMarkers(results)
          setShowResults(true)
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, searchMode, fromLocation, mapCenter])

  const handleSearchResultClick = (result: GeocodingResult | POIResult) => {
    const loc = { lat: result.lat, lng: result.lon }
    
    // Wyszukiwanie zawsze ustawia lokalizację docelową
    setToLocation(loc)
    setMapCenter([loc.lat, loc.lng])
    
    setSearchQuery('')
    setShowResults(false)
    setPoiMarkers([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fromLocation) {
      alert('Musisz wskazać lokalizację początkową')
      return
    }

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

    onSubmit(request)
    setIsSubmitting(false)
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Crosshair - pinezka w centrum mapy wskazująca lokalizację */}
      {isSelectingStart && (
        <div className="absolute top-1/2 left-1/2 z-30 pointer-events-none" style={{ transform: 'translate(-12px, -41px)' }}>
          <img
            src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png"
            alt=""
            className="w-[25px] h-[41px] drop-shadow-lg"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
      )}

      {/* Fullscreen Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <MapCenter center={mapCenter} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="topright" />
          <MapCenterTracker
            fromPosition={fromLocation}
            toPosition={toLocation}
            onFromPositionChange={setFromLocation}
            isSelectingStart={isSelectingStart || !fromLocation}
          />
          {/* POI Markers */}
          {poiMarkers.map((poi, idx) => (
            <Marker key={idx} position={[poi.lat, poi.lon]} icon={POIIcon} />
          ))}
        </MapContainer>
      </div>

      {/* Location Error Banner */}
      {locationError && (
        <div className="absolute top-4 left-4 right-20 z-20 bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg mb-2">
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-yellow-800 text-sm font-medium">{locationError}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="text-sm text-yellow-900 underline hover:text-yellow-700 font-medium"
                >
                  Spróbuj ponownie
                </button>
                <span className="text-yellow-700">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectingStart(true)
                    setLocationError(null)
                  }}
                  className="text-sm text-yellow-900 underline hover:text-yellow-700 font-medium"
                >
                  Wybierz na mapie
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocationError(null)}
              className="text-yellow-600 hover:text-yellow-800 flex-shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Top Search Bar */}
      <div className={`absolute left-4 right-20 z-10 max-w-2xl ${locationError ? 'top-24' : 'top-4'}`}>
        <div className="bg-white rounded-lg shadow-xl p-2">
          <div className="flex gap-2">
            {/* Search Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => {
                  setSearchMode('address')
                  setSearchQuery('')
                  setPoiMarkers([])
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  searchMode === 'address'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Adres
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchMode('poi')
                  setSearchQuery('')
                  setPoiMarkers([])
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  searchMode === 'poi'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Warsztaty
              </button>
            </div>

            {/* Search Input */}
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowResults(true)}
                placeholder={
                  searchMode === 'address'
                    ? 'Dokąd chcesz się udać?'
                    : 'Szukaj warsztatów, wulkanizacji, serwisów...'
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
              
              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-64 overflow-y-auto z-30">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSearchResultClick(result)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition"
                    >
                      <div className="font-medium text-gray-900">{result.display_name}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <span>{result.type}</span>
                        {(result as any).distance !== undefined && fromLocation && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-primary-600">
                              {(result as any).distance.toFixed(1)} km
                            </span>
                          </>
                        )}
                        {(!fromLocation || (result as any).distance === undefined) && (
                          <>
                            <span>•</span>
                            <span>{result.lat.toFixed(4)}, {result.lon.toFixed(4)}</span>
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {isSearching && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-30">
                  <div className="text-center text-gray-500">Szukanie...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Location Button - pokazuje się gdy wybieramy lokalizację startową */}
      {isSelectingStart && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={() => {
              setIsSelectingStart(false)
              if (fromLocation) {
                setLocationError(null)
              }
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-full shadow-xl transition flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Ustaw tutaj
          </button>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-3">
        {/* Locate Me Button */}
        <button
          type="button"
          onClick={getCurrentLocation}
          className="bg-white rounded-full p-4 shadow-xl hover:bg-gray-50 transition flex items-center justify-center"
          title="Zlokalizuj mnie"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        {/* Form Panel Toggle */}
        <button
          type="button"
          onClick={() => setShowFormPanel(!showFormPanel)}
          className="bg-white rounded-full p-4 shadow-xl hover:bg-gray-50 transition flex items-center justify-center"
          title={showFormPanel ? 'Ukryj formularz' : 'Pokaż formularz'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={showFormPanel ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>
      </div>

      {/* Form Panel (Bottom Sheet) */}
      {showFormPanel && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900">Wezwij Pomoc Drogową</h2>
              <button
                type="button"
                onClick={() => setShowFormPanel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Operator Panel Button */}
            <Link
              to="/operator/login"
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors w-full"
              onClick={() => setShowFormPanel(false)}
            >
              <span>👔</span>
              <span>Jesteś operatorem?</span>
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {locationError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">{locationError}</p>
              </div>
            )}

            {fromLocation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm font-medium">
                  ✓ Lokalizacja startowa: {fromLocation.lat.toFixed(6)}, {fromLocation.lng.toFixed(6)}
                </p>
              </div>
            )}

            {toLocation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                <p className="text-blue-800 text-sm font-medium">
                  ✓ Lokalizacja docelowa: {toLocation.lat.toFixed(6)}, {toLocation.lng.toFixed(6)}
                </p>
                <button
                  type="button"
                  onClick={() => setToLocation(null)}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Usuń
                </button>
              </div>
            )}

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
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !fromLocation}
              className="w-full bg-danger-600 hover:bg-danger-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
            >
              {isSubmitting ? 'Wysyłanie...' : '🔍 Znajdź dostępną pomoc'}
            </button>
          </form>
        </div>
      )}

      {/* Click outside to close search results */}
      {showResults && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => {
            setShowResults(false)
            if (searchInputRef.current) {
              searchInputRef.current.blur()
            }
          }}
        />
      )}
    </div>
  )
}
