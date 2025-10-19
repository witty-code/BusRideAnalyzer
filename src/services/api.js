import { API_BASE } from '../utils/constants';
import { parseRouteName, calculateDistance } from '../utils/helpers';
import { getFromCache, saveToCache } from './apiCache';


export async function fetchAgencies(dateFrom, dateTo) {
  const cached = getFromCache('agencies', { dateFrom, dateTo });
  if (cached) return cached;
  
  const res = await fetch(`${API_BASE}/gtfs_agencies/list?limit=100&date_from=${dateFrom}&date_to=${dateTo}`);
  const data = await res.json();
  
  saveToCache('agencies', { dateFrom, dateTo }, data, dateTo);
  return data;
}

export async function fetchRoutes(operator, routeShortName, dateFrom, dateTo) {
  const cached = getFromCache('routes', { operator, routeShortName, dateFrom, dateTo });
  if (cached) return cached;
  
  const res = await fetch(
    `${API_BASE}/gtfs_routes/list?operator_refs=${operator}&route_short_name=${routeShortName}&date_from=${dateFrom}&date_to=${dateTo}`
  );
  const data = await res.json();
  
  const uniqueMkts = [...new Set(data.map(r => r.route_mkt))];
  const routes = uniqueMkts.map(mkt => {
    const route = data.find(r => r.route_mkt === mkt);
    const parsed = parseRouteName(route.route_long_name);
    const destination = parsed ? `${parsed.originCity} - ${parsed.destinationCity}` : route.route_long_name;
    return { 
      route_mkt: mkt, 
      route_short_name: route.route_short_name, 
      destination: destination,
      operator_ref: operator
    };
  });
  
  saveToCache('routes', { operator, routeShortName, dateFrom, dateTo }, routes, dateTo);
  return routes;
}

export async function fetchDirections(operator, routeMkt, dateFrom, dateTo) {
  const cached = getFromCache('directions', { operator, routeMkt, dateFrom, dateTo });
  if (cached) return cached;
  
  const res = await fetch(
    `${API_BASE}/gtfs_routes/list?operator_refs=${operator}&route_mkt=${routeMkt}&date_from=${dateFrom}&date_to=${dateTo}`
  );
  const data = await res.json();
  
  saveToCache('directions', { operator, routeMkt, dateFrom, dateTo }, data, dateTo);
  return data;
}

export async function fetchStop(stopCode) {
  const res = await fetch(`${API_BASE}/gtfs_stops/list?code=${stopCode}&limit=1`);
  const data = await res.json();
  return data.length > 0 ? data[0] : null;
}

