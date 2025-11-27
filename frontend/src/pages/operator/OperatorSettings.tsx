import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../services/api'

interface Equipment {
  id: string
  name: string
  description: string
  requiresTransport: boolean
}

export default function OperatorSettings() {
  const { operatorId, operatorName } = useAuth()
  const navigate = useNavigate()
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([])
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [operatorId])

  const loadData = async () => {
    if (!operatorId) return

    try {
      setLoading(true)
      
      // Load all available equipment
      const allEq = await apiClient.getEquipment()
      setAllEquipment(allEq.equipment)

      // Load operator's current equipment
      try {
        const operatorEq = await apiClient.getOperatorEquipment(operatorId)
        const selectedIds = new Set(operatorEq.equipment.map((eq: Equipment) => eq.id))
        setSelectedEquipmentIds(selectedIds)
      } catch (equipmentError) {
        // If operator has no equipment yet, that's OK - start with empty selection
        console.log('No equipment found for operator (this is OK for new operators)')
        setSelectedEquipmentIds(new Set())
      }
    } catch (error) {
      console.error('Error loading equipment:', error)
      alert('Nie udało się załadować sprzętu')
    } finally {
      setLoading(false)
    }
  }

  const toggleEquipment = (equipmentId: string) => {
    const newSelected = new Set(selectedEquipmentIds)
    if (newSelected.has(equipmentId)) {
      newSelected.delete(equipmentId)
    } else {
      newSelected.add(equipmentId)
    }
    setSelectedEquipmentIds(newSelected)
  }

  const handleSave = async () => {
    if (!operatorId) return

    try {
      setSaving(true)
      console.log('Saving equipment for operator:', operatorId)
      console.log('Selected equipment IDs:', Array.from(selectedEquipmentIds))
      
      const result = await apiClient.updateOperatorEquipment(operatorId, Array.from(selectedEquipmentIds))
      console.log('Save result:', result)
      
      alert('Sprzęt zaktualizowany pomyślnie!')
    } catch (error) {
      console.error('Error saving equipment:', error)
      
      // Show more detailed error
      if (error instanceof Error) {
        alert(`Nie udało się zapisać sprzętu: ${error.message}`)
      } else {
        alert('Nie udało się zapisać sprzętu')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                ⚙️ Ustawienia
              </h1>
              <p className="text-gray-600 mt-1">
                {operatorName}
              </p>
            </div>
            <button
              onClick={() => navigate('/operator')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-6 rounded-lg transition-colors"
            >
              ← Powrót
            </button>
          </div>
        </div>

        {/* Equipment Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🔧 Mój sprzęt
          </h2>
          <p className="text-gray-600 mb-6">
            Zaznacz sprzęt, który posiadasz. Będziesz otrzymywać zgłoszenia odpowiednie do Twojego wyposażenia.
          </p>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Ładowanie...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {allEquipment.map((equipment) => (
                  <label
                    key={equipment.id}
                    className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedEquipmentIds.has(equipment.id)
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEquipmentIds.has(equipment.id)}
                      onChange={() => toggleEquipment(equipment.id)}
                      className="mt-1 h-5 w-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{equipment.name}</h3>
                        {equipment.requiresTransport && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                            Wymaga transportu
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{equipment.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Wybrano: <strong>{selectedEquipmentIds.size}</strong> z {allEquipment.length}
                </p>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                >
                  {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

