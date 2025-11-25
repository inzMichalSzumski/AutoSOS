import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap, ZoomControl, Polyline } from 'react-leaflet'
import { Icon, DivIcon } from 'leaflet'
import type { HelpRequest, Location } from '../types'
import { type POIResult, type RoutePoint, getRoute, calculateDistance } from '../services/geocoding'
import { apiClient, type OperatorResponse } from '../services/api'

// Fix for Leaflet icons in Vite
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Workaround for TypeScript - use paths directly
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

// Finish flag - using emoji as icon (simplest solution)
// Alternatively, a ready-made PNG icon from CDN can be used
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

// Wrench icon (repair key) for operators
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
        // Check if location actually changed (avoid unnecessary updates)
        if (!fromPosition || 
            Math.abs(fromPosition.lat - center.lat) > 0.0001 || 
            Math.abs(fromPosition.lng - center.lng) > 0.0001) {
          onFromPositionChange({ lat: center.lat, lng: center.lng })
        }
      }
      if (isSelectingDestination && shouldUpdateLocation()) {
        const center = map.getCenter()
        // Check if location actually changed (avoid unnecessary updates)
        if (!toPosition || 
            Math.abs(toPosition.lat - center.lat) > 0.0001 || 
            Math.abs(toPosition.lng - center.lng) > 0.0001) {
          onToPositionChange({ lat: center.lat, lng: center.lng })
        }
      }
    }

    // Update location when map is moved
    map.on('moveend', updateLocation)
    
    // Update immediately
    updateLocation()

    return () => {
      map.off('moveend', updateLocation)
    }
  }, [map, isSelectingStart, isSelectingDestination, fromPosition, toPosition, onFromPositionChange, onToPositionChange, shouldUpdateLocation])

  return (
    <>
      {/* Start marker - show only when not selecting location */}
      {fromPosition && !isSelectingStart && <Marker position={[fromPosition.lat, fromPosition.lng]} icon={DefaultIcon} />}
      {/* Destination marker - show only when not selecting destination location */}
      {toPosition && !isSelectingDestination && <Marker position={[toPosition.lat, toPosition.lng]} icon={DestinationIcon} />}
      {/* Street route - show only when both are set and we have route coordinates */}
      {fromPosition && toPosition && routeCoordinates.length > 0 && (
        <Polyline
          positions={routeCoordinates.map(coord => [coord.lat, coord.lng])}
          color="#3b82f6"
          weight={4}
          opacity={0.8}
        />
      )}
      {/* Fallback - straight line if no route */}
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
      {/* Operator markers - show only when not selecting location */}
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
      // If we have route coordinates, use them to set bounds
      if (routeCoordinates.length > 0) {
        const bounds = L.latLngBounds(
          routeCoordinates.map(coord => [coord.lat, coord.lng] as [number, number])
        )
        // Also add start and destination points in case they are outside the route
        bounds.extend([fromLocation.lat, fromLocation.lng])
        bounds.extend([toLocation.lat, toLocation.lng])
        
        map.fitBounds(bounds, { 
          paddingTopLeft: [100, 50],
          paddingBottomRight: [150, 50]
        } as L.FitBoundsOptions)
      } else {
        // If no route, use only points
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
  ) // Warsaw or initial location
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [poiMarkers, setPoiMarkers] = useState<POIResult[]>([])
  const [showFormPanel, setShowFormPanel] = useState(false)
  const [isSelectingStart, setIsSelectingStart] = useState(false) // Start location selection mode
  const [isSelectingDestination, setIsSelectingDestination] = useState(false) // Destination location selection mode
  const [isFromLocationFromGPS, setIsFromLocationFromGPS] = useState(false) // Whether start point is from geolocation
  const [routeDistance, setRouteDistance] = useState<number | null>(null) // Distance between points
  const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]) // Route coordinates
  const [routeDuration, setRouteDuration] = useState<number | null>(null) // Route duration in seconds
  const [nearbyOperators, setNearbyOperators] = useState<OperatorResponse[]>([]) // Nearest operators
  
  const watchPositionIdRef = useRef<number | null>(null) // watchPosition ID to stop
  const isUpdatingFromGPSRef = useRef<boolean>(false) // Flag indicating we're updating location from GPS
  const panelRef = useRef<HTMLDivElement>(null) // Ref to locations panel

  // Set initial location and map center if provided
  useEffect(() => {
    if (initialFromLocation) {
      setMapCenter([initialFromLocation.lat, initialFromLocation.lng])
      setIsFromLocationFromGPS(false) // Initial location is not from GPS
      // Don't call getCurrentLocation if we have initial location
    } else {
      getCurrentLocation()
    }
  }, [initialFromLocation])

  // Automatically enable selection mode on map if no start location
  useEffect(() => {
    if (!fromLocation && !locationError) {
      // Wait a bit for geolocation to execute
      const timer = setTimeout(() => {
        if (!fromLocation) {
          setIsSelectingStart(true)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [fromLocation, locationError])

  // Get nearest operators when user has established location
  useEffect(() => {
    const loadNearbyOperators = async () => {
      if (fromLocation && !isSelectingStart) {
        try {
          const response = await apiClient.getOperators(fromLocation.lat, fromLocation.lng, 30)
          // Get only 10 nearest operators with location
          const operatorsWithLocation = response.operators
            .filter(op => op.currentLatitude && op.currentLongitude)
            .slice(0, 10)
          setNearbyOperators(operatorsWithLocation)
        } catch (error) {
          console.error('Error loading nearby operators:', error)
          // Don't show error to user - these are just informational markers
        }
      } else {
        setNearbyOperators([])
      }
    }

    loadNearbyOperators()
  }, [fromLocation, isSelectingStart])

  // Calculate route and distance when both points are set
  useEffect(() => {
    const calculateRoute = async () => {
      // Calculate route only when both points are set and not selecting location
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
            // If route fetch failed, calculate straight-line distance
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
          // On error, calculate straight-line distance
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
        // Clear route when both points are not set
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

    // Stop previous tracking if exists
    if (watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current)
      watchPositionIdRef.current = null
    }

    // Clear previous error
    setLocationError(null)

    const options: PositionOptions = {
      enableHighAccuracy: true, // Use GPS if available
      timeout: 15000, // 15 seconds timeout
      maximumAge: 60000, // Accept position older than 1 minute
    }

    // Set flag that we're updating location from GPS
    isUpdatingFromGPSRef.current = true
    
    // First get current position
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
        setIsFromLocationFromGPS(true) // Mark that location is from GPS
        // Reset flag after updating location
        setTimeout(() => {
          isUpdatingFromGPSRef.current = false
        }, 100)
        console.log('Geolocation successful:', loc)

        // Start tracking location changes in real-time
        watchPositionIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const loc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }
            setFromLocation(loc)
            // Update map center only if user hasn't moved map manually
            if (isFromLocationFromGPS) {
              setMapCenter([loc.lat, loc.lng])
            }
            console.log('Lokalizacja zaktualizowana:', loc)
          },
          (error) => {
            console.error('Błąd śledzenia lokalizacji:', error)
            // Don't show error to user - only log
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
        
        // Reset flag if no fallback
        if (error.code !== error.TIMEOUT) {
          isUpdatingFromGPSRef.current = false
        }
        
        // Fallback: try to use less precise location
        if (error.code === error.TIMEOUT) {
          console.log('Attempting to use less precise location...')
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
              setIsFromLocationFromGPS(true) // Mark that location is from GPS
              // Reset flag after updating location
              setTimeout(() => {
                isUpdatingFromGPSRef.current = false
              }, 100)
              console.log('Geolocation successful (fallback):', loc)

              // Start tracking location changes in real-time
              if (watchPositionIdRef.current === null) {
                watchPositionIdRef.current = navigator.geolocation.watchPosition(
                  (position) => {
                    const loc = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                    }
                    setFromLocation(loc)
                    // Update map center only if user hasn't moved map manually
                    if (isFromLocationFromGPS) {
                      setMapCenter([loc.lat, loc.lng])
                    }
                    console.log('Location updated (fallback):', loc)
                  },
                  (error) => {
                    console.error('Error tracking location (fallback):', error)
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
              // If fallback also fails, leave error message
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 300000, // 5 minutes
            }
          )
        }
      },
      options
    )
  }


  // Cleanup: stop GPS tracking when component unmounts
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
    <div className="flex flex-col w-full h-[100dvh] overflow-hidden">
      {/* Distance Info Panel - zawsze widoczny, przytwierdzony na górze */}
      <div ref={panelRef} className="bg-white shadow-xl p-2 z-20">
        {/* Start Location */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg flex-shrink-0" title="Punkt startowy">▶️</span>
          <div className="flex-1 min-w-0">
            {fromLocation ? (
              <div className="text-sm text-gray-900 bg-gray-50 rounded px-2 py-1.5 truncate">
                {fromLocation.lat.toFixed(4)}, {fromLocation.lng.toFixed(4)}
              </div>
            ) : (
              <div className="text-sm text-gray-400 bg-gray-50 rounded px-2 py-1.5 border-2 border-dashed border-gray-300">
                Nie ustawiono
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {fromLocation && !isFromLocationFromGPS && (
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
                setIsSelectingDestination(false)
                setIsSelectingStart(true)
                setFromLocation(null)
                setIsFromLocationFromGPS(false)
                if (watchPositionIdRef.current !== null) {
                  navigator.geolocation.clearWatch(watchPositionIdRef.current)
                  watchPositionIdRef.current = null
                }
              }}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap"
              title="Zmień punkt startowy"
            >
              Edytuj
            </button>
          </div>
        </div>

        {/* Destination Location */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg flex-shrink-0" title="Punkt docelowy">🏁</span>
          <div className="flex-1 min-w-0">
            {toLocation ? (
              <div className="text-sm text-gray-900 bg-gray-50 rounded px-2 py-1.5 truncate">
                {toLocation.lat.toFixed(4)}, {toLocation.lng.toFixed(4)}
              </div>
            ) : (
              <div className="text-sm text-gray-400 bg-gray-50 rounded px-2 py-1.5 border-2 border-dashed border-gray-300">
                Nie ustawiono
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsSelectingStart(false)
              setIsSelectingDestination(true)
            }}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap flex-shrink-0"
            title={toLocation ? "Zmień punkt docelowy" : "Ustaw punkt docelowy"}
          >
            Edytuj
          </button>
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
                setIsFromLocationFromGPS(false) // Mark that location is set manually
                // Stop GPS tracking when user sets location manually
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

        {/* Confirm Location Button - pokazuje się gdy wybieramy lokalizację startową */}
        {isSelectingStart && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-20">
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
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-20">
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
        <div className={`absolute right-4 z-10 flex flex-col gap-3 ${showFormPanel ? 'bottom-[calc(40vh+80px)]' : 'bottom-20'}`}>
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
