// === components/StopSearch.jsx ===
import React from 'react';

export function StopSearch({ stopCode, setStopCode, onSearch, loading, stopInfo }) {
  return (
    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
      <h3 className="font-bold text-green-800 mb-2">שלב 1: בחירת תחנה</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">מספר תחנה</label>
          <input
            type="text"
            value={stopCode}
            onChange={(e) => setStopCode(e.target.value)}
            placeholder="21371"
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={onSearch}
            disabled={loading || !stopCode}
            className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300 text-sm font-medium"
          >
            חפש תחנה
          </button>
        </div>
      </div>
      {stopInfo && (
        <div className="mt-2 text-sm font-semibold text-green-800">
          ✓ נבחרה: {stopInfo.name} | קוד: {stopInfo.code} | עיר: {stopInfo.city}
        </div>
      )}
    </div>
  );
}