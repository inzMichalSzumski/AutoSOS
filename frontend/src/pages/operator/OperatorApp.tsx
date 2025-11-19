import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function OperatorApp() {
  const { operatorName, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/operator/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🚗 Panel Operatora
              </h1>
              <p className="text-gray-600 mt-1">
                Witaj, {operatorName}!
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Wyloguj się
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Dashboard
          </h2>
          <p className="text-gray-600 mb-6">
            Tutaj będzie lista zgłoszeń i funkcje dla operatora.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-2">
                📋 Nowe zgłoszenia
              </h3>
              <p className="text-3xl font-bold text-blue-600">0</p>
              <p className="text-sm text-blue-700 mt-2">
                Czekają na Twoją ofertę
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-900 mb-2">
                ✅ Aktywne zlecenia
              </h3>
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-green-700 mt-2">
                Zaakceptowane przez klientów
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-purple-900 mb-2">
                📊 Ukończone dzisiaj
              </h3>
              <p className="text-3xl font-bold text-purple-600">0</p>
              <p className="text-sm text-purple-700 mt-2">
                Zakończone pomyślnie
              </p>
            </div>
          </div>

          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-yellow-900 mb-2">
              🚧 W budowie
            </h3>
            <p className="text-yellow-800">
              Panel operatora jest w fazie rozwoju. Wkrótce dostępne będą:
            </p>
            <ul className="list-disc list-inside mt-2 text-yellow-800 space-y-1">
              <li>Lista przychodzących zgłoszeń</li>
              <li>Wysyłanie ofert do klientów</li>
              <li>Zarządzanie dostępnością</li>
              <li>Aktualizacja lokalizacji GPS</li>
              <li>Historia zleceń</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

