// Shared types for the application

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
  distance: number // in km
  estimatedPrice?: number
  estimatedTime?: number // in minutes
  vehicleType: string
  offerId?: string // Offer ID from backend
}

export type RequestStatusType = 'draft' | 'searching' | 'offer_received' | 'accepted' | 'on_the_way' | 'completed'

