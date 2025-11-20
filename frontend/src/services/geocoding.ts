// Geocoding service using Nominatim API (OpenStreetMap)

export interface GeocodingResult {
  display_name: string
  lat: number
  lon: number
  type: string
  class: string
}

export interface POIResult {
  display_name: string
  lat: number
  lon: number
  type: string
  class: string
  icon?: string
}

/**
 * Search for addresses using Nominatim API
 */
export async function searchAddresses(query: string, limit: number = 5): Promise<GeocodingResult[]> {
  if (!query.trim()) return []

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `limit=${limit}&` +
      `addressdetails=1&` +
      `countrycodes=pl&` +
      `accept-language=pl`,
      {
        headers: {
          'User-Agent': 'AutoSOS/1.0',
        },
      }
    )

    if (!response.ok) {
      throw new Error('Geocoding request failed')
    }

    const data = await response.json()
    return data.map((item: any) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
      class: item.class,
    }))
  } catch (error) {
    console.error('Error searching addresses:', error)
    return []
  }
}

/**
 * Search for POI (Points of Interest) like workshops, tire shops, services
 */
export async function searchPOI(
  query: string,
  centerLat: number,
  centerLng: number,
  radius: number = 5000,
  limit: number = 10
): Promise<POIResult[]> {
  if (!query.trim()) return []

  // Map Polish terms to OSM categories
  const poiCategories: Record<string, string[]> = {
    'warsztat': ['car_repair', 'garage'],
    'wulkanizacja': ['tire', 'car_repair'],
    'serwis': ['car_repair', 'garage', 'service'],
    'stacja benzynowa': ['fuel'],
    'pomoc drogowa': ['tow_truck', 'car_repair'],
    'mechanik': ['car_repair', 'garage'],
  }

  const searchTerms = query.toLowerCase()
  let categoryFilter = ''

  // Try to match category
  for (const [key, categories] of Object.entries(poiCategories)) {
    if (searchTerms.includes(key)) {
      // Use general search with category hint
      break
    }
  }

  try {
    // Search for POI near center point
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `limit=${limit}&` +
      `bounded=1&` +
      `viewbox=${centerLng - 0.1},${centerLat + 0.1},${centerLng + 0.1},${centerLat - 0.1}&` +
      `addressdetails=1&` +
      `countrycodes=pl&` +
      `accept-language=pl`,
      {
        headers: {
          'User-Agent': 'AutoSOS/1.0',
        },
      }
    )

    if (!response.ok) {
      throw new Error('POI search request failed')
    }

    const data = await response.json()
    
    // Filter and map results
    return data
      .filter((item: any) => {
        // Filter by distance (rough check)
        const distance = calculateDistance(
          centerLat,
          centerLng,
          parseFloat(item.lat),
          parseFloat(item.lon)
        )
        return distance <= radius / 1000 // Convert to km
      })
      .map((item: any) => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type,
        class: item.class,
        icon: item.icon,
      }))
      .slice(0, limit)
  } catch (error) {
    console.error('Error searching POI:', error)
    return []
  }
}

/**
 * Reverse geocoding - get address from coordinates
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
      `lat=${lat}&` +
      `lon=${lng}&` +
      `format=json&` +
      `addressdetails=1&` +
      `accept-language=pl`,
      {
        headers: {
          'User-Agent': 'AutoSOS/1.0',
        },
      }
    )

    if (!response.ok) {
      throw new Error('Reverse geocoding request failed')
    }

    const data = await response.json()
    return data.display_name || null
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return null
  }
}

/**
 * Calculate distance between two points in kilometers (Haversine formula)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

export interface RoutePoint {
  lat: number
  lng: number
}

export interface RouteResult {
  coordinates: RoutePoint[]
  distance: number // w kilometrach
  duration: number // w sekundach
}

/**
 * Get route between two points using OSRM (Open Source Routing Machine)
 */
export async function getRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteResult | null> {
  try {
    // OSRM public endpoint
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
    )

    if (!response.ok) {
      throw new Error('Route request failed')
    }

    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null
    }

    const route = data.routes[0]
    const geometry = route.geometry.coordinates

    // Konwertuj z [lng, lat] na {lat, lng}
    const coordinates: RoutePoint[] = geometry.map((coord: [number, number]) => ({
      lng: coord[0],
      lat: coord[1],
    }))

    return {
      coordinates,
      distance: route.distance / 1000, // Konwertuj z metrów na kilometry
      duration: route.duration, // w sekundach
    }
  } catch (error) {
    console.error('Error getting route:', error)
    return null
  }
}

