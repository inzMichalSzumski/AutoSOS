import { HelpRequest, Operator, RequestStatusType } from '../App'

interface OperatorListProps {
  request: HelpRequest
  operators: Operator[]
  onSelect: (operator: Operator) => void
  selectedOperator: Operator | null
  onAccept: () => void
  status: RequestStatusType
}

export default function OperatorList({
  request,
  operators,
  onSelect,
  selectedOperator,
  onAccept,
  status,
}: OperatorListProps) {
  if (status === 'searching' && operators.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Szukam dostępnej pomocy...
        </h2>
        <p className="text-gray-600">
          Sprawdzam operatorów w Twojej okolicy
        </p>
      </div>
    )
  }

  if (operators.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Brak dostępnych operatorów
        </h2>
        <p className="text-gray-600 mb-4">
          Niestety, nie znaleziono dostępnej pomocy w Twojej okolicy.
        </p>
        <button className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-6 rounded-lg">
          Spróbuj ponownie
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {status === 'offer_received' ? 'Wybierz operatora' : 'Dostępna pomoc'}
        </h2>
        <p className="text-gray-600 mb-4">
          Znaleziono {operators.length} {operators.length === 1 ? 'operatora' : 'operatorów'} w pobliżu
        </p>
      </div>

      <div className="space-y-4">
        {operators.map((operator) => (
          <div
            key={operator.id}
            className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all ${
              selectedOperator?.id === operator.id
                ? 'ring-4 ring-primary-500 border-2 border-primary-500'
                : 'hover:shadow-xl hover:scale-105'
            }`}
            onClick={() => onSelect(operator)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{operator.name}</h3>
                <p className="text-sm text-gray-500">{operator.vehicleType}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-600">
                  {operator.estimatedPrice ? `${operator.estimatedPrice} zł` : 'Cena do ustalenia'}
                </div>
                {operator.estimatedTime && (
                  <div className="text-sm text-gray-500">
                    ~{operator.estimatedTime} min
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>📞 {operator.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📍 {operator.distance.toFixed(1)} km</span>
              </div>
            </div>

            {selectedOperator?.id === operator.id && status === 'offer_received' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAccept()
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-105 shadow-lg"
                >
                  ✓ Akceptuję ofertę
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

