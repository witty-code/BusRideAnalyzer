// === utils/csvExport.js ===

function formatTimeDiff(minutes) {
  if (!minutes) return '';
  
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

function formatTimeDiffSeconds(totalSeconds) {
  if (!totalSeconds) return '';
  
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  // תמיד להחזיר בפורמט hh:mm:ss - בגלל באג של excel...
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}


export function exportToCSV(allRidesWithStops, selectedLines, stopInfo, dateFrom, timeFrom, timeTo) {
  // סנן רק נסיעות תקינות
  const validRides = allRidesWithStops.filter(ride => ride.reachedStop && !ride.wasCancelled);
  
  if (validRides.length === 0) {
    alert('אין נסיעות תקינות לייצוא');
    return;
  }
  
  // Create CSV header with BOM for UTF-8
  const BOM = '\uFEFF';
  
  // Query parameters section
  let csv = BOM;
  csv += 'פרטי השאילתה\n';
  csv += `תחנה,${stopInfo.name}\n`;
  csv += `קוד תחנה,${stopInfo.code}\n`;
  csv += `עיר,${stopInfo.city}\n`;
  csv += `תאריך,${dateFrom}\n`;
  csv += `טווח שעות,${timeFrom} - ${timeTo}\n`;
  csv += '\n';
  
  // Selected lines section
  csv += 'קווים נבחרים\n';
  csv += 'מפעיל,מספר קו,כיוון נסיעה\n';
  selectedLines.forEach(line => {
    csv += `${line.operatorName},${line.routeShortName},${line.directionLabel}\n`;
  });
  csv += '\n';
  
  // Rides data section
  csv += 'נתוני הגעות\n';
  csv += 'מספר קו,מפעיל,זמן יציאה מתחנת מוצא,זמן הגעה לתחנה,מספר רכב,מרחק מהתחנה (מטרים),הפרש זמן מהגעה קודמת\n';
  
  // sort rides by actual arrival time
  validRides.sort((a, b) => a.actualArrival - b.actualArrival);

  validRides.forEach((rideStop, idx) => {
    let timeDiff = '';
    if (idx > 0) {
      const diffSeconds = (rideStop.actualArrival - validRides[idx-1].actualArrival) / 1000;
      timeDiff = formatTimeDiffSeconds(diffSeconds);
    }
    
    const scheduledTime = rideStop.scheduledStart.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const arrivalTime = rideStop.actualArrival.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    csv += `${rideStop.lineInfo.routeShortName},${rideStop.lineInfo.operatorName},${scheduledTime},${arrivalTime},${rideStop.ride.vehicle_ref},${Math.round(rideStop.distance)},${timeDiff}\n`;
  });
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const fileName = `תדירות_תחנה_${stopInfo.code}_${dateFrom.replace(/-/g, '')}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}