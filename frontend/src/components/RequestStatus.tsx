import type { HelpRequest, Operator, RequestStatusType } from '../types'

interface RequestStatusProps {
  request: HelpRequest
  operator: Operator | null
  status: RequestStatusType
  onNewRequest: () => void
}

const statusMessages: Record<RequestStatusType, string> = {
  draft: 'Szkic',
  searching: 'Szukanie pomocy...',
  offer_received: 'Otrzymano ofertę',
  accepted: 'Oferta zaakceptowana',
  on_the_way: 'Pomoc w drodze',
  completed: 'Zakończone',
}

const statusColors: Record<RequestStatusType, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  searching: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  offer_received: 'bg-blue-100 text-blue-800 border-blue-300',
  accepted: 'bg-purple-100 text-purple-800 border-purple-300',
  on_the_way: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
}

export default function RequestStatus({
  request,
  operator,
  status,
  onNewRequest,
}: RequestStatusProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
      <div className="text-center mb-8">
        <div className="inline-block bg-danger-100 rounded-full p-4 mb-4">
          <span className="text-4xl">🚨</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Status Zgłoszenia
        </h2>
        <p className="text-gray-600">ID: {request.id}</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className={`px-4 py-3 rounded-lg border-2 font-semibold ${statusColors[status]}`}>
            {statusMessages[status]}
          </div>
        </div>

        {operator && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Operator
            </label>
            <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-semibold text-gray-900">{operator.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                📞 {operator.phone} | 📍 {operator.distance.toFixed(1)} km
              </div>
              {operator.estimatedPrice && (
                <div className="text-sm font-semibold text-primary-600 mt-1">
                  Cena: {operator.estimatedPrice} zł
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Numer telefonu
          </label>
          <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
            {request.phoneNumber}
          </div>
        </div>

        {request.description && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opis problemu
            </label>
            <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              {request.description}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lokalizacja startowa
          </label>
          <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 mb-2">
            {request.fromLocation.lat.toFixed(6)}, {request.fromLocation.lng.toFixed(6)}
          </div>
          <a
            href={`https://www.google.com/maps?q=${request.fromLocation.lat},${request.fromLocation.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 hover:text-primary-700 underline"
          >
            Otwórz w Google Maps →
          </a>
        </div>

        {request.toLocation && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lokalizacja docelowa
            </label>
            <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 mb-2">
              {request.toLocation.lat.toFixed(6)}, {request.toLocation.lng.toFixed(6)}
            </div>
            <a
              href={`https://www.google.com/maps?q=${request.toLocation.lat},${request.toLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 underline"
            >
              Otwórz w Google Maps →
            </a>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onNewRequest}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-105 shadow-lg"
          >
            Nowe Zgłoszenie
          </button>
        </div>
      </div>
    </div>
  )
}

