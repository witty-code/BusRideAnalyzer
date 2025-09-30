// === App.jsx (Main Component) ===
import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LINE_COLORS } from './utils/constants';
import { parseRouteName, calculateFrequency } from './utils/helpers';
import * as api from './services/api';
import { StopSearch } from './components/StopSearch';
import { DateTimeSelector } from './components/DateTimeSelector';
import { LineSelector } from './components/LineSelector';
import { SelectedLines } from './components/SelectedLines';
import { FrequencyStats } from './components/FrequencyStats';
import { RidesTable } from './components/RidesTable';
import { MapView } from './components/MapView';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function BusRideAnalyzer() {
  const [agencies, setAgencies] = useState([]);
  const [dateFrom, setDateFrom] = useState('2025-05-18');
  const [dateTo, setDateTo] = useState('2025-05-18');
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState('23:59');
  const [stopCode, setStopCode] = useState('');
  const [stopInfo, setStopInfo] = useState(null);
  const [selectedLines, setSelectedLines] = useState([]);
  const [currentLineSetup, setCurrentLineSetup] = useState({
    operator: '',
    routeShortName: '',
    availableRoutes: [],
    selectedRouteMkt: '',
    directionsData: [],
    selectedDirection: ''
  });
  const [allRidesWithStops, setAllRidesWithStops] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [vehicleLocations, setVehicleLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([32.0853, 34.7818]);
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    try {
      const data = await api.fetchAgencies(dateFrom, dateTo);
      setAgencies(data);
    } catch (err) {
      console.error('Failed to load agencies:', err);
    }
  };

  const handleSearchStop = async () => {
    if (!stopCode) return;
    setLoading(true);
    try {
      const stop = await api.fetchStop(stopCode);
      if (stop) {
        setStopInfo(stop);
        setMapCenter([stop.lat, stop.lon]);
        setMapZoom(15);
      }
    } catch (err) {
      console.error('Failed to load stop:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchRoutes = async () => {
    if (!currentLineSetup.operator || !currentLineSetup.routeShortName) return;
    setLoading(true);
    try {
      const routes = await api.fetchRoutes(
        currentLineSetup.operator,
        currentLineSetup.routeShortName,
        dateFrom,
        dateTo
      );
      setCurrentLineSetup(prev => ({
        ...prev,
        availableRoutes: routes,
        selectedRouteMkt: '',
        directionsData: [],
        selectedDirection: ''
      }));
    } catch (err) {
      console.error('Failed to load routes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDirections = async (routeMkt) => {
    if (!routeMkt) return;
    setLoading(true);
    try {
      const directions = await api.fetchDirections(
        currentLineSetup.operator,
        routeMkt,
        dateFrom,
        dateTo
      );
      setCurrentLineSetup(prev => ({
        ...prev,
        directionsData: directions,
        selectedDirection: ''
      }));
    } catch (err) {
      console.error('Failed to load directions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    if (!currentLineSetup.selectedRouteMkt || !currentLineSetup.selectedDirection) {
      alert('נא לבחור מסלול וכיוון');
      return;
    }
    
    if (selectedLines.length >= 5) {
      alert('ניתן לבחור עד 5 קווים');
      return;
    }

    const selectedRouteData = currentLineSetup.directionsData.find(
      r => r.route_direction === currentLineSetup.selectedDirection
    );
    
    console.log('Selected Route Data:', selectedRouteData, 'agencies:', agencies, currentLineSetup);
    // find agency name where agency.operator_ref === currentLineSetup.operator
    const agencyName = agencies.find(a => a.operator_ref === selectedRouteData.operator_ref)?.agency_name || selectedRouteData.operator;
    const routeInfo = currentLineSetup.availableRoutes.find(r => r.route_mkt === currentLineSetup.selectedRouteMkt);
    
    const parsed = parseRouteName(selectedRouteData.route_long_name);
    const directionLabel = parsed ? `${parsed.destinationStop}, ${parsed.destinationCity}` : `כיוון ${currentLineSetup.selectedDirection}`;
    
    const newLine = {
      id: `${agencyName}-${currentLineSetup.selectedRouteMkt}-${currentLineSetup.selectedDirection}`,
      operator: currentLineSetup.operator,
      operatorName: agencyName,
      routeShortName: routeInfo.route_short_name,
      routeMkt: currentLineSetup.selectedRouteMkt,
      direction: currentLineSetup.selectedDirection,
      directionLabel: directionLabel,
      directionsData: currentLineSetup.directionsData,
      color: LINE_COLORS[selectedLines.length]
    };
    
    setSelectedLines(prev => [...prev, newLine]);
    
    setCurrentLineSetup({
      operator: '',
      routeShortName: '',
      availableRoutes: [],
      selectedRouteMkt: '',
      directionsData: [],
      selectedDirection: ''
    });
  };

  const handleRemoveLine = (lineId) => {
    setSelectedLines(prev => prev.filter(line => line.id !== lineId));
  };

  const handleCalculateFrequency = async () => {
    if (selectedLines.length === 0) {
      alert('נא לבחור לפחות קו אחד');
      return;
    }
    
    if (!stopInfo) {
      alert('נא לחפש תחנה');
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(`${dateFrom}T${timeFrom}:00`).getTime();
      const endDateTime = new Date(`${dateTo}T${timeTo}:59`).getTime();
      
      const rides = await api.fetchRidesForLines(selectedLines, stopInfo, startDateTime, endDateTime);
      setAllRidesWithStops(rides);
    } catch (err) {
      console.error('Failed to load rides:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRideClick = (rideWithStop) => {
    setSelectedRide(rideWithStop.ride);
    setVehicleLocations(rideWithStop.allLocations);
    
    if (rideWithStop.closestPoint) {
      setMapCenter([rideWithStop.closestPoint.lat, rideWithStop.closestPoint.lon]);
      setMapZoom(14);
    }
  };

  const frequency = calculateFrequency(allRidesWithStops);

  return (
    <div className="h-screen flex flex-col bg-gray-50" dir="rtl">
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold">ניתוח תדירות מצרפית - רב קווי</h1>
      </div>

      <div className="bg-white p-4 shadow-md space-y-4 overflow-y-auto max-h-[45vh]">
        <StopSearch
          stopCode={stopCode}
          setStopCode={setStopCode}
          onSearch={handleSearchStop}
          loading={loading}
          stopInfo={stopInfo}
        />

        <DateTimeSelector
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
          timeFrom={timeFrom}
          setTimeFrom={setTimeFrom}
          timeTo={timeTo}
          setTimeTo={setTimeTo}
        />

        <LineSelector
          currentLineSetup={currentLineSetup}
          setCurrentLineSetup={setCurrentLineSetup}
          agencies={agencies}
          selectedLines={selectedLines}
          loading={loading}
          onSearchRoutes={handleSearchRoutes}
          onLoadDirections={handleLoadDirections}
          onAddLine={handleAddLine}
        />

        <SelectedLines
          selectedLines={selectedLines}
          onRemoveLine={handleRemoveLine}
          onCalculate={handleCalculateFrequency}
          loading={loading}
          stopInfo={stopInfo}
        />

        <FrequencyStats
          frequency={frequency}
          totalRides={allRidesWithStops.length}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 bg-white border-l overflow-y-auto">
          <div className="p-3 bg-gray-100 border-b font-semibold sticky top-0">
            הגעות לתחנה ({allRidesWithStops.length})
          </div>
          <RidesTable
            ridesWithStops={allRidesWithStops}
            selectedRide={selectedRide}
            onRideClick={handleRideClick}
            selectedLines={selectedLines}
            stopInfo={stopInfo}
            dateFrom={dateFrom}
            timeFrom={timeFrom}
            timeTo={timeTo}
          />
        </div>

        <MapView
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          stopInfo={stopInfo}
          vehicleLocations={vehicleLocations}
          loading={loading}
          selectedRide={selectedRide}
          selectedLines={selectedLines}
        />
      </div>
    </div>
  );
}