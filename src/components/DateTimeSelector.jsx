// === components/DateTimeSelector.jsx ===
import React from 'react';

export function DateTimeSelector({ dateFrom, setDateFrom, setDateTo, timeFrom, setTimeFrom, timeTo, setTimeTo }) {
  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
      <h3 className="font-bold text-blue-800 mb-2">שלב 2: בחירת תאריך וטווח שעות</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">תאריך</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setDateTo(e.target.value);
            }}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">שעה מ-</label>
          <input
            type="time"
            value={timeFrom}
            onChange={(e) => setTimeFrom(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">שעה עד</label>
          <input
            type="time"
            value={timeTo}
            onChange={(e) => setTimeTo(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>
      </div>
    </div>
  );
}