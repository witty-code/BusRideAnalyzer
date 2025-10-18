import { API_BASE } from '../utils/constants';
import { parseRouteName, calculateDistance } from '../utils/helpers';

export async function fetchAgencies(dateFrom, dateTo) {
  const res = await fetch(`${API_BASE}/gtfs_agencies/list?limit=100&date_from=${dateFrom}&date_to=${dateTo}`);
  return await res.json();
}

export async function fetchRoutes(operator, routeShortName, dateFrom, dateTo) {
  const res = await fetch(
    `${API_BASE}/gtfs_routes/list?operator_refs=${operator}&route_short_name=${routeShortName}&date_from=${dateFrom}&date_to=${dateTo}`
  );
  const data = await res.json();
  
  const uniqueMkts = [...new Set(data.map(r => r.route_mkt))];
  return uniqueMkts.map(mkt => {
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
}

export async function fetchDirections(operator, routeMkt, dateFrom, dateTo) {
  const res = await fetch(
    `${API_BASE}/gtfs_routes/list?operator_refs=${operator}&route_mkt=${routeMkt}&date_from=${dateFrom}&date_to=${dateTo}`
  );
  return await res.json();
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
        allRides.push({
          ride,
          closestPoint,
          distance: minDistance,
          allLocations: locations,
          scheduledStart: new Date(ride.scheduled_start_time),
          actualArrival: new Date(closestPoint.recorded_at_time),
          lineInfo: line
        });
      }

      const lineStops = lineStopsData[line.id] || [];
      const targetStop = lineStops.find(s => s.code === stopInfo.code);

      let reachedStop = true;
      if (targetStop && closestPoint.distance_from_journey_start !== null) {
        const distanceToStop = targetStop.shape_dist_traveled;
        const closestDistance = closestPoint.distance_from_journey_start;
        
        const hasPointAfterStop = locations.some(
          loc => loc.distance_from_journey_start !== null && 
                loc.distance_from_journey_start > distanceToStop
        );
        
        if (closestDistance < (distanceToStop - 250) && !hasPointAfterStop) {
          reachedStop = false;
        }
      }

      allRides.push({
        ride,
        closestPoint,
        distance: minDistance,
        allLocations: locations,
        scheduledStart: new Date(ride.scheduled_start_time),
        actualArrival: new Date(closestPoint.recorded_at_time),
        lineInfo: line,
        reachedStop: reachedStop
      });
    }
  }

  allRides.sort((a, b) => a.actualArrival - b.actualArrival);
  return allRides;
}


export async function fetchStopsForLine(operator, routeMkt, direction, dateFrom, dateTo) {
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
  return stops.map(stop => ({
    code: stop.gtfs_stop__code,
    name: stop.gtfs_stop__name,
    city: stop.gtfs_stop__city,
    lat: stop.gtfs_stop__lat,
    lon: stop.gtfs_stop__lon,
    shape_dist_traveled: stop.shape_dist_traveled,
    stop_sequence: stop.stop_sequence
  }));
}