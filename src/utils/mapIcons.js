import L from 'leaflet';

const createIcon = (color) => new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36">
      <path fill="${color}" d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 18 9 18s9-11.25 9-18c0-4.97-4.03-9-9-9z"/>
      <circle fill="white" cx="12" cy="9" r="4"/>
    </svg>
  `)}`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -42]
});

export const selectedStopIcon = createIcon('#22c55e');
export const gpsIcon = createIcon('#ef4444');