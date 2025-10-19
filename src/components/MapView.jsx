// === components/MapView.jsx ===
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { MapUpdater } from './MapUpdater';
import { selectedStopIcon, gpsIcon, startIcon, endIcon, gpsPointIcon, stopIcon, selectedStopIconBlue } from '../utils/mapIcons';

export function MapView({ 
  mapCenter, 
  mapZoom, 
  stopInfo, 
  vehicleLocations, 
  loading, 
  selectedRide,
  selectedLines,
  lineStopsData
}) {
  return (
    <div className="flex-1 relative h-full">
      <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full" scrollWheelZoom={true}>
        <MapUpdater center={mapCenter} zoom={mapZoom} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
        
        {/* רכיב להצגת תחנות */}
        {selectedRide && lineStopsData[selectedRide.lineInfo?.id] && (
          <>
            {lineStopsData[selectedRide.lineInfo.id].map((stop) => {
              const isSelectedStop = stop.code === stopInfo?.code;
              const icon = isSelectedStop ? selectedStopIconBlue : stopIcon;
              const zIndex = isSelectedStop ? 500 : 100;
              
              return (
                <Marker 
                  key={`stop-${stop.code}`} 
                  position={[stop.lat, stop.lon]} 
                  icon={icon}
                  zIndexOffset={zIndex}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold">{stop.name}</div>
                      <div>קוד: {stop.code}</div>
                      <div>עיר: {stop.city}</div>
                      {stop.shape_dist_traveled !== null && (
                        <div className="text-blue-600 font-semibold">
                          מרחק: {Math.round(stop.shape_dist_traveled)}מ'
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </>
        )}

        {stopInfo && (
          <Marker position={[stopInfo.lat, stopInfo.lon]} icon={selectedStopIcon}>
            <Popup>
              <div className="text-sm">
                <div className="font-bold">{stopInfo.name}</div>
                <div>קוד: {stopInfo.code}</div>
                <div>עיר: {stopInfo.city}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {vehicleLocations.length > 0 && (
  <>
    <Polyline
      positions={vehicleLocations.map(loc => [loc.lat, loc.lon])}
      color="#ef4444"
      weight={3}
      opacity={0.7}
    />
    {vehicleLocations.map((loc, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === vehicleLocations.length - 1;
      
      let icon = gpsPointIcon;
      let label = '';
      
      if (isFirst) {
        icon = startIcon;
        label = 'התחלה';
      } else if (isLast) {
        icon = endIcon;
        label = 'סוף';
      }
      
      return (
        <Marker key={loc.id} position={[loc.lat, loc.lon]} icon={icon} zIndexOffset={isFirst || isLast ? 1000 : 0}>
          <Popup>
            <div className="text-xs">
              {label && <div className="font-bold">{label}</div>}
              <div>{new Date(loc.recorded_at_time).toLocaleTimeString('he-IL')}</div>
              <div>מהירות: {loc.velocity} קמ"ש</div>
            </div>
          </Popup>
        </Marker>
      );
    })}
  </>
)}
      </MapContainer>

      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <div className="mt-3 text-gray-700 font-medium">טוען נתונים...</div>
          </div>
        </div>
      )}

      {selectedRide && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs z-[1000] text-xs">
          <div className="space-y-1">
            <div className="font-bold text-blue-600">נסיעה נבחרת</div>
            <div>רכב: {selectedRide.vehicle_ref}</div>
            <div>נקודות GPS: {vehicleLocations.length}</div>
            <div className="pt-2 border-t mt-2">
              <div className="font-semibold mb-1">מקרא:</div>
              {selectedLines.map(line => (
                <div key={line.id} className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: line.color }}></div>
                  <span>קו {line.routeShortName}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 mb-1 mt-2 pt-2 border-t">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>תחנה נבחרת</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>מסלול רכב</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}