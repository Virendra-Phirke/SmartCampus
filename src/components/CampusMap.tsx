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
  onCancelNavigation?: () => void;
  isAddingLocation?: boolean;
  onCenterChange?: (center: [number, number]) => void;
  activeFilter?: string | null;
  isFollowing?: boolean;
  activeLayer?: string;
  showHeatMap?: boolean;
  measureMode?: boolean;
  onMeasureDistance?: (d: number) => void;
  recenterTrigger?: number;
  showCampusTrigger?: number;
}



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
const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const CampusMap = ({
  campus, selectedBuilding, onSelectBuilding, userLocation, userAccuracy,
  userHeading, navigatingTo, onCancelNavigation, isAddingLocation = false, onCenterChange,
  activeFilter, isFollowing, activeLayer = 'dark',
  showHeatMap = false, measureMode = false, onMeasureDistance, recenterTrigger = 0, showCampusTrigger = 0,
}: CampusMapProps) => {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const markerDistanceLabelRef = useRef<Record<string, HTMLDivElement | null>>({});
  const campusMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const prevLayerRef = useRef(activeLayer);
  const gpsTrailRef = useRef<[number, number][]>([]);
  const measurePointsRef = useRef<maplibregl.LngLat[]>([]);
  const measureMarkersRef = useRef<maplibregl.Marker[]>([]);
  const arrivedRef = useRef(false);
  const lastDistanceLabelsUpdateRef = useRef(0);
  const lastFollowCameraUpdateRef = useRef(0);
  const [mapReady, setMapReady] = useState(false);

  const { data: supabaseBuildings } = useBuildings();

  const buildingsList = useMemo<CampusBuilding[]>(() => {
    if (supabaseBuildings && supabaseBuildings.length > 0) return supabaseBuildings.map(toBuildingLegacy);
    return staticBuildings;
  }, [supabaseBuildings]);

  const navDistanceMeters = useMemo(() => {
    if (!navigatingTo || !userLocation) return null;
    return haversineMeters(userLocation[0], userLocation[1], navigatingTo.lat, navigatingTo.lng);
  }, [navigatingTo, userLocation]);

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
      map.addLayer({ id: 'nav-route-glow', type: 'line', source: 'nav-route', paint: { 'line-color': '#1d4ed8', 'line-opacity': 0.5, 'line-width': 8, 'line-blur': 2 } });
      map.addLayer({ id: 'nav-route-line', type: 'line', source: 'nav-route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#3b82f6', 'line-opacity': 0.9, 'line-width': 5 } });
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

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'top-right');
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    }), 'top-right');
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

  // ── Draw College Campus Marker ──
  const collegeLucideSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a2 2 0 0 1-.019 3.838L12.82 19.22a2 2 0 0 1-1.64 0L2.6 14.76a2 2 0 0 1-.02-3.84L11.18 6.54a2 2 0 0 1 1.64 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>`;

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    if (!campus) {
      if (campusMarkerRef.current) {
        campusMarkerRef.current.remove();
        campusMarkerRef.current = null;
      }
      return;
    }

    let distLabel = '';
    if (userLocation) {
      const d = haversineMeters(userLocation[0], userLocation[1], campus.lat, campus.lng);
      distLabel = fmtDist(d);
    }

    if (!campusMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'campus-main-marker';
      el.style.zIndex = '50';
      el.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; items: center;">
          <div style="background:hsl(210,100%,55%);width:40px;height:40px;border-radius:50%;border:4px solid white;box-shadow:0 0 20px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white; z-index: 2; position: relative;">
            ${collegeLucideSvg}
          </div>
          <div id="college-dist-label" class="marker-dist-label" style="display: ${distLabel ? 'block' : 'none'}; position: absolute; top: -30px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: rgba(0,0,0,0.8); color: white; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 13px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 3;">
            ${distLabel}
          </div>
        </div>
      `;
      campusMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([campus.lng, campus.lat])
        .addTo(map);

      // Label
      const popup = new maplibregl.Popup({ offset: 25, closeButton: false, closeOnClick: false, className: 'campus-tooltip-popup' })
        .setHTML(`<strong>${campus.short_name || campus.name}</strong>`);
      el.addEventListener('mouseenter', () => popup.setLngLat([campus.lng, campus.lat]).addTo(map));
      el.addEventListener('mouseleave', () => popup.remove());
      
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        map.flyTo({ center: [campus.lng, campus.lat], zoom: 17, duration: 800 });
        onSelectBuilding({
          id: 'college-main-campus',
          name: campus.name,
          shortName: campus.short_name || campus.name,
          category: 'admin',
          lat: campus.lat,
          lng: campus.lng,
          description: campus.address || 'Main College Campus',
        });
      });
    } else {
      campusMarkerRef.current.setLngLat([campus.lng, campus.lat]);
      const distEl = campusMarkerRef.current.getElement().querySelector('#college-dist-label') as HTMLDivElement;
      if (distEl) {
        distEl.innerHTML = distLabel;
        distEl.style.display = distLabel ? 'block' : 'none';
      }
    }
  }, [mapReady, campus, userLocation, onSelectBuilding]);

  // ── Building markers ──
  const categoryLucideSvgs: Record<string, string> = useMemo(() => ({
    academic: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    admin: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    facility: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
    sports: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
    hostel: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  }), []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    markerDistanceLabelRef.current = {};

    buildingsList.forEach((b) => {
      if (activeFilter && b.category !== activeFilter) return;

      const isSelected = selectedBuilding?.id === b.id;
      const color = isSelected ? 'hsl(38, 92%, 55%)' : categoryColors[b.category];
      const svgIcon = categoryLucideSvgs[b.category] || categoryLucideSvgs.facility;

      // Distance from user
      let distLabel = '';
      if (userLocation) {
        const d = haversineMeters(userLocation[0], userLocation[1], b.lat, b.lng);
        distLabel = fmtDist(d);
      }

      const el = document.createElement('div');
      el.className = 'campus-marker';

      // Design: Google Maps Style
      // Selected = Red Teardrop pin, Unselected = Colored dot with text to the right
      
      const distText = distLabel ? `<span style="font-size:10px; margin-left:4px; opacity:0.85; font-weight:normal;">${distLabel}</span>` : '';

      if (isSelected) {
        // Active selected Google Maps Style big red drop pin
        el.style.zIndex = '100';
        el.innerHTML = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translateY(-16px); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
            <svg viewBox="0 0 24 34" width="34" height="48" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 22 12 22s12-13.5 12-22C24 5.373 18.627 0 12 0z" fill="#ea4335" />
              <circle cx="12" cy="12" r="8" fill="#ffffff" />
            </svg>
            <div style="position: absolute; top: 8px; color: #ea4335; display:flex; align-items:center; justify-content:center;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${svgIcon.replace(/<svg[^>]*>|<\/svg>/g, '')}</svg>
            </div>
            <div style="position: absolute; top: -28px; white-space: nowrap; background: white; color: #202124; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; box-shadow: 0 1px 4px rgba(0,0,0,0.3);">
              ${b.shortName} <span id="building-dist-${b.id}" style="color: #5f6368; font-size: 11px; margin-left: 2px; display: ${distLabel ? 'inline' : 'none'};">${distLabel}</span>
            </div>
          </div>
        `;
      } else {
        // Unselected Google Maps Style POI
        el.innerHTML = `
          <div style="display: flex; align-items: center; gap: 4px; pointer-events: none;">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: ${categoryColors[b.category] || '#4285f4'}; border: 1.5px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.3); pointer-events: auto; cursor: pointer;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${svgIcon.replace(/<svg[^>]*>|<\/svg>/g, '')}</svg>
            </div>
            <div style="font-size: 12px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: white; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 1px 4px rgba(0,0,0,0.8); pointer-events: auto; cursor: pointer; white-space: nowrap; letter-spacing: -0.2px;">
              ${b.shortName} <span id="building-dist-${b.id}" style="font-weight: 400; font-size: 10px; color: #e8eaed; margin-left: 2px; display: ${distLabel ? 'inline' : 'none'};">${distLabel}</span>
            </div>
          </div>
        `;
      }

      // Grab reference to distance label inside innerHTML for fast updates
      const label = el.querySelector(`#building-dist-${b.id}`) as HTMLDivElement;
      markerDistanceLabelRef.current[b.id] = label;

      // Hover effects
      const pillDiv = el.firstElementChild as HTMLElement;
      if (!isSelected && pillDiv) {
        pillDiv.addEventListener('mouseenter', () => { pillDiv.style.transform = 'scale(1.1)'; });
        pillDiv.addEventListener('mouseleave', () => { pillDiv.style.transform = 'scale(1)'; });
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectBuilding(b);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([b.lng, b.lat])
        .addTo(map);

      markersRef.current[b.id] = marker;
    });

    // Fly to selected building
    if (selectedBuilding && map) {
      map.flyTo({ center: [selectedBuilding.lng, selectedBuilding.lat], zoom: 18, duration: 600 });
    }
  }, [buildingsList, activeFilter, selectedBuilding, onSelectBuilding, userLocation, categoryLucideSvgs]);

  // ── Update marker distance labels without recreating markers ──
  useEffect(() => {
    if (!buildingsList.length) return;

    if (!userLocation) {
      Object.values(markerDistanceLabelRef.current).forEach((label) => {
        if (label) label.style.display = 'none';
      });
      return;
    }

    const now = Date.now();
    if (now - lastDistanceLabelsUpdateRef.current < 1200) return;
    lastDistanceLabelsUpdateRef.current = now;

    buildingsList.forEach((b) => {
      if (activeFilter && b.category !== activeFilter) return;

      const label = markerDistanceLabelRef.current[b.id];
      if (!label) return;

      const meters = haversineMeters(userLocation[0], userLocation[1], b.lat, b.lng);
      label.innerHTML = fmtDist(meters);
      label.style.display = 'inline';
    });
  }, [userLocation, buildingsList, activeFilter]);

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
      if (!last || haversineMeters(last[0], last[1], lat, lng) > 3) {
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
        const ts = performance.now();
        if (ts - lastFollowCameraUpdateRef.current > 350) {
          lastFollowCameraUpdateRef.current = ts;
          map.easeTo({ center: [lng, lat], bearing: userHeading || map.getBearing(), duration: 350 });
        }
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

      // Distance + ETA
      const dist = haversineMeters(uLat, uLng, navigatingTo.lat, navigatingTo.lng);

      // Arrival check
      if (dist < 30 && !arrivedRef.current) {
        arrivedRef.current = true;
        toast.success(`You've arrived at ${navigatingTo.shortName}! 🎉`, { description: `${fmtDist(dist)} away · ${estimateSteps(dist)} steps` });
      }

      // Initial straight line fallback while loading
      const initCoords: [number, number][] = [[uLng, uLat], [navigatingTo.lng, navigatingTo.lat]];
      if (map.getSource('nav-route')) {
        (map.getSource('nav-route') as maplibregl.GeoJSONSource).setData({
          type: 'Feature', geometry: { type: 'LineString', coordinates: initCoords }, properties: {},
        });
      }

      // Fetch proper road route via OSRM (using driving profile for proper road networks like Google Maps)
      fetch(`https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${navigatingTo.lng},${navigatingTo.lat}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates;
             if (map.getSource('nav-route')) {
              (map.getSource('nav-route') as maplibregl.GeoJSONSource).setData({
                type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {},
              });
            }
            
            // Auto fit bounds so the new path is nicely visible
            const bounds = new maplibregl.LngLatBounds();
            coords.forEach((c: [number, number]) => bounds.extend(c));
            map.fitBounds(bounds, { padding: 90, maxZoom: 18, duration: 1500 });
          }
        })
        .catch(() => {});

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
    if (!map || !mapReady || !campus) return;

    const bounds = new maplibregl.LngLatBounds();
    // Always ensure the main campus coordinate is in the view
    bounds.extend([campus.lng, campus.lat]);
    
    // Add all buildings if they exist
    buildingsList.forEach(b => bounds.extend([b.lng, b.lat]));

    setTimeout(() => {
      if (!mapRef.current) return;
      try { 
        mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 17, pitch: 45, duration: 1500 }); 
      } catch { /* */ }
    }, 500);
  }, [mapReady, campus, buildingsList.length]);

  // ── Manual Show Campus Trigger ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !campus || showCampusTrigger === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([campus.lng, campus.lat]);
    buildingsList.forEach(b => bounds.extend([b.lng, b.lat]));
    
    try { 
      map.fitBounds(bounds, { padding: 60, maxZoom: 17, pitch: 45, duration: 1500 }); 
    } catch { /* */ }
  }, [showCampusTrigger, mapReady, campus, buildingsList.length]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full campus-map-shell" />

      {/* Navigation active banner */}
      {navigatingTo && userLocation && (
        <div className="absolute top-[max(env(safe-area-inset-top),8px)] left-1/2 transform -translate-x-1/2 z-[400] w-[90%] max-w-sm">
          <div className="bg-card/95 backdrop-blur-sm text-foreground px-4 py-3 rounded-2xl shadow-xl border border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">{navigatingTo.shortName}</span>
                <span className="text-xs text-muted-foreground font-medium">
                  {navDistanceMeters != null ? <span className="text-blue-500">{walkingETA(navDistanceMeters)}</span> : 'Calculating...'}
                  {navDistanceMeters != null && ` · ${fmtDist(navDistanceMeters)}`}
                </span>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if(onCancelNavigation) onCancelNavigation();
              }} 
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
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
