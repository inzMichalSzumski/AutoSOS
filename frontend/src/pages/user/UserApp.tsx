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

  const loadOffers = async (requestId: string) => {
    try {
      console.log('Loading offers for request:', requestId)
      const offersResponse = await apiClient.getOffersForRequest(requestId)
      console.log('Received offers:', offersResponse)
      
      // Update operators list with offer information
      const operatorsWithOffers: Operator[] = offersResponse.offers.map((offer) => ({
        id: offer.operator.id,
        name: offer.operator.name,
        phone: offer.operator.phone,
        distance: 0, // Distance not available in offer response
        vehicleType: offer.operator.vehicleType,
        estimatedPrice: offer.price,
        estimatedTime: offer.estimatedTimeMinutes,
        offerId: offer.id,
      }))

      console.log('Operators with offers:', operatorsWithOffers)
      setAvailableOperators(operatorsWithOffers)
      
      if (operatorsWithOffers.length > 0) {
        setRequestStatus('offer_received')
      }
    } catch (error) {
      console.error('Error loading offers:', error)
    }
  }

  // Check if we came from RequestHelp with an already created request
  useEffect(() => {
    const state = location.state as { request?: HelpRequest } | null
    if (state?.request) {
      setCurrentRequest(state.request)
      setRequestStatus('searching')
      
      // Connect to SignalR to receive notifications about offers and timeout
      const setupSignalR = async () => {
        try {
          const connection = await signalRService.connectToRequestHub(state.request!.id)
          connectionRef.current = connection

          // Listen for offers
          connection.on('OfferReceived', (data: { id: string; price: number; estimatedTimeMinutes?: number; OperatorName: string }) => {
            // Refresh operator list to show new offer
            loadOperators(state.request!.fromLocation.lat, state.request!.fromLocation.lng)
            setRequestStatus('offer_received')
          })

          // Listen for timeout
          connection.on('RequestTimeout', (data: { id: string; message: string }) => {
            setRequestStatus('completed')
            alert(data.message || 'Nie udało się znaleźć dostępnej pomocy. Spróbuj ponownie później.')
          })
        } catch (error) {
          console.error('Error setting up SignalR:', error)
        }
      }
      
      setupSignalR()
      
      // Load operators for the already created request
      loadOperators(state.request.fromLocation.lat, state.request.fromLocation.lng)
      
      // Clear state after use
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

      // 3. Connect to SignalR to receive notifications about offers and timeout
      const connection = await signalRService.connectToRequestHub(response.id)
      connectionRef.current = connection

      // Listen for offers
      connection.on('OfferReceived', (data: { id: string; price: number; estimatedTimeMinutes?: number; OperatorName: string }) => {
        // Refresh offers list to show new offer
        if (currentRequest?.id) {
          loadOffers(currentRequest.id)
        }
      })

      // Listen for timeout
      connection.on('RequestTimeout', (data: { id: string; message: string }) => {
        setRequestStatus('completed')
        alert(data.message || 'Nie udało się znaleźć dostępnej pomocy. Spróbuj ponownie później.')
      })

      // 4. Poll for offers (backend creates them asynchronously)
      // Start polling after a short delay
      setTimeout(() => loadOffers(response.id), 500)
      setTimeout(() => loadOffers(response.id), 2000)
      setTimeout(() => loadOffers(response.id), 5000)
      setTimeout(() => loadOffers(response.id), 10000)
    } catch (error) {
      console.error('Error creating request:', error)
      alert('Nie udało się utworzyć zgłoszenia. Spróbuj ponownie.')
    }
  }

  const handleOperatorSelect = (operator: Operator) => {
    // User selects an operator to view their offer details
    // Offers are now created by the backend automatically (RequestNotificationService)
    // or by operators through their panel
    console.log('Selected operator:', operator)
    setSelectedOperator(operator)
  }

  const handleAcceptOffer = async () => {
    if (!selectedOperator || !selectedOperator.offerId || !currentRequest) {
      alert('No offer to accept')
      return
    }

    if (!currentRequest.phoneNumber) {
      console.error('Missing phone number in current request:', currentRequest)
      alert('Error: Phone number is missing. Please create a new request.')
      return
    }

    try {
      console.log('Accepting offer:', {
        offerId: selectedOperator.offerId,
        phoneNumber: currentRequest.phoneNumber,
        requestId: currentRequest.id
      })
      await apiClient.acceptOffer(selectedOperator.offerId, currentRequest.phoneNumber)
      setRequestStatus('accepted')
    } catch (error) {
      console.error('Error accepting offer:', error)
      // Show more detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to accept offer: ${errorMessage}`)
    }
  }

  const handleNewRequest = () => {
    // Disconnect SignalR
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

  const handleRetry = async () => {
    // Preserve locations from current request and return to map
    if (currentRequest) {
      // Cancel request in backend
      try {
        await apiClient.cancelRequest(currentRequest.id, currentRequest.phoneNumber)
      } catch (error) {
        console.error('Error cancelling request:', error)
        // Continue even if cancellation failed
      }
      
      // Disconnect SignalR
      if (connectionRef.current) {
        connectionRef.current.off('OfferReceived')
        connectionRef.current.off('RequestTimeout')
        signalRService.disconnect()
        connectionRef.current = null
      }
      
      // Reset state but preserve locations
      const savedFromLocation = currentRequest.fromLocation
      const savedToLocation = currentRequest.toLocation || null
      
      setCurrentRequest(null)
      setAvailableOperators([])
      setRequestStatus('draft')
      setSelectedOperator(null)
      
      // Redirect to main page with preserved locations
      // Locations will be passed through state and used in HelpRequestForm
      navigate('/', {
        state: {
          fromLocation: savedFromLocation,
          toLocation: savedToLocation
        },
        replace: true
      })
    } else {
      // If no request, just return to map
      handleNewRequest()
    }
  }

  // Cleanup SignalR on unmount
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
    // Check if we came from handleRetry with preserved locations
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

