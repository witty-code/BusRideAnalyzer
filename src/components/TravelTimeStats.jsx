// === components/TravelTimeStats.jsx ===
import React from 'react';

export function TravelTimeStats({ ridesWithStops, selectedLines }) {
  if (ridesWithStops.length === 0) return null;

  // חישוב ממוצע זמן נסיעה לכל קו
  const statsByLine = selectedLines.map(line => {
    const ridesForLine = ridesWithStops.filter(
      r => r.lineInfo.id === line.id && r.reachedStop && r.travelTimeMinutes !== null
    );
    
    if (ridesForLine.length === 0) {
      return {
        line,
        avgTime: null,
        minTime: null,
        maxTime: null,
        count: 0
      };
    }
    
    const times = ridesForLine.map(r => r.travelTimeMinutes);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return {
      line,
      avgTime,
      minTime,
      maxTime,
      count: ridesForLine.length
    };
  });

  return (
    <div className="bg-purple-50 border border-purple-200 rounded p-3 mt-3">
      <h3 className="font-semibold text-purple-800 mb-2 text-sm">זמני נסיעה ממוצעים לתחנה (בדקות):</h3>
      <table className="w-full text-xs">
        <thead className="bg-purple-100">
          <tr>
            <th className="p-2 text-right">קו</th>
            <th className="p-2 text-right">מפעיל</th>
            <th className="p-2 text-right">ממוצע</th>
            <th className="p-2 text-right">מינימום</th>
            <th className="p-2 text-right">מקסימום</th>
            <th className="p-2 text-right">נסיעות</th>
          </tr>
        </thead>
        <tbody>
          {statsByLine.map(stat => (
            <tr key={stat.line.id} className="border-t">
              <td className="p-2 font-bold" style={{ color: stat.line.color }}>
                {stat.line.routeShortName}
              </td>
              <td className="p-2">{stat.line.operatorName}</td>
              <td className="p-2 font-semibold">
                {stat.avgTime !== null ? Math.round(stat.avgTime) : '-'}
              </td>
              <td className="p-2">
                {stat.minTime !== null ? Math.round(stat.minTime) : '-'}
              </td>
              <td className="p-2">
                {stat.maxTime !== null ? Math.round(stat.maxTime) : '-'}
              </td>
              <td className="p-2 text-gray-600">{stat.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}