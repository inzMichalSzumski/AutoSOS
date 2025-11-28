# Operator Location Management

## Overview

Operators must set their location to receive notifications about nearby help requests. The system uses operator location to:
- Calculate distance to help requests
- Filter requests within service radius
- Show operators to users in range

## How It Works

### 1. First Login Flow

```
Operator logs in
→ System checks if location is set (CurrentLatitude/CurrentLongitude)
→ If NO location: Show location setup modal (mandatory)
→ If location exists: Load operator panel
```

### 2. Location Setup Modal

The operator can set location in two ways:

#### Option A: GPS Location
1. Click "📍 Use My GPS Location"
2. Browser requests permission
3. System gets current coordinates
4. Location displayed on map with wrench icon (🔧)
5. Click "Confirm Location" to save

#### Option B: Manual Selection
1. Click "🗺️ Select on Map"
2. Move map to position wrench marker at desired location
3. Coordinates update in real-time as map moves
4. Click "Confirm Location" to save

### 3. Location Storage

**Backend:**
- Stored in `Operators` table
- Fields: `CurrentLatitude`, `CurrentLongitude`
- Updated via `PUT /api/operators/{id}/location`

**Frontend:**
- Primary source: Backend API
- Fallback: localStorage (if API fails)
- Key: `operator_location_{operatorId}`

### 4. Location Display

In operator panel header:
```
📍 Location: 52.2297, 21.0122 [Change]
```

Click "Change" to update location anytime.

## Components

### OperatorLocationSetup

**Location:** `frontend/src/components/OperatorLocationSetup.tsx`

**Props:**
```typescript
interface OperatorLocationSetupProps {
  initialLocation?: Location | null  // Pre-fill if updating
  onLocationSet: (location: Location) => void  // Callback when confirmed
  onCancel?: () => void  // Optional cancel button
  isModal?: boolean  // Display as modal or inline (default: true)
}
```

**Features:**
- GPS geolocation with error handling
- Manual map selection with live preview
- Leaflet map with OpenStreetMap tiles
- Wrench icon (🔧) for operator marker
- Real-time coordinate display
- Loading states and error messages

### OperatorApp Integration

**Location:** `frontend/src/pages/operator/OperatorApp.tsx`

**State:**
```typescript
const [operatorLocation, setOperatorLocation] = useState<OperatorLocation | null>(null)
const [showLocationSetup, setShowLocationSetup] = useState(false)
```

**Lifecycle:**
1. `useEffect` on mount → `checkOperatorLocation()`
2. Fetch operator details from API
3. If no location → show modal
4. If location exists → load requests

**Functions:**
- `checkOperatorLocation()` - Fetch from backend, fallback to localStorage
- `handleLocationSet()` - Save to backend + localStorage

## API Endpoints

### Get Operator Details

```http
GET /api/operators/{id}
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "id": "guid",
  "name": "Operator Name",
  "phone": "+48123456789",
  "vehicleType": "Tow truck",
  "currentLatitude": 52.2297,
  "currentLongitude": 21.0122,
  "isAvailable": true,
  "serviceRadiusKm": 20
}
```

### Update Location

```http
PUT /api/operators/{id}/location
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "latitude": 52.2297,
  "longitude": 21.0122
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated"
}
```

## Security

### Authorization
- Operators can only view/update their own location
- JWT token must contain `OperatorId` claim
- Backend validates: `tokenOperatorId === requestedOperatorId`

### Validation
- Latitude: -90 to 90
- Longitude: -180 to 180
- Both required (cannot be null after first set)

## Distance Calculation

System uses Haversine formula to calculate distance:

```csharp
public static double CalculateDistance(
    double lat1, double lon1,
    double lat2, double lon2)
{
    const double R = 6371; // Earth radius in km
    var dLat = ToRadians(lat2 - lat1);
    var dLon = ToRadians(lon2 - lon1);
    
    var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
    
    var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    return R * c;
}
```

## Request Filtering

When user creates help request:

1. **Find operators in range:**
```csharp
var operators = await db.Operators
    .Where(o => o.IsAvailable 
        && o.CurrentLatitude.HasValue 
        && o.CurrentLongitude.HasValue)
    .ToListAsync();
```

2. **Calculate distances:**
```csharp
var operatorsWithDistance = operators
    .Select(op => new {
        Operator = op,
        Distance = CalculateDistance(
            request.FromLatitude,
            request.FromLongitude,
            op.CurrentLatitude!.Value,
            op.CurrentLongitude!.Value
        )
    })
    .Where(op => op.Distance <= op.Operator.ServiceRadiusKm)
    .OrderBy(op => op.Distance)
    .ToList();
```

