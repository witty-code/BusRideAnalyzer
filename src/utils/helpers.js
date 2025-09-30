export function parseRouteName(routeLongName) {
  const pattern = /^(.+?)-(.+?)<->(.+?)-(.+?)-(\d+[א-ת#]?)$/;
  const match = routeLongName.match(pattern);
  
  if (match) {
    return {
      originStop: match[1].trim(),
      originCity: match[2].trim(),
      destinationStop: match[3].trim(),
      destinationCity: match[4].trim(),
      directionCode: match[5].trim()
    };
  }
  return null;
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export function calculateFrequency(ridesWithStops) {
  if (ridesWithStops.length < 2) return null;

  const intervals = [];
  for (let i = 1; i < ridesWithStops.length; i++) {
    const diffMinutes = (ridesWithStops[i].actualArrival - ridesWithStops[i-1].actualArrival) / 1000 / 60;
    intervals.push(diffMinutes);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const minInterval = Math.min(...intervals);
  const maxInterval = Math.max(...intervals);

  return { avgInterval, minInterval, maxInterval };
}