const API_URL = 'http://localhost:5000/api'

export interface RegisterData {
  email: string
  password: string
  name: string
  phone: string
  vehicleType: string
  serviceRadiusKm?: number
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  operatorId: string
  name: string
  email: string
}

export const authService = {
  async register(data: RegisterData): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Błąd rejestracji')
    }
    
    return response.json()
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error('Nieprawidłowy email lub hasło')
    }
    
    const authData = await response.json()
    
    // Zapisz token w localStorage
    localStorage.setItem('authToken', authData.token)
    localStorage.setItem('operatorId', authData.operatorId)
    localStorage.setItem('operatorName', authData.name)
    
    return authData
  },

  logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('operatorId')
    localStorage.removeItem('operatorName')
  },

  getToken(): string | null {
    return localStorage.getItem('authToken')
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  },

  getOperatorId(): string | null {
    return localStorage.getItem('operatorId')
  },

  getOperatorName(): string | null {
    return localStorage.getItem('operatorName')
  }
}

