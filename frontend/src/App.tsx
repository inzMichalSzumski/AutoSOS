import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import UserApp from './pages/user/UserApp'
import RequestHelp from './pages/user/RequestHelp'
import OperatorLogin from './pages/operator/OperatorLogin'
import OperatorRegister from './pages/operator/OperatorRegister'
import OperatorApp from './pages/operator/OperatorApp'
import OperatorSettings from './pages/operator/OperatorSettings'

// Protected component - requires authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/operator/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Strona dla użytkowników - BEZ logowania */}
        <Route path="/" element={<UserApp />} />
        <Route path="/request-help" element={<RequestHelp />} />

        {/* Strony autentykacji operatora */}
        <Route path="/operator/login" element={<OperatorLogin />} />
        <Route path="/operator/register" element={<OperatorRegister />} />

        {/* Panel operatora - WYMAGA logowania */}
        <Route
          path="/operator"
          element={
            <ProtectedRoute>
              <OperatorApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operator/settings"
          element={
            <ProtectedRoute>
              <OperatorSettings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
