import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { Icon } from 'leaflet'
import { HelpRequest, Location } from '../App'

// Fix dla ikon Leaflet w Vite
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface HelpRequestFormProps {
  onSubmit: (request: HelpRequest) => void
}

function LocationPicker({ 
  position, 
  onPositionChange 
}: { 
  position: Location | null
  onPositionChange: (loc: Location) => void 
}) {
  useMapEvents({
    click(e) {
      onPositionChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })

  return position ? <Marker position={[position.lat, position.lng]} icon={DefaultIcon} /> : null
}

export default function HelpRequestForm({ onSubmit }: HelpRequestFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [description, setDescription] = useState('')
  const [fromLocation, setFromLocation] = useState<Location | null>(null)
  const [toLocation, setToLocation] = useState<Location | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.2297, 21.0122]) // Warszawa
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    getCurrentLocation()
  }, [])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Twoja przeglądarka nie obsługuje geolokalizacji')
      return
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
      },
      (error) => {
        setLocationError('Nie udało się uzyskać lokalizacji. Kliknij na mapie, aby wskazać lokalizację.')
        console.error('Błąd geolokalizacji:', error)
      }
    )
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
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
        Wezwij Pomoc Drogową
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lokalizacja startowa (punkt A) *
          </label>
          {locationError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
              <p className="text-yellow-800 text-sm">{locationError}</p>
              <button
                type="button"
                onClick={getCurrentLocation}
                className="mt-2 text-sm text-yellow-900 underline hover:text-yellow-700"
              >
                Użyj mojej lokalizacji
              </button>
            </div>
          )}
          {fromLocation && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
              <p className="text-green-800 text-sm">
                ✓ Lokalizacja: {fromLocation.lat.toFixed(6)}, {fromLocation.lng.toFixed(6)}
              </p>
            </div>
          )}
          <div className="h-64 rounded-lg overflow-hidden border border-gray-300">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker position={fromLocation} onPositionChange={setFromLocation} />
            </MapContainer>
          </div>
          <button
            type="button"
            onClick={getCurrentLocation}
            className="mt-2 text-sm text-primary-600 hover:text-primary-700 underline"
          >
            Użyj mojej lokalizacji
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lokalizacja docelowa (punkt B) - opcjonalnie
          </label>
          <div className="h-64 rounded-lg overflow-hidden border border-gray-300">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker position={toLocation} onPositionChange={setToLocation} />
            </MapContainer>
          </div>
          {toLocation && (
            <button
              type="button"
              onClick={() => setToLocation(null)}
              className="mt-2 text-sm text-danger-600 hover:text-danger-700 underline"
            >
              Usuń lokalizację docelową
            </button>
          )}
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
  )
}

