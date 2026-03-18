import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildings as staticBuildings, categoryColors, type CampusBuilding, type Campus } from '@/data/campusData';
import { useBuildings, toBuildingLegacy } from '@/hooks/useBuildings';

interface CampusMapProps {
  campus: Campus;
  selectedBuilding: CampusBuilding | null;
  onSelectBuilding: (building: CampusBuilding) => void;
  userLocation: [number, number] | null;
  navigatingTo?: CampusBuilding | null;
  isAddingLocation?: boolean;
  onCenterChange?: (center: [number, number]) => void;
}

const categoryIconEmojis: Record<string, string> = {
  academic: '🏫',
  admin: '🏛️',
  facility: '🏢',
  sports: '⚽',
  hostel: '🏠',
};

const createMarkerIcon = (category: CampusBuilding['category'], isSelected: boolean) => {
  const color = isSelected ? 'hsl(38, 92%, 55%)' : categoryColors[category];
  const size = isSelected ? 18 : 13;
  const emoji = categoryIconEmojis[category] || '📍';
  return L.divIcon({
    className: '',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 2px solid hsl(200, 25%, 6%);
      border-radius: 50%;
      box-shadow: 0 0 ${isSelected ? 18 : 10}px ${color}80;
      transition: all 0.3s ease;
      ${isSelected ? 'animation: pulse-glow 2s ease-in-out infinite;' : ''}
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const CampusMap = ({
  campus,
  selectedBuilding,
  onSelectBuilding,
  userLocation,
  navigatingTo,
  isAddingLocation = false,
  onCenterChange
}: CampusMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const { data: supabaseBuildings } = useBuildings();

  // Use Supabase buildings with fallback to static
  const buildingsList = useMemo<CampusBuilding[]>(() => {
    if (supabaseBuildings && supabaseBuildings.length > 0) {
      return supabaseBuildings.map(toBuildingLegacy);
    }
    return staticBuildings;
  }, [supabaseBuildings]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [campus.lat, campus.lng],
      zoom: campus.zoom,
      zoomControl: false,
      attributionControl: false,
    });

    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    darkLayer.addTo(map);

    const baseMaps = {
      "Dark Theme View": darkLayer,
      "Satellite View": satelliteLayer
    };

    L.control.layers(baseMaps, undefined, { position: 'bottomright' }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Track center for Add Location feature
    if (onCenterChange) {
      onCenterChange([map.getCenter().lat, map.getCenter().lng]);
      map.on('move', () => {
        onCenterChange([map.getCenter().lat, map.getCenter().lng]);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [campus.lat, campus.lng, campus.zoom]);

  // Add/update markers when buildings change
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    buildingsList.forEach((b) => {
      // Apply category filter
      if (activeFilter && b.category !== activeFilter) return;

      const marker = L.marker([b.lat, b.lng], {
        icon: createMarkerIcon(b.category, selectedBuilding?.id === b.id),
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
  }, [buildingsList, activeFilter, onSelectBuilding, selectedBuilding]);

  // Update marker icons when selection changes
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const building = buildingsList.find((b) => b.id === id);
      if (!building) return;
      const isSelected = selectedBuilding?.id === id;
      marker.setIcon(createMarkerIcon(building.category, isSelected));
    });

    if (selectedBuilding && mapRef.current) {
      mapRef.current.flyTo([selectedBuilding.lat, selectedBuilding.lng], 18, {
        duration: 0.6,
      });
    }
  }, [selectedBuilding, buildingsList]);

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
          zIndexOffset: 1000,
        }).addTo(mapRef.current);

        userMarkerRef.current.bindTooltip('You are here', {
          permanent: false,
          direction: 'top',
          className: 'campus-tooltip',
          offset: [0, -12],
        });
      }
    }
  }, [userLocation]);

  // Draw navigation route
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    if (navigatingTo && userLocation) {
      const start: [number, number] = userLocation;
      const end: [number, number] = [navigatingTo.lat, navigatingTo.lng];

      // Create waypoints for a more realistic path
      const midLat = (start[0] + end[0]) / 2;
      const midLng = (start[1] + end[1]) / 2;
      const offset = 0.0003;

      const waypoints: [number, number][] = [
        start,
        [start[0], midLng + offset],
        [midLat, midLng + offset],
        [midLat, end[1]],
        end,
      ];

      routeLayerRef.current = L.polyline(waypoints, {
        color: 'hsl(174, 62%, 47%)',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 10',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapRef.current);

      // Add animated dashed line
      const decoratedRoute = L.polyline(waypoints, {
        color: 'hsl(174, 62%, 70%)',
        weight: 2,
        opacity: 0.4,
        dashArray: '4, 8',
      }).addTo(mapRef.current);

      // Fit bounds to show the full route
      const bounds = L.latLngBounds(waypoints);
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 });

      // Cleanup the decorated route too
      const originalRemove = routeLayerRef.current.remove.bind(routeLayerRef.current);
      routeLayerRef.current.remove = () => {
        decoratedRoute.remove();
        return originalRemove();
      };
    }
  }, [navigatingTo, userLocation]);

  // Category filter buttons
  const categories = [
    { key: null, emoji: '🗺️', label: 'All' },
    { key: 'academic', emoji: '🏫', label: 'Academic' },
    { key: 'facility', emoji: '🏢', label: 'Facility' },
    { key: 'admin', emoji: '🏛️', label: 'Admin' },
    { key: 'sports', emoji: '⚽', label: 'Sports' },
    { key: 'hostel', emoji: '🏠', label: 'Hostel' },
  ];

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Category filter chips */}
      <div className="absolute bottom-20 left-0 right-0 z-[400] px-4">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat.key || 'all'}
              onClick={() => setActiveFilter(cat.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all backdrop-blur-xl border ${activeFilter === cat.key
                ? 'bg-primary/20 text-primary border-primary/40 shadow-lg shadow-primary/10'
                : 'bg-card/90 text-secondary-foreground border-border/50 hover:bg-card'
                }`}
            >
              <span className="text-xs">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation active indicator */}
      {navigatingTo && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[400]">
          <div className="bg-primary/90 backdrop-blur-xl text-primary-foreground px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 border border-primary/30">
            <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
            Navigating to {navigatingTo.shortName}
          </div>
        </div>
      )}

      {/* Target Crosshair for Add Location Mode */}
      {isAddingLocation && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] pointer-events-none drop-shadow-lg scale-110">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary animate-in zoom-in duration-300">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </div>
      )}
    </div>
  );
};

export default CampusMap;
