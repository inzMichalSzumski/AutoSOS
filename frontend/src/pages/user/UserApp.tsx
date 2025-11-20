import { useState } from 'react'
import { Link } from 'react-router-dom'
import HelpRequestForm from '../../components/HelpRequestForm'
import OperatorList from '../../components/OperatorList'
import RequestStatus from '../../components/RequestStatus'
import { apiClient } from '../../services/api'
import type { HelpRequest, Operator, RequestStatusType } from '../../types'

export default function UserApp() {
  const [currentRequest, setCurrentRequest] = useState<HelpRequest | null>(null)
  const [availableOperators, setAvailableOperators] = useState<Operator[]>([])
  const [requestStatus, setRequestStatus] = useState<RequestStatusType>('draft')
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null)

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

      // 3. Fetch available operators
      const operatorsResponse = await apiClient.getOperators(
        request.fromLocation.lat,
        request.fromLocation.lng,
        20
      )

      // 4. Map backend response to frontend format
      const operators: Operator[] = operatorsResponse.operators.map((op) => ({
        id: op.id,
        name: op.name,
        phone: op.phone,
        distance: op.distance,
        vehicleType: op.vehicleType,
      }))

      setAvailableOperators(operators)
    } catch (error) {
      console.error('Error creating request:', error)
      alert('Failed to create request. Please try again.')
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
    setCurrentRequest(null)
    setAvailableOperators([])
    setRequestStatus('draft')
    setSelectedOperator(null)
  }

  if (!currentRequest) {
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <HelpRequestForm onSubmit={handleRequestSubmit} />
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

