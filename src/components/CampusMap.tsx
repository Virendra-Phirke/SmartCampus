import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import maplibregl from '@/lib/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import { buildings as staticBuildings, categoryColors, type CampusBuilding } from '@/data/campusData';
import type { College } from '@/lib/types';
import { useBuildings, toBuildingLegacy } from '@/hooks/useBuildings';
import { toast } from 'sonner';

interface CampusMapProps {
  campus: College;
  selectedBuilding: CampusBuilding | null;
  onSelectBuilding: (building: CampusBuilding) => void;
  userLocation: [number, number] | null;
  userAccuracy?: number | null;
  userHeading?: number | null;
  navigatingTo?: CampusBuilding | null;
  isAddingLocation?: boolean;
  onCenterChange?: (center: [number, number]) => void;
  activeFilter?: string | null;
  isFollowing?: boolean;
  activeLayer?: string;
  showHeatMap?: boolean;
  measureMode?: boolean;
  onMeasureDistance?: (d: number) => void;
  recenterTrigger?: number;
}

const categoryIconEmojis: Record<string, string> = {
  academic: '🏫', admin: '🏛️', facility: '🏢', sports: '⚽', hostel: '🏠',
};

// ── MapLibre Style URLs (unified naming) ──
const STYLE_URLS: Record<string, string | maplibregl.StyleSpecification> = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  street: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  satellite: {
    version: 8 as const,
    sources: {
      satellite: {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
      },
      labels: {
        type: 'raster' as const,
        tiles: [
          'https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
          'https://d.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
      },
    },
    layers: [
      { id: 'satellite-layer', type: 'raster' as const, source: 'satellite' },
      { id: 'satellite-labels-layer', type: 'raster' as const, source: 'labels' },
    ],
  },
  outdoor: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`);
const estimateSteps = (m: number) => Math.round(m / 0.7);
const walkingETA = (m: number) => { const min = Math.ceil(m / 80); return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`; };