export async function fetchRidesForLines(selectedLines, stopInfo, startDateTime, endDateTime, lineStopsData) {
  const allRides = [];
  
  for (const line of selectedLines) {
    const filteredRoutes = line.directionsData.filter(r => r.route_direction === line.direction);
    const lineRefs = filteredRoutes.map(r => r.line_ref).join(',');

    if (!lineRefs) continue;

    const ridesRes = await fetch(
      `${API_BASE}/siri_rides/list?scheduled_start_time_from=${startDateTime}&scheduled_start_time_to=${endDateTime}&siri_route__line_refs=${lineRefs}&limit=200&offset=0`
    );
    const ridesData = await ridesRes.json();

    for (const ride of ridesData) {
      const locRes = await fetch(`${API_BASE}/siri_vehicle_locations/list?limit=500&siri_rides__ids=${ride.id}`);
      const locations = await locRes.json();

      if (locations.length === 0) continue;

      locations.sort((a, b) => new Date(a.recorded_at_time) - new Date(b.recorded_at_time));

      let minDistance = Infinity;
      let closestPoint = null;

      for (const loc of locations) {
        const distance = calculateDistance(stopInfo.lat, stopInfo.lon, loc.lat, loc.lon);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = loc;
        }
      }

      if (closestPoint) {
        // חישוב המרחק המקסימלי שהאוטובוס עבר
        const maxDistanceFromStart = Math.max(...locations.map(loc => loc.distance_from_journey_start || 0));
        
        // מצא את התחנה ברשימת התחנות של הקו
        const lineStops = lineStopsData[line.id] || [];
        const targetStop = lineStops.find(s => s.code === stopInfo.code);

        let reachedStop = true;
        let didNotLeaveTerminal = false;
        
        // בדיקה 1: האם בכלל יצא מהטרמינל?
        if (maxDistanceFromStart <= 500) {
          didNotLeaveTerminal = true;
          reachedStop = false;
        }
        // בדיקה 2: האם הגיע לתחנה? (רק אם יצא מהטרמינל)
        else if (targetStop && closestPoint.distance_from_journey_start !== null) {
          const distanceToStop = targetStop.shape_dist_traveled;
          const closestDistance = closestPoint.distance_from_journey_start;
          
          // בדוק אם המרחק מהתחנה גדול מ-1000 מטר
          if (minDistance > 1000) {
            reachedStop = false;
          }
          // או בדוק אם נעצר 250+ מטר לפני התחנה ללא נקודה אחריה
          else {
            const hasPointAfterStop = locations.some(
              loc => loc.distance_from_journey_start !== null && 
                    loc.distance_from_journey_start > distanceToStop
            );
            
            if (closestDistance < (distanceToStop - 250) && !hasPointAfterStop) {
              reachedStop = false;
            }
          }
        }

        // חישוב זמן נסיעה בדקות
        const travelTimeMinutes = closestPoint.distance_from_journey_start !== null && closestPoint.distance_from_journey_start > 0
          ? (new Date(closestPoint.recorded_at_time) - new Date(ride.scheduled_start_time)) / 1000 / 60
          : null;

        // רק קריאה אחת ל-push עם כל המידע
        allRides.push({
          ride,
          closestPoint,
          distance: minDistance,
          allLocations: locations,
          scheduledStart: new Date(ride.scheduled_start_time),
          actualArrival: new Date(closestPoint.recorded_at_time),
          lineInfo: line,
          reachedStop: reachedStop,
          didNotLeaveTerminal: didNotLeaveTerminal,
          maxDistanceFromStart: maxDistanceFromStart,
          travelTimeMinutes: travelTimeMinutes
        });
      }
    }
  }


  // שלב נוסף: שליפת נסיעות מתוכננות שלא בוצעו
  for (const line of selectedLines) {
    try {
      const cancelledRides = await fetchPlannedRides(
        line, 
        new Date(startDateTime).toISOString().split('T')[0],
        new Date(endDateTime).toISOString().split('T')[0],
        startDateTime, 
        endDateTime
      );

      const existingRidesForLine = allRides.filter(r => r.lineInfo.id === line.id && r.travelTimeMinutes !== null);
      const avgTravelTime = existingRidesForLine.length > 0
        ? existingRidesForLine.reduce((sum, r) => sum + r.travelTimeMinutes, 0) / existingRidesForLine.length
        : 30; // ברירת מחדל 30 דקות
      
      // הוסף נסיעות מבוטלות לרשימה
      cancelledRides.forEach(cancelled => {
        // המר לזמן מקומי
        const plannedTimeUTC = cancelled.planned_start_time.endsWith('Z') 
          ? cancelled.planned_start_time 
          : cancelled.planned_start_time + 'Z';

        const scheduledStart = new Date(plannedTimeUTC);
        const estimatedArrival = new Date(scheduledStart.getTime() + avgTravelTime * 60 * 1000);

        allRides.push({
          ride: {
            id: `cancelled-${cancelled.gtfs_ride_id}`,
            scheduled_start_time: plannedTimeUTC, // עם Z
            vehicle_ref: null
          },
          closestPoint: null,
          distance: null,
          allLocations: [],
          scheduledStart: scheduledStart,
          actualArrival: null,
          estimatedArrival: estimatedArrival, // זמן הגעה משוער
          lineInfo: line,
          reachedStop: false,
          didNotLeaveTerminal: false,
          wasCancelled: true
        });
      });
    } catch (err) {
      console.error('Failed to fetch cancelled rides:', err);
    }
  }

  // allRides.sort((a, b) => a.actualArrival - b.actualArrival);
  // מיין לפי זמן הגעה בפועל או משוער
  allRides.sort((a, b) => {
    const timeA = a.actualArrival || a.estimatedArrival || a.scheduledStart;
    const timeB = b.actualArrival || b.estimatedArrival || b.scheduledStart;
    return timeA - timeB;
  });
  return allRides;
}

