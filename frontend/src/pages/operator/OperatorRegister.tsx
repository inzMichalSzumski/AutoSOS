import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../../services/auth'
import { apiClient, type Equipment } from '../../services/api'

export default function OperatorRegister() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    vehicleType: 'Laweta',
    serviceRadiusKm: 20,
    equipmentIds: [] as string[]
  })
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingEquipment, setLoadingEquipment] = useState(true)

  // Pobierz dostępne sprzęty z API
  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const response = await apiClient.getEquipment()
        setEquipment(response.equipment)
      } catch (err) {
        console.error('Error loading equipment:', err)
        setError('Nie udało się załadować listy sprzętów')
      } finally {
        setLoadingEquipment(false)
      }
    }
    loadEquipment()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Walidacja
    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne')
      return
    }

    if (formData.password.length < 6) {
      setError('Hasło musi mieć minimum 6 znaków')
      return
    }

    setLoading(true)

    try {
      await authService.register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        vehicleType: formData.vehicleType,
        serviceRadiusKm: formData.serviceRadiusKm,
        equipmentIds: formData.equipmentIds
      })

      // Przekieruj do logowania
      navigate('/operator/login', { 
        state: { message: 'Konto utworzone! Zaloguj się.' } 
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚗 AutoSOS
          </h1>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            Rejestracja Operatora
          </h2>
          <p className="text-gray-600">
            Utwórz konto, aby pomagać kierowcom
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="twoj@email.pl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasło
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Potwierdź hasło
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imię i nazwisko / Nazwa firmy
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Jan Kowalski"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+48 123 456 789"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ pojazdu
            </label>
            <select
              value={formData.vehicleType}
              onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="Laweta">Laweta</option>
              <option value="Pomoc drogowa">Pomoc drogowa</option>
              <option value="Mechanik">Mechanik</option>
              <option value="Elektryk samochodowy">Elektryk samochodowy</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Promień działania (km)
            </label>
            <input
              type="number"
              min={5}
              max={100}
              value={formData.serviceRadiusKm}
              onChange={(e) => setFormData({ ...formData, serviceRadiusKm: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Posiadany sprzęt
            </label>
            {loadingEquipment ? (
              <div className="text-sm text-gray-500">Ładowanie sprzętów...</div>
            ) : (
              <>
                <div className="space-y-3">
                  {equipment.map((eq) => (
                    <label key={eq.id} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.equipmentIds.includes(eq.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              equipmentIds: [...formData.equipmentIds, eq.id]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              equipmentIds: formData.equipmentIds.filter(id => id !== eq.id)
                            })
                          }
                        }}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-0.5"
                      />
                      <div className="flex-1">
                        <span className="text-gray-700 font-medium">{eq.name}</span>
                        {eq.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{eq.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Zaznacz wszystkie rodzaje sprzętu, którymi dysponujesz
                </p>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Rejestrowanie...' : 'Zarejestruj się'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-600">
            Masz już konto?{' '}
            <Link to="/operator/login" className="text-primary-600 hover:underline font-medium">
              Zaloguj się
            </Link>
          </p>
          <p className="text-gray-600">
            <Link to="/" className="text-primary-600 hover:underline font-medium">
              ← Powrót do strony głównej
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

