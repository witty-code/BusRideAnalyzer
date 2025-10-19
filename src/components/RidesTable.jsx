// === components/RidesTable.jsx ===
import React from 'react';
import { exportToCSV } from '../utils/csvExport';

function formatTimeDiff(minutes) {
  if (!minutes) return '-';
  
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}


export function RidesTable({ 
  ridesWithStops, 
  selectedRide, 
  onRideClick,
  selectedLines,
  stopInfo,
  dateFrom,
  timeFrom,
  timeTo
}) {
  const handleExport = () => {
    if (ridesWithStops.length === 0) {
      alert('אין נתונים לייצוא');
      return;
    }
    exportToCSV(ridesWithStops, selectedLines, stopInfo, dateFrom, timeFrom, timeTo);
  };

  if (ridesWithStops.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-center text-sm">
        לא נמצאו נסיעות. אנא בחר תחנה, קווים וטווח זמן.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0 border-b">
            <tr>
              <th className="p-2 text-right">קו</th>
              <th className="p-2 text-right">יציאה</th>
              <th className="p-2 text-right">הגעה</th>
              <th className="p-2 text-right">זמן נסיעה</th>
              <th className="p-2 text-right">רכב</th>
              <th className="p-2 text-right">מרחק (מ')</th>
              <th className="p-2 text-right">הפרש</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ridesWithStops.map((rideStop, idx) => {
              // מצא את הנסיעה התקינה האחרונה לפני השורה הזו
              let lastValidRideIndex = -1;
              for (let i = idx - 1; i >= 0; i--) {
                if (ridesWithStops[i].reachedStop) {
                  lastValidRideIndex = i;
                  break;
                }
              }
              
              // חישוב הפרש זמן
              let timeDiff = null;
              if (rideStop.reachedStop && lastValidRideIndex >= 0) {
                timeDiff = (rideStop.actualArrival - ridesWithStops[lastValidRideIndex].actualArrival) / 1000 / 60;
              }

              // קביעת צבע רקע
              let bgClass = '';
              if (selectedRide?.ride?.id === rideStop.ride.id) {
                bgClass = 'bg-blue-100';
              } else if (rideStop.wasCancelled) {
                bgClass = 'bg-orange-100'; // צבע שונה לנסיעות מבוטלות
              } else if (rideStop.didNotLeaveTerminal) {
                bgClass = 'bg-red-100';
              } else if (!rideStop.reachedStop) {
                bgClass = 'bg-gray-200';
              }

              return (
                <tr
                  key={`${rideStop.ride.id}-${idx}`}
                  onClick={() => !rideStop.wasCancelled && onRideClick(rideStop)} // לא ניתן ללחוץ על נסיעות מבוטלות
                  className={`${rideStop.wasCancelled ? '' : 'cursor-pointer hover:bg-blue-50'} transition ${bgClass}`}
                  style={{ 
                    borderRightWidth: '3px',
                    borderRightColor: rideStop.lineInfo.color,
                    borderRightStyle: 'solid'
                  }}
                >
                  <td className="p-2 font-bold" style={{ color: rideStop.lineInfo.color }}>
                    {rideStop.lineInfo.routeShortName}
                  </td>
                  <td className="p-2 text-gray-700">
                    {rideStop.scheduledStart.toLocaleTimeString('he-IL', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="p-2 font-semibold">
                    {rideStop.wasCancelled ? (
                      <span className="text-orange-600 font-bold text-xs">לא בוצע</span>
                    ) : rideStop.reachedStop ? (
                      rideStop.actualArrival.toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-2 text-gray-700">
                    {rideStop.travelTimeMinutes !== null && 
                     rideStop.travelTimeMinutes !== false && 
                     !isNaN(rideStop.travelTimeMinutes) ? (
                      <span className={rideStop.wasCancelled ? 'text-orange-500 italic' : ''}>                    
                        {Math.round(rideStop.travelTimeMinutes).toString()}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-2 text-gray-600">
                    {rideStop.wasCancelled ? '-' : rideStop.ride.vehicle_ref}
                  </td>
                  <td className="p-2 text-gray-600 flex items-center gap-1">
                    {rideStop.wasCancelled ? (
                      <span className="text-orange-600 font-bold text-xs">🚫 מבוטל</span>
                    ) : rideStop.didNotLeaveTerminal ? (
                      <span className="text-red-600 font-bold text-xs">🚫 לא יצא</span>
                    ) : !rideStop.reachedStop ? (
                      <>
                        <span className="text-red-500 font-bold">⚠</span>
                        {Math.round(rideStop.distance).toString()}
                      </>
                    ) : (
                      Math.round(rideStop.distance).toString()
                    )}
                  </td>
                  <td className="p-2 text-gray-500">
                    {rideStop.reachedStop ? formatTimeDiff(timeDiff) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="p-3 bg-gray-50 border-t">
        <button
          onClick={handleExport}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          ייצא ל-CSV
        </button>
      </div>
    </div>
  );
}