export async function fetchStopsForLine(operator, routeMkt, direction, dateFrom, dateTo) {
  const cached = getFromCache('stops', { operator, routeMkt, direction, dateFrom, dateTo });
  if (cached) return cached;
  
  // שלב 1: מצא gtfs_route_id
  const routesRes = await fetch(
    `${API_BASE}/gtfs_routes/list?operator_refs=${operator}&route_mkt=${routeMkt}&route_direction=${direction}&date_from=${dateFrom}&date_to=${dateTo}&limit=1`
  );
  const routes = await routesRes.json();
  
  if (routes.length === 0) return [];
  
  const gtfsRouteId = routes[0].id;
  
  // שלב 2: מצא gtfs_ride_id לדוגמה
  const ridesRes = await fetch(
    `${API_BASE}/gtfs_rides/list?gtfs_route_id=${gtfsRouteId}&limit=1`
  );
  const rides = await ridesRes.json();
  
  if (rides.length === 0) return [];
  
  const gtfsRideId = rides[0].id;
  
  // שלב 3: שלוף את כל התחנות
  const stopsRes = await fetch(
    `${API_BASE}/gtfs_ride_stops/list?gtfs_ride_ids=${gtfsRideId}`
  );
  const stops = await stopsRes.json();
  
  // החזר רק את המידע הרלוונטי
  const result = stops.map(stop => ({
    code: stop.gtfs_stop__code,
    name: stop.gtfs_stop__name,
    city: stop.gtfs_stop__city,
    lat: stop.gtfs_stop__lat,
    lon: stop.gtfs_stop__lon,
    shape_dist_traveled: stop.shape_dist_traveled,
    stop_sequence: stop.stop_sequence
  }));
  
  saveToCache('stops', { operator, routeMkt, direction, dateFrom, dateTo }, result, dateTo);
  return result;
}

export async function fetchPlannedRides(line, dateFrom, dateTo, startDateTime, endDateTime) {
  const allPlannedRides = [];
  
  const filteredRoutes = line.directionsData.filter(r => r.route_direction === line.direction);
  
  for (const route of filteredRoutes) {
    const cached = getFromCache('rides_execution', { 
      operator: line.operator, 
      lineRef: route.line_ref, 
      dateFrom, 
      dateTo 
    });
    
    let executionData;
    if (cached) {
      executionData = cached;
    } else {
      const res = await fetch(
        `${API_BASE}/rides_execution/list?limit=10000&date_from=${dateFrom}&date_to=${dateTo}&operator_ref=${line.operator}&line_ref=${route.line_ref}`
      );
      executionData = await res.json();
      saveToCache('rides_execution', { 
        operator: line.operator, 
        lineRef: route.line_ref, 
        dateFrom, 
        dateTo 
      }, executionData, dateTo);
    }
    
    // סנן רק נסיעות שלא בוצעו ובטווח הזמן המבוקש
    const cancelledRides = executionData.filter(ride => {
      if (ride.actual_start_time !== null) return false;
      
      // המרה לזמן מקומי - הוסף Z כדי לציין UTC
      const plannedTimeUTC = ride.planned_start_time.endsWith('Z') 
        ? ride.planned_start_time 
        : ride.planned_start_time + 'Z';
      const plannedTime = new Date(plannedTimeUTC).getTime();
      
      return plannedTime >= startDateTime && plannedTime <= endDateTime;
    });
    
    allPlannedRides.push(...cancelledRides.map(ride => ({
      ...ride,
      lineInfo: line
    })));
  }
  
  return allPlannedRides;
}