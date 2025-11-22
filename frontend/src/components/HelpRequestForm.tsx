import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap, ZoomControl, Polyline } from 'react-leaflet'
import { Icon, DivIcon } from 'leaflet'
import type { HelpRequest, Location } from '../types'
import { type POIResult, type RoutePoint, getRoute, calculateDistance } from '../services/geocoding'
import { apiClient, type OperatorResponse } from '../services/api'

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

// Flaga mety - używamy emoji jako ikony (najprostsze rozwiązanie)
// Alternatywnie można użyć gotowej ikony PNG z CDN
const DestinationIcon = new DivIcon({
  html: '<div style="font-size: 32px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🏁</div>',
  className: 'checkered-flag-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const POIIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [20, 32],
  iconAnchor: [10, 32],
})

// Ikonka klucza płaskiego (klucza do naprawy) dla operatorów
const OperatorIcon = new DivIcon({
  html: '<div style="font-size: 28px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🔧</div>',
  className: 'operator-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

interface HelpRequestFormProps {
  onSubmit: (request: HelpRequest) => void
  initialFromLocation?: Location | null
  initialToLocation?: Location | null
}

// Component to track map center and update location
function MapCenterTracker({ 
  fromPosition, 
  toPosition,
  onFromPositionChange,
  onToPositionChange,
  isSelectingStart,
  isSelectingDestination,
  routeCoordinates,
  nearbyOperators,
  shouldUpdateLocation
}: { 
  fromPosition: Location | null
  toPosition: Location | null
  onFromPositionChange: (loc: Location) => void
  onToPositionChange: (loc: Location) => void
  isSelectingStart: boolean
  isSelectingDestination: boolean
  routeCoordinates: RoutePoint[]
  nearbyOperators: OperatorResponse[]
  shouldUpdateLocation: () => boolean
}) {
  const map = useMap()
  
  useEffect(() => {
    const updateLocation = () => {
      if (isSelectingStart && shouldUpdateLocation()) {
        const center = map.getCenter()
        // Sprawdź, czy lokalizacja faktycznie się zmieniła (unikaj niepotrzebnych aktualizacji)
        if (!fromPosition || 
            Math.abs(fromPosition.lat - center.lat) > 0.0001 || 
            Math.abs(fromPosition.lng - center.lng) > 0.0001) {
          onFromPositionChange({ lat: center.lat, lng: center.lng })
        }
      }
      if (isSelectingDestination && shouldUpdateLocation()) {
        const center = map.getCenter()
        // Sprawdź, czy lokalizacja faktycznie się zmieniła (unikaj niepotrzebnych aktualizacji)
        if (!toPosition || 
            Math.abs(toPosition.lat - center.lat) > 0.0001 || 
            Math.abs(toPosition.lng - center.lng) > 0.0001) {
          onToPositionChange({ lat: center.lat, lng: center.lng })
        }
      }
    }

    // Aktualizuj lokalizację przy przesuwaniu mapy
    map.on('moveend', updateLocation)
    
    // Aktualizuj od razu
    updateLocation()

    return () => {
      map.off('moveend', updateLocation)
    }
  }, [map, isSelectingStart, isSelectingDestination, fromPosition, toPosition, onFromPositionChange, onToPositionChange, shouldUpdateLocation])

  return (
    <>
      {/* Pinezka startowa - pokazuj tylko gdy nie wybieramy lokalizacji */}
      {fromPosition && !isSelectingStart && <Marker position={[fromPosition.lat, fromPosition.lng]} icon={DefaultIcon} />}
      {/* Pinezka docelowa - pokazuj tylko gdy nie wybieramy lokalizacji docelowej */}
      {toPosition && !isSelectingDestination && <Marker position={[toPosition.lat, toPosition.lng]} icon={DestinationIcon} />}
      {/* Trasa po ulicach - pokazuj tylko gdy oba są ustawione i mamy współrzędne trasy */}
      {fromPosition && toPosition && routeCoordinates.length > 0 && (
        <Polyline
          positions={routeCoordinates.map(coord => [coord.lat, coord.lng])}
          color="#3b82f6"
          weight={4}
          opacity={0.8}
        />
      )}
      {/* Fallback - prosta linia jeśli nie ma trasy */}
      {fromPosition && toPosition && routeCoordinates.length === 0 && (
        <Polyline
          positions={[
            [fromPosition.lat, fromPosition.lng],
            [toPosition.lat, toPosition.lng]
          ]}
          color="#9ca3af"
          weight={2}
          opacity={0.5}
          dashArray="5, 5"
        />
      )}
      {/* Markery operatorów - pokazuj tylko gdy nie wybieramy lokalizacji */}
      {!isSelectingStart && !isSelectingDestination && nearbyOperators.map((operator) => (
        operator.currentLatitude && operator.currentLongitude && (
          <Marker
            key={operator.id}
            position={[operator.currentLatitude, operator.currentLongitude]}
            icon={OperatorIcon}
          />
        )
      ))}
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

// Component to fit map bounds to show both points and route
function MapBounds({ fromLocation, toLocation, routeCoordinates }: { fromLocation: Location | null, toLocation: Location | null, routeCoordinates: RoutePoint[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (fromLocation && toLocation) {
      // Jeśli mamy współrzędne trasy, użyj ich do ustawienia bounds
      if (routeCoordinates.length > 0) {
        const bounds = L.latLngBounds(
          routeCoordinates.map(coord => [coord.lat, coord.lng] as [number, number])
        )
        // Dodaj również punkty startowy i docelowy na wypadek, gdyby były poza trasą
        bounds.extend([fromLocation.lat, fromLocation.lng])
        bounds.extend([toLocation.lat, toLocation.lng])
        
        map.fitBounds(bounds, { 
          paddingTopLeft: [100, 50],
          paddingBottomRight: [150, 50]
        } as L.FitBoundsOptions)
      } else {
        // Jeśli nie ma trasy, użyj tylko punktów
        const bounds = L.latLngBounds(
          [fromLocation.lat, fromLocation.lng],
          [toLocation.lat, toLocation.lng]
        )
        map.fitBounds(bounds, { 
          paddingTopLeft: [100, 50],
          paddingBottomRight: [150, 50]
        } as L.FitBoundsOptions)
      }
    }
  }, [map, fromLocation, toLocation, routeCoordinates])
  
  return null
}

export default function HelpRequestForm({ onSubmit, initialFromLocation, initialToLocation }: HelpRequestFormProps) {
  const navigate = useNavigate()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [description, setDescription] = useState('')
  const [fromLocation, setFromLocation] = useState<Location | null>(initialFromLocation || null)
  const [toLocation, setToLocation] = useState<Location | null>(initialToLocation || null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialFromLocation ? [initialFromLocation.lat, initialFromLocation.lng] : [52.2297, 21.0122]
  ) // Warszawa lub lokalizacja początkowa
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [poiMarkers, setPoiMarkers] = useState<POIResult[]>([])
  const [showFormPanel, setShowFormPanel] = useState(false)
  const [isSelectingStart, setIsSelectingStart] = useState(false) // Tryb wyboru lokalizacji startowej
  const [isSelectingDestination, setIsSelectingDestination] = useState(false) // Tryb wyboru lokalizacji docelowej
  const [isFromLocationFromGPS, setIsFromLocationFromGPS] = useState(false) // Czy punkt startowy jest z geolokalizacji
  const [routeDistance, setRouteDistance] = useState<number | null>(null) // Dystans między punktami
  const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]) // Współrzędne trasy
  const [routeDuration, setRouteDuration] = useState<number | null>(null) // Czas trasy w sekundach
  const [nearbyOperators, setNearbyOperators] = useState<OperatorResponse[]>([]) // Najbliżsi operatorzy
  
  const watchPositionIdRef = useRef<number | null>(null) // ID watchPosition do zatrzymania
  const isUpdatingFromGPSRef = useRef<boolean>(false) // Flaga wskazująca, że aktualizujemy lokalizację z GPS
  const panelRef = useRef<HTMLDivElement>(null) // Ref do panelu z lokalizacjami

  // Ustaw początkową lokalizację i centrum mapy jeśli są przekazane
  useEffect(() => {
    if (initialFromLocation) {
      setMapCenter([initialFromLocation.lat, initialFromLocation.lng])
      setIsFromLocationFromGPS(false) // Początkowa lokalizacja nie jest z GPS
      // Nie wywołuj getCurrentLocation jeśli mamy początkową lokalizację
    } else {
      getCurrentLocation()
    }
  }, [initialFromLocation])

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

  // Pobierz najbliższych operatorów gdy użytkownik ma ustaloną lokalizację
  useEffect(() => {
    const loadNearbyOperators = async () => {
      if (fromLocation && !isSelectingStart) {
        try {
          const response = await apiClient.getOperators(fromLocation.lat, fromLocation.lng, 30)
          // Pobierz tylko 10 najbliższych operatorów z lokalizacją
          const operatorsWithLocation = response.operators
            .filter(op => op.currentLatitude && op.currentLongitude)
            .slice(0, 10)
          setNearbyOperators(operatorsWithLocation)
        } catch (error) {
          console.error('Error loading nearby operators:', error)
          // Nie pokazuj błędu użytkownikowi - to tylko informacyjne markery
        }
      } else {
        setNearbyOperators([])
      }
    }

    loadNearbyOperators()
  }, [fromLocation, isSelectingStart])

  // Oblicz trasę i dystans gdy oba punkty są ustawione
  useEffect(() => {
    const calculateRoute = async () => {
      // Obliczaj trasę tylko gdy oba punkty są ustawione i nie wybieramy lokalizacji
      if (fromLocation && toLocation && !isSelectingStart && !isSelectingDestination) {
        try {
          const route = await getRoute(
            fromLocation.lat,
            fromLocation.lng,
            toLocation.lat,
            toLocation.lng
          )
          
          if (route) {
            setRouteCoordinates(route.coordinates)
            setRouteDistance(route.distance)
            setRouteDuration(route.duration)
          } else {
            // Jeśli nie udało się pobrać trasy, oblicz dystans w linii prostej
            const distance = calculateDistance(
              fromLocation.lat,
              fromLocation.lng,
              toLocation.lat,
              toLocation.lng
            )
            setRouteCoordinates([])
            setRouteDistance(distance)
            setRouteDuration(null)
          }
        } catch (error) {
          console.error('Error calculating route:', error)
          // W przypadku błędu, oblicz dystans w linii prostej
          const distance = calculateDistance(
            fromLocation.lat,
            fromLocation.lng,
            toLocation.lat,
            toLocation.lng
          )
          setRouteCoordinates([])
          setRouteDistance(distance)
          setRouteDuration(null)
        }
      } else {
        // Wyczyść trasę gdy nie ma obu punktów
        setRouteCoordinates([])
        setRouteDistance(null)
        setRouteDuration(null)
      }
    }

    calculateRoute()
  }, [fromLocation, toLocation, isSelectingStart, isSelectingDestination])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Twoja przeglądarka nie obsługuje geolokalizacji. Kliknij na mapie, aby wskazać lokalizację.')
      return
    }

    // Zatrzymaj poprzednie śledzenie jeśli istnieje
    if (watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current)
      watchPositionIdRef.current = null
    }

    // Wyczyść poprzedni błąd
    setLocationError(null)

    const options: PositionOptions = {
      enableHighAccuracy: true, // Użyj GPS jeśli dostępny
      timeout: 15000, // 15 sekund timeout
      maximumAge: 60000, // Akceptuj pozycję starszą niż 1 minuta
    }

    // Ustaw flagę, że aktualizujemy lokalizację z GPS
    isUpdatingFromGPSRef.current = true
    
    // Najpierw pobierz aktualną pozycję
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
        setIsFromLocationFromGPS(true) // Oznacz że lokalizacja jest z GPS
        // Zresetuj flagę po zaktualizowaniu lokalizacji
        setTimeout(() => {
          isUpdatingFromGPSRef.current = false
        }, 100)
        console.log('Geolokalizacja udana:', loc)

        // Rozpocznij śledzenie zmian lokalizacji w czasie rzeczywistym
        watchPositionIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const loc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }
            setFromLocation(loc)
            // Aktualizuj centrum mapy tylko jeśli użytkownik nie przesunął mapy ręcznie
            if (isFromLocationFromGPS) {
              setMapCenter([loc.lat, loc.lng])
            }
            console.log('Lokalizacja zaktualizowana:', loc)
          },
          (error) => {
            console.error('Błąd śledzenia lokalizacji:', error)
            // Nie pokazuj błędu użytkownikowi - tylko loguj
          },
          options
        )
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
        
        // Zresetuj flagę jeśli nie ma fallback
        if (error.code !== error.TIMEOUT) {
          isUpdatingFromGPSRef.current = false
        }
        
        // Fallback: spróbuj użyć mniej precyzyjnej lokalizacji
        if (error.code === error.TIMEOUT) {
          console.log('Próba użycia mniej precyzyjnej lokalizacji...')
          isUpdatingFromGPSRef.current = true
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const loc = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              }
              setFromLocation(loc)
              setMapCenter([loc.lat, loc.lng])
              setLocationError(null)
              setIsFromLocationFromGPS(true) // Oznacz że lokalizacja jest z GPS
              // Zresetuj flagę po zaktualizowaniu lokalizacji
              setTimeout(() => {
                isUpdatingFromGPSRef.current = false
              }, 100)
              console.log('Geolokalizacja udana (fallback):', loc)

              // Rozpocznij śledzenie zmian lokalizacji w czasie rzeczywistym
              if (watchPositionIdRef.current === null) {
                watchPositionIdRef.current = navigator.geolocation.watchPosition(
                  (position) => {
                    const loc = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                    }
                    setFromLocation(loc)
                    // Aktualizuj centrum mapy tylko jeśli użytkownik nie przesunął mapy ręcznie
                    if (isFromLocationFromGPS) {
                      setMapCenter([loc.lat, loc.lng])
                    }
                    console.log('Lokalizacja zaktualizowana (fallback):', loc)
                  },
                  (error) => {
                    console.error('Błąd śledzenia lokalizacji (fallback):', error)
                  },
                  {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 300000,
                  }
                )
              }
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


  // Cleanup: zatrzymaj śledzenie GPS przy odmontowaniu komponentu
  useEffect(() => {
    return () => {
      if (watchPositionIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current)
        watchPositionIdRef.current = null
      }
    }
  }, [])


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
    <div className="flex flex-col w-full h-screen overflow-hidden">
      {/* Distance Info Panel - zawsze widoczny, przytwierdzony na górze */}
      <div ref={panelRef} className="bg-white shadow-xl p-3 z-20">
        {/* Start Location */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-500">Punkt startowy</label>
            {fromLocation && (
              <div className="flex items-center gap-2">
                {!isFromLocationFromGPS && (
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="text-primary-600 hover:text-primary-700 transition"
                    title="Odśwież lokalizację GPS"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
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
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectingDestination(false) // Wyłącz wybór miejsca docelowego
                    setIsSelectingStart(true)
                    setFromLocation(null)
                    setIsFromLocationFromGPS(false)
                    // Zatrzymaj śledzenie GPS gdy użytkownik edytuje lokalizację
                    if (watchPositionIdRef.current !== null) {
                      navigator.geolocation.clearWatch(watchPositionIdRef.current)
                      watchPositionIdRef.current = null
                    }
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  title="Zmień punkt startowy"
                >
                  Edytuj
                </button>
              </div>
            )}
          </div>
          {fromLocation ? (
            <div className="text-sm text-gray-900 bg-gray-50 rounded px-2 py-1.5">
              {fromLocation.lat.toFixed(4)}, {fromLocation.lng.toFixed(4)}
            </div>
          ) : (
            <div className="text-sm text-gray-400 bg-gray-50 rounded px-2 py-1.5 border-2 border-dashed border-gray-300">
              Nie ustawiono
            </div>
          )}
        </div>

        {/* Destination Location */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-500">Punkt docelowy</label>
            {toLocation ? (
              <button
                type="button"
                onClick={() => {
                  setIsSelectingStart(false) // Wyłącz wybór miejsca startowego
                  setIsSelectingDestination(true)
                }}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                title="Zmień punkt docelowy"
              >
                Edytuj
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsSelectingStart(false) // Wyłącz wybór miejsca startowego
                  setIsSelectingDestination(true)
                }}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                title="Ustaw punkt docelowy"
              >
                Ustaw
              </button>
            )}
          </div>
          {toLocation ? (
            <div className="text-sm text-gray-900 bg-gray-50 rounded px-2 py-1.5">
              {toLocation.lat.toFixed(4)}, {toLocation.lng.toFixed(4)}
            </div>
          ) : (
            <div className="text-sm text-gray-400 bg-gray-50 rounded px-2 py-1.5 border-2 border-dashed border-gray-300">
              Nie ustawiono
            </div>
          )}
        </div>

        {/* Distance Info */}
        {routeDistance !== null && fromLocation && toLocation ? (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="text-lg font-bold text-primary-600">
                  {routeDistance.toFixed(1)} km
                </span>
              </div>
              {routeDuration && (
                <span className="text-sm text-gray-600">
                  ~{Math.round(routeDuration / 60)} min
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {routeCoordinates.length > 0 ? 'Trasa po ulicach' : 'Odległość w linii prostej'}
            </p>
          </div>
        ) : (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-400 text-center py-2">
              Ustaw oba punkty, aby zobaczyć dystans
            </p>
          </div>
        )}
      </div>

      {/* Map Container - relative dla crosshair i innych elementów */}
      <div className="relative flex-1 z-10">
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

        {/* Crosshair - pinezka w centrum mapy wskazująca lokalizację */}
        {isSelectingStart && (
          <div className="absolute top-1/2 left-1/2 z-50 pointer-events-none" style={{ transform: 'translate(-12px, -41px)' }}>
            <img
              src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png"
              alt=""
              className="w-[25px] h-[41px] drop-shadow-lg"
              style={{ imageRendering: 'crisp-edges' }}
            />
          </div>
        )}
        {isSelectingDestination && (
          <div className="absolute top-1/2 left-1/2 z-50 pointer-events-none" style={{ transform: 'translate(-50%, -50%)' }}>
            <div style={{ 
              fontSize: '40px', 
              lineHeight: 1, 
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              textShadow: '0 0 10px rgba(255,255,255,0.8)'
            }}>🏁</div>
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
              onFromPositionChange={(loc) => {
                setFromLocation(loc)
                setIsFromLocationFromGPS(false) // Oznacz że lokalizacja jest ustawiona ręcznie
                // Zatrzymaj śledzenie GPS gdy użytkownik ustawia lokalizację ręcznie
                if (watchPositionIdRef.current !== null) {
                  navigator.geolocation.clearWatch(watchPositionIdRef.current)
                  watchPositionIdRef.current = null
                }
              }}
              onToPositionChange={(loc) => {
                setToLocation(loc)
              }}
              isSelectingStart={isSelectingStart || !fromLocation}
              isSelectingDestination={isSelectingDestination}
              routeCoordinates={routeCoordinates}
              nearbyOperators={nearbyOperators}
              shouldUpdateLocation={() => !isUpdatingFromGPSRef.current}
            />
            {/* Fit bounds when both locations are set - tylko gdy nie wybieramy lokalizacji */}
            {fromLocation && toLocation && !isSelectingStart && !isSelectingDestination && (
              <MapBounds fromLocation={fromLocation} toLocation={toLocation} routeCoordinates={routeCoordinates} />
            )}
            {/* POI Markers */}
            {poiMarkers.map((poi, idx) => (
              <Marker key={idx} position={[poi.lat, poi.lon]} icon={POIIcon} />
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Confirm Location Button - pokazuje się gdy wybieramy lokalizację startową */}
      {isSelectingStart && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={() => {
              setIsSelectingStart(false)
              setIsFromLocationFromGPS(false) // Lokalizacja ustawiona ręcznie
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

      {/* Confirm Destination Button - pokazuje się gdy wybieramy lokalizację docelową */}
      {isSelectingDestination && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={() => {
              setIsSelectingDestination(false)
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



      {/* Call for Help Button - Large button at bottom */}
      <div className={`absolute left-4 right-4 z-20 ${showFormPanel ? 'bottom-[40vh]' : 'bottom-4'}`}>
        <button
          type="button"
          onClick={() => {
            if (!fromLocation) {
              alert('Musisz ustawić punkt startowy')
              return
            }
            navigate('/request-help', {
              state: {
                fromLocation,
                toLocation,
                routeDistance,
                routeDuration
              }
            })
          }}
          disabled={!fromLocation}
          className="w-full bg-danger-600 hover:bg-danger-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl text-lg transition duration-200 transform hover:scale-105 disabled:transform-none shadow-2xl"
        >
          🚨 Wezwij pomoc
        </button>
      </div>

      {/* Floating Action Buttons */}
      <div className={`absolute right-4 z-10 flex flex-col gap-3 ${showFormPanel ? 'bottom-[calc(40vh+80px)]' : 'bottom-24'}`}>
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
          title={showFormPanel ? 'Ukryj menu' : 'Pokaż menu'}
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

      {/* Menu Panel (Bottom Sheet) - menu z opcjami */}
      {showFormPanel && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-2xl shadow-2xl max-h-[40vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900">Menu</h2>
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
        </div>

          <div className="p-4 space-y-3">
            {/* Operator Panel Button */}
            <Link
              to="/operator/login"
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors w-full"
              onClick={() => setShowFormPanel(false)}
            >
              <span>👔</span>
              <span>Jesteś operatorem?</span>
            </Link>

            {/* Ustawienia - zasłepka */}
            <button
              type="button"
              onClick={() => {
                alert('Ustawienia - funkcja w przygotowaniu')
                setShowFormPanel(false)
              }}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors w-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Ustawienia</span>
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
