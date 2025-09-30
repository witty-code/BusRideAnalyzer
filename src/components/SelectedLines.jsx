// === components/SelectedLines.jsx ===
import React from 'react';

export function SelectedLines({ selectedLines, onRemoveLine, onCalculate, loading, stopInfo }) {
  if (selectedLines.length === 0) return null;

  return (
    <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3">
      <h3 className="font-bold text-gray-800 mb-2">קווים נבחרים:</h3>
      <div className="space-y-2">
        {selectedLines.map(line => (
          <div 
            key={line.id} 
            className="flex items-center justify-between bg-white p-2 rounded border"
            style={{ borderRightWidth: '4px', borderRightColor: line.color }}
          >
            <div className="flex-1 text-sm">
              <span className="font-bold">{line.operatorName}</span>
              {' • '}
              <span>קו {line.routeShortName}</span>
              {' • '}
              <span className="text-gray-600">{line.directionLabel}</span>
            </div>
            <button
              onClick={() => onRemoveLine(line.id)}
              className="text-red-500 hover:text-red-700 font-bold px-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      
      <button
        onClick={onCalculate}
        disabled={loading || !stopInfo}
        className="w-full mt-3 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-bold"
      >
        חשב תדירות מצרפית
      </button>
    </div>
  );
}