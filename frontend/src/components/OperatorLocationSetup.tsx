import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Location {
  lat: number
  lng: number
}

interface OperatorLocationSetupProps {
  initialLocation?: Location | null
  onLocationSet: (location: Location) => void
  onCancel?: () => void
  isModal?: boolean
}

// Fixed marker icon for when location is confirmed (not selecting)
const FixedMarkerIcon = new Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Component to handle map center tracking
function MapCenterTracker({ 
  onLocationChange,
  shouldUpdate
}: { 
  onLocationChange: (loc: Location) => void
  shouldUpdate: boolean
}) {
  const map = useMap()
  
  useEffect(() => {
    const updateLocation = () => {
      if (shouldUpdate) {
        const center = map.getCenter()
        onLocationChange({ lat: center.lat, lng: center.lng })
      }
    }

    map.on('moveend', updateLocation)
    
    return () => {
      map.off('moveend', updateLocation)
    }
  }, [map, onLocationChange, shouldUpdate])

  return null
}

export default function OperatorLocationSetup({
  initialLocation,
  onLocationSet,
  onCancel,
  isModal = true
}: OperatorLocationSetupProps) {
  const [location, setLocation] = useState<Location | null>(initialLocation || null)
  const [mapCenter, setMapCenter] = useState<Location>(
    initialLocation || { lat: 52.2297, lng: 21.0122 } // Default: Warsaw
  )
  const [isLoadingGPS, setIsLoadingGPS] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isManualSelection, setIsManualSelection] = useState(false)

  // Get current GPS location
  const getCurrentLocation = () => {
    setIsLoadingGPS(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setIsLoadingGPS(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setLocation(newLocation)
        setMapCenter(newLocation)
        setIsLoadingGPS(false)
        setIsManualSelection(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        setLocationError('Unable to get your location. Please select manually on the map.')
        setIsLoadingGPS(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const handleSubmit = () => {
    if (location) {
      onLocationSet(location)
    }
  }

  const handleManualSelection = () => {
    setIsManualSelection(true)
    setLocationError(null)
  }

  const containerClass = isModal
    ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
    : 'w-full h-full'

  const contentClass = isModal
    ? 'bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto'
    : 'bg-white rounded-2xl shadow-lg w-full h-full'

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              📍 Set Your Location
            </h2>
            <p className="text-gray-600">
              Set your current location so users can find you. You can use GPS or select manually on the map.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={getCurrentLocation}
              disabled={isLoadingGPS}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoadingGPS ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  <span>Getting location...</span>
                </>
              ) : (
                <>
                  <span>📍</span>
                  <span>Use My GPS Location</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleManualSelection}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>🗺️</span>
              <span>Select on Map</span>
            </button>
          </div>

          {/* Error message */}
          {locationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">{locationError}</p>
            </div>
          )}

          {/* Instructions */}
          {isManualSelection && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Move the map</strong> to position the pin at your location, then click "Confirm Location"
              </p>
            </div>
          )}

          {/* Map */}
          <div className="relative mb-4 h-96">
            {/* Crosshair pin - centered on map during manual selection */}
            {isManualSelection && (
              <div 
                className="absolute top-1/2 left-1/2 pointer-events-none" 
                style={{ 
                  transform: 'translate(-12px, -41px)',
                  zIndex: 1000
                }}
              >
                <img
                  src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png"
                  alt=""
                  className="w-[25px] h-[41px] drop-shadow-lg"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>
            )}

            <div className="h-full rounded-lg overflow-hidden border-2 border-gray-300">
              <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Fixed marker when location is confirmed (not selecting) */}
                {location && !isManualSelection && (
                  <Marker
                    position={[location.lat, location.lng]}
                    icon={FixedMarkerIcon}
                  />
                )}

                {/* Track map center for manual selection */}
                <MapCenterTracker
                  onLocationChange={(loc) => {
                    setMapCenter(loc)
                    if (isManualSelection) {
                      setLocation(loc)
                    }
                  }}
                  shouldUpdate={isManualSelection}
                />
              </MapContainer>
            </div>
          </div>

          {/* Location info */}
          {location && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-800">
                <strong>Selected location:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!location}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

