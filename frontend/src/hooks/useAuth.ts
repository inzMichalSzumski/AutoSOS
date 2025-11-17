import { useState, useEffect } from 'react'
import { authService } from '../services/auth'

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [operatorId, setOperatorId] = useState<string | null>(null)
  const [operatorName, setOperatorName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = authService.getToken()
    const opId = authService.getOperatorId()
    const opName = authService.getOperatorName()
    
    setIsAuthenticated(!!token)
    setOperatorId(opId)
    setOperatorName(opName)
    setLoading(false)
  }, [])

  const logout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setOperatorId(null)
    setOperatorName(null)
  }

  return {
    isAuthenticated,
    operatorId,
    operatorName,
    loading,
    logout
  }
}

