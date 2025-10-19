// === components/LineSelector.jsx ===
import React from 'react';
import { parseRouteName } from '../utils/helpers';

export function LineSelector({ 
  currentLineSetup, 
  setCurrentLineSetup,
  agencies,
  selectedLines,
  loading,
  onSearchRoutes,
  onLoadDirections,
  onAddLine
}) {
  const availableDirections = currentLineSetup.directionsData.map(route => {
  const parsed = parseRouteName(route.route_long_name);
  const baseLabel = parsed ? `${parsed.destinationStop}, ${parsed.destinationCity}` : `כיוון ${route.route_direction}`;
  const alternativeLabel = route.route_alternative !== '0' && route.route_alternative !== 0 
    ? ` (חלופה ${route.route_alternative})` 
    : '';
  return {
    line_ref: route.line_ref,
    direction: route.route_direction,
    label: baseLabel + alternativeLabel,
    fullData: route
  };
});

  return (
    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
      <h3 className="font-bold text-purple-800 mb-2">שלב 3: הוספת קווים ({selectedLines.length}/7)</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-sm font-medium mb-1">מפעיל</label>
          <select
            value={currentLineSetup.operator}
            onChange={(e) => setCurrentLineSetup(prev => ({
              ...prev,
              operator: e.target.value,
              routeShortName: '',
              availableRoutes: [],
              selectedRouteMkt: '',
              directionsData: [],
              selectedDirection: ''
            }))}
            className="w-full border rounded px-2 py-1 text-sm"
          >
            <option value="">בחר מפעיל</option>
            {agencies.map(a => (
              <option key={a.operator_ref} value={a.operator_ref}>
                {a.agency_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">מספר קו</label>
          <input
            type="text"
            value={currentLineSetup.routeShortName}
            onChange={(e) => setCurrentLineSetup(prev => ({
              ...prev,
              routeShortName: e.target.value
            }))}
            placeholder="146"
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={onSearchRoutes}
            disabled={loading || !currentLineSetup.operator || !currentLineSetup.routeShortName}
            className="w-full bg-purple-500 text-white px-4 py-1 rounded hover:bg-purple-600 disabled:bg-gray-300 text-sm"
          >
            חפש
          </button>
        </div>
      </div>

      {currentLineSetup.availableRoutes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">מסלול</label>
            {/* אם יש רק קו אחד - נסתיר את שדה הבחירה */}
            {currentLineSetup.availableRoutes.length === 1 ? (
              <div className="w-full border rounded px-2 py-1 text-sm bg-gray-50">
                קו {currentLineSetup.availableRoutes[0].route_short_name} - {currentLineSetup.availableRoutes[0].destination}
              </div>
            ) : (
              <select
                value={currentLineSetup.selectedRouteMkt}
                onChange={(e) => {
                  setCurrentLineSetup(prev => ({
                    ...prev,
                    selectedRouteMkt: e.target.value,
                    selectedDirection: ''
                  }));
                  onLoadDirections(e.target.value);
                }}
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="">בחר מסלול</option>
                {currentLineSetup.availableRoutes.map(r => (
                  <option key={r.route_mkt} value={r.route_mkt}>
                    קו {r.route_short_name} - {r.destination}
                  </option>
                ))}
              </select>
            )}
          </div>

          {availableDirections.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">כיוון</label>
              <select
                value={currentLineSetup.selectedDirection}
                onChange={(e) => setCurrentLineSetup(prev => ({
                  ...prev,
                  selectedDirection: e.target.value
                }))}
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="">בחר כיוון</option>
                {availableDirections.map(d => (
                  <option key={d.direction} value={d.direction}>
                    לכיוון {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentLineSetup.selectedDirection && (
            <div className="flex items-end">
              <button
                onClick={onAddLine}
                disabled={selectedLines.length >= 7}
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300 text-sm font-medium"
              >
                + הוסף קו
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}