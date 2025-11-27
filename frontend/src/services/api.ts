const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
import { authService } from './auth';

export interface CreateRequestDto {
  phoneNumber: string;
  fromLatitude: number;
  fromLongitude: number;
  toLatitude?: number;
  toLongitude?: number;
  description?: string;
  requiredEquipmentId?: string;
}

export interface Equipment {
  id: string;
  name: string;
  description: string;
  requiresTransport: boolean;
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
  currentLatitude?: number;
  currentLongitude?: number;
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
    
    // Get JWT token if exists
    const token = authService.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };
    
    // Add token to header if exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
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

  async getEquipment(): Promise<{ equipment: Equipment[] }> {
    return this.request<{ equipment: Equipment[] }>('/api/equipment', {
      method: 'GET',
    });
  }

  async getRequest(id: string): Promise<any> {
    return this.request(`/api/requests/${id}`);
  }

  async cancelRequest(id: string, phoneNumber: string): Promise<{ id: string; status: string; message: string }> {
    return this.request<{ id: string; status: string; message: string }>(`/api/requests/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async getAvailableRequests(): Promise<{ requests: any[] }> {
    return this.request<{ requests: any[] }>('/api/requests/available');
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

  // Operator endpoints (require authentication)
  
  async updateOperatorLocation(operatorId: string, latitude: number, longitude: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/operators/${operatorId}/location`, {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude }),
    });
  }

  async updateOperatorAvailability(operatorId: string, isAvailable: boolean): Promise<{ success: boolean; isAvailable: boolean }> {
    return this.request<{ success: boolean; isAvailable: boolean }>(`/api/operators/${operatorId}/availability`, {
      method: 'PUT',
      body: JSON.stringify({ isAvailable }),
    });
  }

  // Push notification endpoints
  
  async savePushSubscription(subscriptionData: {
    operatorId: string;
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/push-subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscriptionData),
    });
  }

  async removePushSubscription(operatorId: string, endpoint: string): Promise<{ message: string }> {
    const params = new URLSearchParams({
      operatorId,
      endpoint,
    });
    
    return this.request<{ message: string }>(`/api/push-subscriptions?${params}`, {
      method: 'DELETE',
    });
  }

  async getPushSubscriptions(operatorId: string): Promise<any[]> {
    return this.request<any[]>(`/api/push-subscriptions/${operatorId}`);
  }
}

export const apiClient = new ApiClient();