const CampusMap = ({
  campus, selectedBuilding, onSelectBuilding, userLocation, userAccuracy,
  userHeading, navigatingTo, isAddingLocation = false, onCenterChange,
  activeFilter, isFollowing, activeLayer = 'dark',
  showHeatMap = false, measureMode = false, onMeasureDistance, recenterTrigger = 0,
}: CampusMapProps) => {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const prevLayerRef = useRef(activeLayer);
  const gpsTrailRef = useRef<[number, number][]>([]);
  const measurePointsRef = useRef<maplibregl.LngLat[]>([]);
  const measureMarkersRef = useRef<maplibregl.Marker[]>([]);
  const arrivedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const { data: supabaseBuildings } = useBuildings();

  const buildingsList = useMemo<CampusBuilding[]>(() => {
    if (supabaseBuildings && supabaseBuildings.length > 0) return supabaseBuildings.map(toBuildingLegacy);
    return staticBuildings;
  }, [supabaseBuildings]);

  // ── Helper: add custom layers after style loads ──
  const addCustomLayers = useCallback((map: maplibregl.Map) => {
    // GPS accuracy circle
    if (!map.getSource('gps-accuracy')) {
      map.addSource('gps-accuracy', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'gps-accuracy-fill', type: 'fill', source: 'gps-accuracy', paint: { 'fill-color': '#4285f4', 'fill-opacity': 0.1 } });
      map.addLayer({ id: 'gps-accuracy-line', type: 'line', source: 'gps-accuracy', paint: { 'line-color': '#4285f4', 'line-opacity': 0.3, 'line-width': 1.5 } });
    }
    // GPS trail
    if (!map.getSource('gps-trail')) {
      map.addSource('gps-trail', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} } });
      map.addLayer({ id: 'gps-trail-line', type: 'line', source: 'gps-trail', paint: { 'line-color': '#4285f4', 'line-opacity': 0.5, 'line-width': 3 } });
    }
    // Navigation route
    if (!map.getSource('nav-route')) {
      map.addSource('nav-route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} } });
      map.addLayer({ id: 'nav-route-glow', type: 'line', source: 'nav-route', paint: { 'line-color': 'hsl(174, 62%, 47%)', 'line-opacity': 0.3, 'line-width': 10, 'line-blur': 8 } });
      map.addLayer({ id: 'nav-route-line', type: 'line', source: 'nav-route', paint: { 'line-color': 'hsl(174, 62%, 47%)', 'line-opacity': 0.85, 'line-width': 4, 'line-dasharray': [2, 3] } });
    }
    // Measurement line
    if (!map.getSource('measure-line')) {
      map.addSource('measure-line', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} } });
      map.addLayer({ id: 'measure-line-layer', type: 'line', source: 'measure-line', paint: { 'line-color': '#f59e0b', 'line-opacity': 0.9, 'line-width': 3, 'line-dasharray': [4, 4] } });
    }
    // Heatmap
    if (!map.getSource('heatmap-data')) {
      map.addSource('heatmap-data', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'heatmap-layer', type: 'heatmap', source: 'heatmap-data',
        paint: {
          'heatmap-weight': 1, 'heatmap-intensity': 1.5, 'heatmap-radius': 40,
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.3, 'rgba(115,70,168,0.5)', 0.6, 'rgba(255,140,0,0.7)', 1, 'rgba(255,30,30,0.9)'],
          'heatmap-opacity': 0.7,
        },
        layout: { visibility: 'none' },
      });
    }
  }, []);

  // ── Initialize Map ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URLS[activeLayer] || STYLE_URLS.dark,
      center: [campus.lng, campus.lat],
      zoom: campus.zoom,
      pitch: 45,
      bearing: -10,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');

    // Track center for "Add Location"
    if (onCenterChange) {
      map.on('move', () => {
        const c = map.getCenter();
        onCenterChange([c.lat, c.lng]);
      });
    }

    map.on('style.load', () => {
      addCustomLayers(map);
      setMapReady(false);
      setTimeout(() => setMapReady(true), 100);
    });

    map.on('load', () => {
      addCustomLayers(map);
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Layer switching ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || activeLayer === prevLayerRef.current) return;
    prevLayerRef.current = activeLayer;
    map.setStyle(STYLE_URLS[activeLayer] || STYLE_URLS.dark);
  }, [activeLayer]);

  // ── Building markers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    buildingsList.forEach((b) => {
      if (activeFilter && b.category !== activeFilter) return;

      const isSelected = selectedBuilding?.id === b.id;
      const color = isSelected ? 'hsl(38, 92%, 55%)' : categoryColors[b.category];
      const size = isSelected ? 18 : 13;
      const emoji = categoryIconEmojis[b.category] || '📍';

      // Distance from user
      let distLabel = '';
      if (userLocation) {
        const d = turf.distance(turf.point([userLocation[1], userLocation[0]]), turf.point([b.lng, b.lat]), { units: 'meters' });
        distLabel = fmtDist(d);
      }

      const el = document.createElement('div');
      el.className = 'campus-marker';
      el.innerHTML = `
        <div style="
          width:${size}px;height:${size}px;
          background:${color};
          border:2px solid rgba(10,12,20,0.8);
          border-radius:50%;
          box-shadow:0 0 ${isSelected ? 18 : 10}px ${color}80;
          transition:all .3s ease;
          ${isSelected ? 'animation:pulse-glow 2s ease-in-out infinite;' : ''}
        "></div>
        ${distLabel ? `<div class="marker-dist-label">${emoji} ${distLabel}</div>` : ''}
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectBuilding(b);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([b.lng, b.lat])
        .addTo(map);

      // Tooltip popup
      const popup = new maplibregl.Popup({ offset: 15, closeButton: false, closeOnClick: false, className: 'campus-tooltip-popup' })
        .setHTML(`<strong>${b.shortName}</strong>`);

      el.addEventListener('mouseenter', () => { popup.setLngLat([b.lng, b.lat]).addTo(map); });
      el.addEventListener('mouseleave', () => { popup.remove(); });

      markersRef.current[b.id] = marker;
    });

    // Fly to selected building
    if (selectedBuilding && map) {
      map.flyTo({ center: [selectedBuilding.lng, selectedBuilding.lat], zoom: 18, duration: 600 });
    }
  }, [buildingsList, activeFilter, selectedBuilding, onSelectBuilding, userLocation]);

  // ── User location marker + accuracy + trail ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (userLocation) {
      const [lat, lng] = userLocation;

      // Update or create user marker
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([lng, lat]);
      } else {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="position:relative;width:24px;height:24px;">
            <div style="position:absolute;top:5px;left:5px;width:14px;height:14px;background:#4285f4;border:3px solid rgba(10,12,20,0.8);border-radius:50%;box-shadow:0 0 20px rgba(66,133,244,0.5);z-index:2;"></div>
            <div style="position:absolute;top:0;left:0;width:24px;height:24px;border:2px solid rgba(66,133,244,0.4);border-radius:50%;animation:pulse-glow 2s ease-in-out infinite;"></div>
          </div>
        `;
        userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map);
      }

      // Accuracy circle
      if (userAccuracy && map.getSource('gps-accuracy')) {
        const circle = turf.circle([lng, lat], Math.min(userAccuracy, 200), { steps: 64, units: 'meters' });
        (map.getSource('gps-accuracy') as maplibregl.GeoJSONSource).setData(circle);
      }

      // GPS breadcrumb trail
      const trail = gpsTrailRef.current;
      const last = trail.length > 0 ? trail[trail.length - 1] : null;
      if (!last || turf.distance(turf.point([last[1], last[0]]), turf.point([lng, lat]), { units: 'meters' }) > 3) {
        trail.push([lat, lng]);
        if (trail.length > 500) trail.shift();
        if (map.getSource('gps-trail')) {
          (map.getSource('gps-trail') as maplibregl.GeoJSONSource).setData({
            type: 'Feature', geometry: { type: 'LineString', coordinates: trail.map(p => [p[1], p[0]]) }, properties: {},
          });
        }
      }

      // Follow mode
      if (isFollowing) {
        map.easeTo({ center: [lng, lat], bearing: userHeading || map.getBearing(), duration: 500 });
      }
    }
  }, [userLocation, userAccuracy, userHeading, isFollowing, mapReady]);

  // ── Explicit recenter (on GPS button click) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !userLocation) return;
    const [lat, lng] = userLocation;
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16), duration: 700 });
  }, [recenterTrigger, mapReady, userLocation]);

  // ── Navigation route ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (navigatingTo && userLocation) {
      const [uLat, uLng] = userLocation;
      const coords: [number, number][] = [[uLng, uLat], [navigatingTo.lng, navigatingTo.lat]];

      if (map.getSource('nav-route')) {
        (map.getSource('nav-route') as maplibregl.GeoJSONSource).setData({
          type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {},
        });
      }

      // Distance + ETA
      const dist = turf.distance(turf.point([uLng, uLat]), turf.point([navigatingTo.lng, navigatingTo.lat]), { units: 'meters' });

      // Arrival check
      if (dist < 30 && !arrivedRef.current) {
        arrivedRef.current = true;
        toast.success(`You've arrived at ${navigatingTo.shortName}! 🎉`, { description: `${fmtDist(dist)} away · ${estimateSteps(dist)} steps` });
      }

      // Destination marker
      if (!destMarkerRef.current) {
        const el = document.createElement('div');
        el.innerHTML = `<div style="width:16px;height:16px;background:#ef4444;border:3px solid rgba(10,12,20,0.8);border-radius:50%;box-shadow:0 0 12px rgba(239,68,68,0.6);"></div>`;
        destMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([navigatingTo.lng, navigatingTo.lat])
          .addTo(map);
      } else {
        destMarkerRef.current.setLngLat([navigatingTo.lng, navigatingTo.lat]);
      }
    } else {
      // Clear route
      if (map.getSource('nav-route')) {
        (map.getSource('nav-route') as maplibregl.GeoJSONSource).setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} });
      }
      if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }
      arrivedRef.current = false;
    }
  }, [navigatingTo, userLocation, mapReady]);

  // ── Heatmap ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    try {
      if (map.getLayer('heatmap-layer')) {
        map.setLayoutProperty('heatmap-layer', 'visibility', showHeatMap ? 'visible' : 'none');
      }
      if (showHeatMap && map.getSource('heatmap-data')) {
        const features = buildingsList.map(b => turf.point([b.lng, b.lat]));
        (map.getSource('heatmap-data') as maplibregl.GeoJSONSource).setData(turf.featureCollection(features));
      }
    } catch { /* style may not be loaded yet */ }
  }, [showHeatMap, buildingsList, mapReady]);

  // ── Measurement tool ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!measureMode) {
      // Cleanup
      measurePointsRef.current = [];
      measureMarkersRef.current.forEach(m => m.remove());
      measureMarkersRef.current = [];
      if (map.getSource('measure-line') && mapReady) {
        try { (map.getSource('measure-line') as maplibregl.GeoJSONSource).setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} }); } catch { /* */ }
      }
      return;
    }

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const pt = e.lngLat;
      measurePointsRef.current.push(pt);

      // Add marker dot
      const el = document.createElement('div');
      el.style.cssText = 'width:10px;height:10px;background:#f59e0b;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);';
      const marker = new maplibregl.Marker({ element: el }).setLngLat(pt).addTo(map);
      measureMarkersRef.current.push(marker);

      // Update line and distance
      const pts = measurePointsRef.current;
      if (pts.length >= 2 && map.getSource('measure-line')) {
        const coords = pts.map(p => [p.lng, p.lat] as [number, number]);
        (map.getSource('measure-line') as maplibregl.GeoJSONSource).setData({
          type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {},
        });
        let totalDist = 0;
        for (let i = 1; i < pts.length; i++) {
          totalDist += turf.distance(turf.point([pts[i - 1].lng, pts[i - 1].lat]), turf.point([pts[i].lng, pts[i].lat]), { units: 'meters' });
        }
        onMeasureDistance?.(totalDist);
      }
    };

    map.on('click', handleClick);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.getCanvas().style.cursor = '';
    };
  }, [measureMode, mapReady, onMeasureDistance]);

  // ── Auto-zoom to campus buildings on mount ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || buildingsList.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    buildingsList.forEach(b => bounds.extend([b.lng, b.lat]));

    setTimeout(() => {
      if (!mapRef.current) return;
      try { mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 17, pitch: 50, duration: 1200 }); } catch { /* */ }
    }, 500);
    // Only run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full campus-map-shell" />

      {/* Navigation active banner */}
      {navigatingTo && userLocation && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[400]">
          <div className="bg-primary/90 backdrop-blur-xl text-primary-foreground px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 border border-primary/30">
            <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
            {(() => {
              const d = turf.distance(turf.point([userLocation[1], userLocation[0]]), turf.point([navigatingTo.lng, navigatingTo.lat]), { units: 'meters' });
              return `${navigatingTo.shortName} · ${fmtDist(d)} · ${walkingETA(d)}`;
            })()}
          </div>
        </div>
      )}

      {/* Target crosshair for Add Location */}
      {isAddingLocation && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] pointer-events-none drop-shadow-lg scale-110">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary animate-in zoom-in duration-300">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default CampusMap;