3. **Send notifications:**
- SignalR: Real-time to active connections
- Web Push: Background notifications
- Includes distance in notification payload

## User Experience

### For Operators

**First time:**
1. Login → Location modal appears
2. Choose GPS or manual selection
3. Confirm location
4. Start receiving requests

**Returning:**
1. Login → Location loaded from backend
2. Panel shows current location
3. Can update anytime via "Change" link

**Updating location:**
1. Click "Change" in header
2. Modal opens with current location
3. Use GPS or move map
4. Confirm new location

### For Users

When creating help request:
- System finds operators within radius
- Shows distance to each operator
- Operators sorted by distance (nearest first)
- Only available operators with location shown

## Error Handling

### GPS Errors

**Permission denied:**
```
"Unable to get your location. Please select manually on the map."
```

**Timeout:**
```
"GPS timeout. Please try again or select manually."
```

**Not supported:**
```
"Geolocation is not supported by your browser"
```

### API Errors

**Network failure:**
- Falls back to localStorage
- Shows warning banner
- Allows manual retry

**Invalid coordinates:**
- Validation on backend
- Error message to user
- Location not saved

## Testing

### Test Scenarios

1. **New operator - GPS:**
   - Register new operator
   - Login
   - Click "Use My GPS Location"
   - Accept browser permission
   - Verify location on map
   - Confirm and check panel header

2. **New operator - Manual:**
   - Register new operator
   - Login
   - Click "Select on Map"
   - Move map to different location
   - Verify coordinates update
   - Confirm and check saved

3. **Update location:**
   - Login as existing operator
   - Click "Change" in header
   - Select new location
   - Confirm
   - Verify updated in header

4. **Distance calculation:**
   - Set operator location (e.g., Warsaw center)
   - Create help request nearby (< 20km)
   - Verify operator receives notification
   - Check distance shown in request

5. **Out of range:**
   - Set operator location (e.g., Warsaw)
   - Create help request far away (> 20km)
   - Verify operator does NOT receive notification

## Configuration

### Service Radius

Default: 20 km (configurable per operator)

```csharp
public int? ServiceRadiusKm { get; set; } = 20;
```

To change for specific operator:
```sql
UPDATE Operators 
SET ServiceRadiusKm = 50 
WHERE Id = 'operator-guid';
```

### Map Settings

**Default center:** Warsaw (52.2297, 21.0122)
**Default zoom:** 13
**Tile provider:** OpenStreetMap
**Marker icon:** 🔧 (wrench emoji)

## Future Enhancements

### Short-term
- [ ] Show service radius circle on map
- [ ] Display nearby operators on location setup
- [ ] Auto-update location periodically (if GPS available)
- [ ] Location history tracking

### Medium-term
- [ ] Geofencing alerts (entering/leaving service area)
- [ ] Multiple service locations per operator
- [ ] Route-based distance (not straight line)
- [ ] Traffic-aware ETA calculation

### Long-term
- [ ] Mobile app with background location tracking
- [ ] Real-time location sharing during service
- [ ] Heatmap of service coverage
- [ ] Predictive positioning (ML-based)

## Troubleshooting

### Location not saving

**Check:**
1. JWT token valid and contains OperatorId
2. Network connection stable
3. Backend API accessible
4. Database connection working

**Solution:**
- Check browser console for errors
- Verify API endpoint returns 200 OK
- Check backend logs for exceptions

### GPS not working

**Check:**
1. Browser supports geolocation
2. HTTPS enabled (required for GPS)
3. Location permission granted
4. GPS/location services enabled on device

**Solution:**
- Use manual selection as fallback
- Check browser settings
- Try different browser

### Operators not receiving requests

**Check:**
1. Operator location is set (not null)
2. Operator is available (IsAvailable = true)
3. Request is within service radius
4. Operator has required equipment (if specified)

**Solution:**
- Verify location in operator panel header
- Check availability toggle
- Increase service radius if needed
- Review request filtering logic

## Related Documentation

- [OPERATOR_PANEL.md](OPERATOR_PANEL.md) - Operator panel overview
- [WEB_PUSH_SETUP.md](WEB_PUSH_SETUP.md) - Push notifications
- [TESTING_NOTIFICATIONS.md](TESTING_NOTIFICATIONS.md) - Testing guide

