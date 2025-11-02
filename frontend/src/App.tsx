import { useState } from 'react'
import HelpRequestForm from './components/HelpRequestForm'
import OperatorList from './components/OperatorList'
import RequestStatus from './components/RequestStatus'

export interface Location {
  lat: number
  lng: number
}

export interface HelpRequest {
  id: string
  phoneNumber: string
  fromLocation: Location
  toLocation?: Location
  description: string
}

export interface Operator {
  id: string
  name: string
  phone: string
  distance: number // w km
  estimatedPrice?: number
  estimatedTime?: number // w minutach
  vehicleType: string
}

export type RequestStatusType = 'draft' | 'searching' | 'offer_received' | 'accepted' | 'on_the_way' | 'completed'

function App() {
  const [currentRequest, setCurrentRequest] = useState<HelpRequest | null>(null)
  const [availableOperators, setAvailableOperators] = useState<Operator[]>([])
  const [requestStatus, setRequestStatus] = useState<RequestStatusType>('draft')
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null)

  const handleRequestSubmit = (request: HelpRequest) => {
    setCurrentRequest(request)
    setRequestStatus('searching')
    // TODO: Połączenie z backendem - pobranie dostępnych operatorów
    // Na razie mock danych
    setAvailableOperators([
      {
        id: '1',
        name: 'Laweta Express',
        phone: '+48 123 456 789',
        distance: 2.5,
        estimatedPrice: 150,
        estimatedTime: 15,
        vehicleType: 'Laweta'
      },
      {
        id: '2',
        name: 'Pomoc Drogowa 24h',
        phone: '+48 987 654 321',
        distance: 5.1,
        estimatedPrice: 200,
        estimatedTime: 25,
        vehicleType: 'Laweta'
      }
    ])
  }

  const handleOperatorSelect = (operator: Operator) => {
    setSelectedOperator(operator)
    setRequestStatus('offer_received')
    // TODO: Wysyłanie akceptacji do backendu
  }

  const handleAcceptOffer = () => {
    if (selectedOperator) {
      setRequestStatus('accepted')
      // TODO: Wysyłanie do backendu
    }
  }

  const handleNewRequest = () => {
    setCurrentRequest(null)
    setAvailableOperators([])
    setRequestStatus('draft')
    setSelectedOperator(null)
  }

  if (!currentRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-2">
              🚗 AutoSOS
            </h1>
            <p className="text-xl text-gray-600">
              Szybka pomoc drogowa zawsze pod ręką
            </p>
          </div>
          <HelpRequestForm onSubmit={handleRequestSubmit} />
        </div>
      </div>
    )
  }

  if (requestStatus === 'searching' || requestStatus === 'offer_received') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <OperatorList
            request={currentRequest}
            operators={availableOperators}
            onSelect={handleOperatorSelect}
            selectedOperator={selectedOperator}
            onAccept={handleAcceptOffer}
            status={requestStatus}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <RequestStatus
          request={currentRequest}
          operator={selectedOperator}
          status={requestStatus}
          onNewRequest={handleNewRequest}
        />
      </div>
    </div>
  )
}

export default App

