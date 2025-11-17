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
  distance: number // w km
  estimatedPrice?: number
  estimatedTime?: number // w minutach
  vehicleType: string
  offerId?: string // ID oferty z backendu
}

export type RequestStatusType = 'draft' | 'searching' | 'offer_received' | 'accepted' | 'on_the_way' | 'completed'

