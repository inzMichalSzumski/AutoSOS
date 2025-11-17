const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface CreateRequestDto {
  phoneNumber: string;
  fromLatitude: number;
  fromLongitude: number;
  toLatitude?: number;
  toLongitude?: number;
  description?: string;
}

export interface RequestResponse {
  id: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
}

export interface OperatorResponse {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  distance: number;
}

export interface OperatorsResponse {
  operators: OperatorResponse[];
}

export interface CreateOfferDto {
  requestId: string;
  operatorId: string;
  price: number;
  estimatedTimeMinutes?: number;
}

export interface OfferResponse {
  id: string;
  price: number;
  estimatedTimeMinutes?: number;
  status: string;
  createdAt: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async createRequest(dto: CreateRequestDto): Promise<RequestResponse> {
    return this.request<RequestResponse>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getRequest(id: string): Promise<any> {
    return this.request(`/api/requests/${id}`);
  }

  async getOperators(
    lat: number,
    lng: number,
    radius: number = 20
  ): Promise<OperatorsResponse> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: radius.toString(),
    });
    
    return this.request<OperatorsResponse>(`/api/operators?${params}`);
  }

  async createOffer(dto: CreateOfferDto): Promise<OfferResponse> {
    return this.request<OfferResponse>('/api/offers', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async acceptOffer(offerId: string): Promise<OfferResponse> {
    return this.request<OfferResponse>(`/api/offers/${offerId}/accept`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();

