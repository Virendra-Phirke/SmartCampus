import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildings, CAMPUS_CENTER, CAMPUS_ZOOM, categoryColors, type CampusBuilding } from '@/data/campusData';

interface CampusMapProps {
  selectedBuilding: CampusBuilding | null;
  onSelectBuilding: (building: CampusBuilding) => void;
  userLocation: [number, number] | null;
}

const createMarkerIcon = (category: CampusBuilding['category'], isSelected: boolean) => {
  const color = isSelected ? 'hsl(38, 92%, 55%)' : categoryColors[category];
  const size = isSelected ? 16 : 12;
  return L.divIcon({
    className: '',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 2px solid hsl(200, 25%, 6%);
      border-radius: 50%;
      box-shadow: 0 0 ${isSelected ? 16 : 10}px ${color}80;
      transition: all 0.2s ease;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const CampusMap = ({ selectedBuilding, onSelectBuilding, userLocation }: CampusMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: CAMPUS_CENTER,
      zoom: CAMPUS_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    buildings.forEach((b) => {
      const marker = L.marker([b.lat, b.lng], {
        icon: createMarkerIcon(b.category, false),
      }).addTo(map);

      marker.on('click', () => onSelectBuilding(b));
      
      marker.bindTooltip(b.shortName, {
        permanent: false,
        direction: 'top',
        className: 'campus-tooltip',
        offset: [0, -8],
      });

      markersRef.current.set(b.id, marker);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update marker icons when selection changes
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const building = buildings.find((b) => b.id === id);
      if (!building) return;
      const isSelected = selectedBuilding?.id === id;
      marker.setIcon(createMarkerIcon(building.category, isSelected));
    });

    if (selectedBuilding && mapRef.current) {
      mapRef.current.flyTo([selectedBuilding.lat, selectedBuilding.lng], 18, {
        duration: 0.6,
      });
    }
  }, [selectedBuilding]);

  // User location marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLocation);
      } else {
        userMarkerRef.current = L.marker(userLocation, {
          icon: L.divIcon({
            className: '',
            html: `<div style="
              width: 14px; height: 14px;
              background: hsl(210, 100%, 60%);
              border: 3px solid hsl(200, 25%, 6%);
              border-radius: 50%;
              box-shadow: 0 0 20px hsl(210, 100%, 60%, 0.5);
            "></div>
            <div style="
              position: absolute; top: -5px; left: -5px;
              width: 24px; height: 24px;
              border: 2px solid hsl(210, 100%, 60%, 0.4);
              border-radius: 50%;
              animation: pulse-glow 2s ease-in-out infinite;
            "></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        }).addTo(mapRef.current);
      }
    }
  }, [userLocation]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default CampusMap;
