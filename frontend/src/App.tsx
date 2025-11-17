import { useState } from 'react'
import HelpRequestForm from './components/HelpRequestForm'
import OperatorList from './components/OperatorList'
import RequestStatus from './components/RequestStatus'
import { apiClient } from './services/api'

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
  offerId?: string // ID oferty z backendu
}

export type RequestStatusType = 'draft' | 'searching' | 'offer_received' | 'accepted' | 'on_the_way' | 'completed'

function App() {
  const [currentRequest, setCurrentRequest] = useState<HelpRequest | null>(null)
  const [availableOperators, setAvailableOperators] = useState<Operator[]>([])
  const [requestStatus, setRequestStatus] = useState<RequestStatusType>('draft')
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null)

  const handleRequestSubmit = async (request: HelpRequest) => {
    try {
      // 1. Utwórz zgłoszenie w backendzie
      const response = await apiClient.createRequest({
        phoneNumber: request.phoneNumber,
        fromLatitude: request.fromLocation.lat,
        fromLongitude: request.fromLocation.lng,
        toLatitude: request.toLocation?.lat,
        toLongitude: request.toLocation?.lng,
        description: request.description,
      })

      // 2. Zaktualizuj request z ID z backendu
      const updatedRequest: HelpRequest = {
        ...request,
        id: response.id,
      }
      setCurrentRequest(updatedRequest)
      setRequestStatus('searching')

      // 3. Pobierz dostępnych operatorów
      const operatorsResponse = await apiClient.getOperators(
        request.fromLocation.lat,
        request.fromLocation.lng,
        20
      )

      // 4. Mapuj odpowiedź z backendu na format frontendu
      const operators: Operator[] = operatorsResponse.operators.map((op) => ({
        id: op.id,
        name: op.name,
        phone: op.phone,
        distance: op.distance,
        vehicleType: op.vehicleType,
      }))

      setAvailableOperators(operators)
    } catch (error) {
      console.error('Błąd podczas tworzenia zgłoszenia:', error)
      alert('Nie udało się utworzyć zgłoszenia. Spróbuj ponownie.')
    }
  }

  const handleOperatorSelect = async (operator: Operator) => {
    if (!currentRequest) return

    try {
      // Operator składa ofertę (symulacja - w prawdziwej aplikacji operator robi to przez swoje API)
      // Na razie używamy przykładowej ceny i czasu
      const estimatedPrice = 150 + Math.floor(Math.random() * 100)
      const estimatedTime = 15 + Math.floor(Math.random() * 20)

      const offerResponse = await apiClient.createOffer({
        requestId: currentRequest.id,
        operatorId: operator.id,
        price: estimatedPrice,
        estimatedTimeMinutes: estimatedTime,
      })

      setSelectedOperator({
        ...operator,
        estimatedPrice,
        estimatedTime,
        offerId: offerResponse.id,
      })
      setRequestStatus('offer_received')
    } catch (error) {
      console.error('Błąd podczas składania oferty:', error)
      alert('Nie udało się złożyć oferty. Spróbuj ponownie.')
    }
  }

  const handleAcceptOffer = async () => {
    if (!selectedOperator || !selectedOperator.offerId) {
      alert('Brak oferty do akceptacji')
      return
    }

    try {
      await apiClient.acceptOffer(selectedOperator.offerId)
      setRequestStatus('accepted')
    } catch (error) {
      console.error('Błąd podczas akceptacji oferty:', error)
      alert('Nie udało się zaakceptować oferty. Spróbuj ponownie.')
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

