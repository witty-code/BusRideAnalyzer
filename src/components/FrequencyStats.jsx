// === components/FrequencyStats.jsx ===
import React from 'react';

export function FrequencyStats({ frequency, totalRides }) {
  if (!frequency) return null;

  const validRides = frequency.validRidesCount || 0;
  const cancelledRides = totalRides - validRides;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
      <div className="font-semibold text-blue-800 mb-1">
        תדירות מצרפית ({validRides} הגעות תקינות
        {cancelledRides > 0 && <span className="text-orange-600">, {cancelledRides} מבוטלות</span>}):
      </div>
      <div className="grid grid-cols-3 gap-4 text-blue-700">
        <div>
          ממוצע: <span className="font-bold">{frequency.avgInterval.toFixed(1)}</span> דקות
        </div>
        <div>
          מינימום: <span className="font-bold">{frequency.minInterval.toFixed(1)}</span> דקות
        </div>
        <div>
          מקסימום: <span className="font-bold">{frequency.maxInterval.toFixed(1)}</span> דקות
        </div>
      </div>
    </div>
  );
}