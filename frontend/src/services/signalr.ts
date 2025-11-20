import * as signalR from '@microsoft/signalr'
import { authService } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

class SignalRService {
  private connection: signalR.HubConnection | null = null

  async connectToRequestHub(requestId: string): Promise<signalR.HubConnection> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinRequestGroup', requestId)
      return this.connection
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/request`)
      .withAutomaticReconnect()
      .build()

    await this.connection.start()
    await this.connection.invoke('JoinRequestGroup', requestId)
    
    return this.connection
  }

  async connectToOperatorHub(operatorId: string): Promise<signalR.HubConnection> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinOperatorGroup', operatorId)
      return this.connection
    }

    const token = authService.getToken()
    
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/request`, {
        accessTokenFactory: () => token || ''
      })
      .withAutomaticReconnect()
      .build()

    await this.connection.start()
    await this.connection.invoke('JoinOperatorGroup', operatorId)
    
    return this.connection
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop()
      this.connection = null
    }
  }

  getConnection(): signalR.HubConnection | null {
    return this.connection
  }
}

export const signalRService = new SignalRService()

