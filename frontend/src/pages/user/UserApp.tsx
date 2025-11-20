import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import HelpRequestForm from '../../components/HelpRequestForm'
import OperatorList from '../../components/OperatorList'
import RequestStatus from '../../components/RequestStatus'
import { apiClient } from '../../services/api'
import { signalRService } from '../../services/signalr'
import * as signalR from '@microsoft/signalr'
import type { HelpRequest, Operator, RequestStatusType, Location } from '../../types'

export default function UserApp() {
  const location = useLocation()
  const navigate = useNavigate()
  const [currentRequest, setCurrentRequest] = useState<HelpRequest | null>(null)
  const [availableOperators, setAvailableOperators] = useState<Operator[]>([])
  const [requestStatus, setRequestStatus] = useState<RequestStatusType>('draft')
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null)
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  const loadOperators = async (lat: number, lng: number) => {
    try {
      const operatorsResponse = await apiClient.getOperators(lat, lng, 20)
      
      const operators: Operator[] = operatorsResponse.operators.map((op) => ({
        id: op.id,
        name: op.name,
        phone: op.phone,
        distance: op.distance,
        vehicleType: op.vehicleType,
      }))

      setAvailableOperators(operators)
    } catch (error) {
      console.error('Error loading operators:', error)
    }
  }

  // Sprawdź czy przyszliśmy z RequestHelp z już utworzonym zgłoszeniem
  useEffect(() => {
    const state = location.state as { request?: HelpRequest } | null
    if (state?.request) {
      setCurrentRequest(state.request)
      setRequestStatus('searching')
      
      // Połącz z SignalR, aby otrzymywać powiadomienia o ofertach i timeout
      const setupSignalR = async () => {
        try {
          const connection = await signalRService.connectToRequestHub(state.request!.id)
          connectionRef.current = connection

          // Nasłuchuj na oferty
          connection.on('OfferReceived', (data: { id: string; price: number; estimatedTimeMinutes?: number; OperatorName: string }) => {
            // Odśwież listę operatorów, aby pokazać nową ofertę
            loadOperators(state.request!.fromLocation.lat, state.request!.fromLocation.lng)
            setRequestStatus('offer_received')
          })

          // Nasłuchuj na timeout
          connection.on('RequestTimeout', (data: { id: string; message: string }) => {
            setRequestStatus('completed')
            alert(data.message || 'Nie udało się znaleźć dostępnej pomocy. Spróbuj ponownie później.')
          })
        } catch (error) {
          console.error('Error setting up SignalR:', error)
        }
      }
      
      setupSignalR()
      
      // Pobierz operatorów dla już utworzonego zgłoszenia
      loadOperators(state.request.fromLocation.lat, state.request.fromLocation.lng)
      
      // Wyczyść state po użyciu
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const handleRequestSubmit = async (request: HelpRequest) => {
    try {
      // 1. Create request in backend
      const response = await apiClient.createRequest({
        phoneNumber: request.phoneNumber,
        fromLatitude: request.fromLocation.lat,
        fromLongitude: request.fromLocation.lng,
        toLatitude: request.toLocation?.lat,
        toLongitude: request.toLocation?.lng,
        description: request.description,
      })

      // 2. Update request with ID from backend
      const updatedRequest: HelpRequest = {
        ...request,
        id: response.id,
      }
      setCurrentRequest(updatedRequest)
      setRequestStatus('searching')

      // 3. Połącz z SignalR, aby otrzymywać powiadomienia o ofertach i timeout
      const connection = await signalRService.connectToRequestHub(response.id)
      connectionRef.current = connection

      // Nasłuchuj na oferty
      connection.on('OfferReceived', (data: { id: string; price: number; estimatedTimeMinutes?: number; OperatorName: string }) => {
        // Odśwież listę operatorów, aby pokazać nową ofertę
        loadOperators(request.fromLocation.lat, request.fromLocation.lng)
        setRequestStatus('offer_received')
      })

      // Nasłuchuj na timeout
      connection.on('RequestTimeout', (data: { id: string; message: string }) => {
        setRequestStatus('completed')
        alert(data.message || 'Nie udało się znaleźć dostępnej pomocy. Spróbuj ponownie później.')
      })

      // 4. Fetch available operators
      await loadOperators(request.fromLocation.lat, request.fromLocation.lng)
    } catch (error) {
      console.error('Error creating request:', error)
      alert('Nie udało się utworzyć zgłoszenia. Spróbuj ponownie.')
    }
  }

  const handleOperatorSelect = async (operator: Operator) => {
    if (!currentRequest) return

    try {
      // Operator submits offer (simulation - in real app operator does this through their API)
      // For now we use sample price and time
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
      console.error('Error submitting offer:', error)
      alert('Failed to submit offer. Please try again.')
    }
  }

  const handleAcceptOffer = async () => {
    if (!selectedOperator || !selectedOperator.offerId) {
      alert('No offer to accept')
      return
    }

    try {
      await apiClient.acceptOffer(selectedOperator.offerId)
      setRequestStatus('accepted')
    } catch (error) {
      console.error('Error accepting offer:', error)
      alert('Failed to accept offer. Please try again.')
    }
  }

  const handleNewRequest = () => {
    // Rozłącz SignalR
    if (connectionRef.current) {
      connectionRef.current.off('OfferReceived')
      connectionRef.current.off('RequestTimeout')
      signalRService.disconnect()
      connectionRef.current = null
    }
    
    setCurrentRequest(null)
    setAvailableOperators([])
    setRequestStatus('draft')
    setSelectedOperator(null)
  }

  const handleRetry = () => {
    // Zachowaj lokalizacje z obecnego zgłoszenia i wróć do mapy
    if (currentRequest) {
      // Rozłącz SignalR
      if (connectionRef.current) {
        connectionRef.current.off('OfferReceived')
        connectionRef.current.off('RequestTimeout')
        signalRService.disconnect()
        connectionRef.current = null
      }
      
      // Reset stanu, ale zachowaj lokalizacje
      const savedFromLocation = currentRequest.fromLocation
      const savedToLocation = currentRequest.toLocation || null
      
      setCurrentRequest(null)
      setAvailableOperators([])
      setRequestStatus('draft')
      setSelectedOperator(null)
      
      // Przekieruj do głównej strony z zachowanymi lokalizacjami
      // Lokalizacje będą przekazane przez state i użyte w HelpRequestForm
      navigate('/', {
        state: {
          fromLocation: savedFromLocation,
          toLocation: savedToLocation
        },
        replace: true
      })
    } else {
      // Jeśli nie ma zgłoszenia, po prostu wróć do mapy
      handleNewRequest()
    }
  }

  // Cleanup SignalR przy unmount
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        connectionRef.current.off('OfferReceived')
        connectionRef.current.off('RequestTimeout')
        signalRService.disconnect()
      }
    }
  }, [])

  if (!currentRequest) {
    // Sprawdź czy przyszliśmy z handleRetry z zachowanymi lokalizacjami
    const retryState = location.state as { fromLocation?: Location; toLocation?: Location } | null
    
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <HelpRequestForm 
          onSubmit={handleRequestSubmit}
          initialFromLocation={retryState?.fromLocation || null}
          initialToLocation={retryState?.toLocation || null}
        />
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
            onRetry={handleRetry}
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

