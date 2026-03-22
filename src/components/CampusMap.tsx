import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import maplibregl from '@/lib/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import { MdApartment, MdBusiness, MdHome, MdLocationOn, MdSchool, MdSportsSoccer } from 'react-icons/md';
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
  navigationMode?: 'car' | 'bike' | 'bus' | 'walk';
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
const modeSpeedMps: Record<'car' | 'bike' | 'bus' | 'walk', number> = {
  car: 8.33,
  bike: 4.16,
  bus: 5.55,
  walk: 1.33,
};
const modeRouteProfile: Record<'car' | 'bike' | 'bus' | 'walk', 'driving' | 'cycling' | 'walking'> = {
  car: 'driving',
  bus: 'driving',
  bike: 'cycling',
  walk: 'walking',
};
const etaByMode = (m: number, mode: 'car' | 'bike' | 'bus' | 'walk') => {
  const speed = modeSpeedMps[mode] || modeSpeedMps.walk;
  const min = Math.max(1, Math.ceil(m / speed / 60));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;
};
const MARKER_VISIBILITY_ZOOM_THRESHOLD = 15;
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
  userHeading, navigatingTo, navigationMode = 'walk', onCancelNavigation, isAddingLocation = false, onCenterChange,
  activeFilter, isFollowing, activeLayer = 'dark',
  showHeatMap = false, measureMode = false, onMeasureDistance, recenterTrigger = 0, showCampusTrigger = 0,
}: CampusMapProps) => {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const campusMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const prevLayerRef = useRef(activeLayer);
  const measurePointsRef = useRef<maplibregl.LngLat[]>([]);
  const measureMarkersRef = useRef<maplibregl.Marker[]>([]);
  const arrivedRef = useRef(false);
  const routeFramedForDestRef = useRef<string | null>(null);
  const hasAutoFramedCampusRef = useRef(false);
  const lastAutoFocusedBuildingIdRef = useRef<string | null>(null);
  const lastFollowCameraUpdateRef = useRef(0);
  const lastRecenterTriggerRef = useRef(recenterTrigger);
  const styleCacheRef = useRef<Record<string, maplibregl.StyleSpecification>>({});
  const didPreloadStylesRef = useRef(false);
  const lastCampusIdRef = useRef<string | null>(campus?.id || null);
  const [mapReady, setMapReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(campus.zoom);

  const { data: supabaseBuildings } = useBuildings();

  const buildingsList = useMemo<CampusBuilding[]>(() => {
    if (supabaseBuildings && supabaseBuildings.length > 0) {
      const filtered = campus?.id
        ? supabaseBuildings.filter((b: any) => !b.college_id || b.college_id === campus.id)
        : supabaseBuildings;

      return filtered.map(toBuildingLegacy);
    }
    return staticBuildings;
  }, [supabaseBuildings, campus?.id]);

  const navDistanceMeters = useMemo(() => {
    if (!navigatingTo || !userLocation) return null;
    return haversineMeters(userLocation[0], userLocation[1], navigatingTo.lat, navigatingTo.lng);
  }, [navigatingTo, userLocation]);

  // Preload styles once so first light/dark switch feels instant
  useEffect(() => {
    if (didPreloadStylesRef.current) return;
    didPreloadStylesRef.current = true;

    const controller = new AbortController();
    const preload = async (key: string, url: string) => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        styleCacheRef.current[key] = json as maplibregl.StyleSpecification;
      } catch {
        // ignore preload failures; map will fallback to URL style
      }
    };

    preload('dark', STYLE_URLS.dark as string);
    preload('street', STYLE_URLS.street as string);
    preload('outdoor', STYLE_URLS.outdoor as string);

    return () => controller.abort();
  }, []);

  // ── Helper: add custom layers after style loads ──
  const addCustomLayers = useCallback((map: maplibregl.Map) => {
    // GPS accuracy circle
    if (!map.getSource('gps-accuracy')) {
      map.addSource('gps-accuracy', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'gps-accuracy-fill', type: 'fill', source: 'gps-accuracy', paint: { 'fill-color': '#4285f4', 'fill-opacity': 0.1 } });
      map.addLayer({ id: 'gps-accuracy-line', type: 'line', source: 'gps-accuracy', paint: { 'line-color': '#4285f4', 'line-opacity': 0.3, 'line-width': 1.5 } });
    }
    // GPS trail intentionally disabled (users mistook it for active navigation)
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
      style: styleCacheRef.current[activeLayer] || STYLE_URLS[activeLayer] || STYLE_URLS.dark,
      center: [campus.lng, campus.lat],
      zoom: campus.zoom,
      pitch: 45,
      bearing: -10,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'top-left');

    // Gesture tuning (mobile-first): smoother zoom/pan, avoid accidental rotate/pitch
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouchDevice) {
      map.touchZoomRotate.disableRotation();
      map.dragRotate.disable();
      map.touchPitch.disable();
      map.dragPan.enable({ linearity: 0.2, deceleration: 2400, maxSpeed: 1100 });
      map.scrollZoom.setWheelZoomRate(1 / 700);
      map.scrollZoom.setZoomRate(1 / 120);
    } else {
      map.scrollZoom.setWheelZoomRate(1 / 550);
      map.scrollZoom.setZoomRate(1 / 100);
    }

    // Track center for "Add Location"
    if (onCenterChange) {
      map.on('move', () => {
        const c = map.getCenter();
        onCenterChange([c.lat, c.lng]);
      });
    }

    // Track zoom level for marker visibility
    map.on('zoom', () => {
      setMapZoom(map.getZoom());
    });

    map.on('style.load', () => {
      addCustomLayers(map);
      setMapReady(true);
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
    map.setStyle(styleCacheRef.current[activeLayer] || STYLE_URLS[activeLayer] || STYLE_URLS.dark);
  }, [activeLayer]);

  // ── Draw College Campus Marker ──
  const collegeReactIconSvg = useMemo(() => renderToStaticMarkup(<MdSchool size={20} />), []);

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

    // Only show campus marker when zoomed out
    const shouldShowCampusMarker = mapZoom <= MARKER_VISIBILITY_ZOOM_THRESHOLD;

    if (!campusMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'campus-main-marker';
      el.style.zIndex = '50';
      el.style.display = shouldShowCampusMarker ? 'flex' : 'none';
      el.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; items: center;">
          <div style="background:hsl(210,100%,55%);width:40px;height:40px;border-radius:50%;border:4px solid white;box-shadow:0 0 20px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white; z-index: 2; position: relative;">
            ${collegeReactIconSvg}
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
      // Update visibility based on zoom
      const markerEl = campusMarkerRef.current.getElement();
      markerEl.style.display = shouldShowCampusMarker ? 'flex' : 'none';
    }
  }, [mapReady, campus, userLocation, onSelectBuilding, collegeReactIconSvg, mapZoom]);

  // ── Building markers ──
  const categoryReactIconSvgs: Record<string, string> = useMemo(() => ({
    academic: renderToStaticMarkup(<MdSchool size={16} />),
    admin: renderToStaticMarkup(<MdBusiness size={16} />),
    facility: renderToStaticMarkup(<MdApartment size={16} />),
    sports: renderToStaticMarkup(<MdSportsSoccer size={16} />),
    hostel: renderToStaticMarkup(<MdHome size={16} />),
  }), []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Only show building markers when zoomed in
    const shouldShowBuildingMarkers = mapZoom > MARKER_VISIBILITY_ZOOM_THRESHOLD;

    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    if (!shouldShowBuildingMarkers) return; // Don't render building markers when zoomed out

    buildingsList.forEach((b) => {
      if (activeFilter && b.category !== activeFilter) return;

      const isSelected = selectedBuilding?.id === b.id;
      const isDestination = navigatingTo?.id === b.id;
      const svgIcon = categoryReactIconSvgs[b.category] || categoryReactIconSvgs.facility;
      const shouldShowLabel = isSelected || isDestination;

      const el = document.createElement('div');
      el.className = 'campus-marker';

      const markerSize = isSelected ? 34 : 28;
      const markerRing = isSelected ? '2px solid #f59e0b' : (isDestination ? '2px solid #2563eb' : '2px solid #ffffff');
      const markerShadow = isSelected
        ? '0 0 0 4px rgba(245,158,11,0.24), 0 6px 14px rgba(0,0,0,0.35)'
        : '0 4px 10px rgba(0,0,0,0.28)';

      el.innerHTML = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          ${shouldShowLabel ? `<div style="position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(9,16,27,0.92);border:1px solid rgba(56,189,248,0.28);color:#e5f4ff;padding:5px 10px;border-radius:12px;font-size:12px;font-weight:700;line-height:1.1;box-shadow:0 6px 16px rgba(0,0,0,0.32);pointer-events:none;">${b.shortName || b.name}</div>` : ''}
          <div style="width:${markerSize}px;height:${markerSize}px;border-radius:999px;background:${categoryColors[b.category] || '#2563eb'};border:${markerRing};box-shadow:${markerShadow};color:#ffffff;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            <span style="display:flex;align-items:center;justify-content:center;line-height:0;">${svgIcon}</span>
          </div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectBuilding(b);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([b.lng, b.lat])
        .addTo(map);

      markersRef.current[b.id] = marker;
    });

  }, [buildingsList, activeFilter, selectedBuilding, navigatingTo, onSelectBuilding, categoryReactIconSvgs, mapZoom]);

  // ── Auto-focus selected building only once per selection (prevents zoom snapping) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!selectedBuilding) {
      lastAutoFocusedBuildingIdRef.current = null;
      return;
    }

    if (lastAutoFocusedBuildingIdRef.current === selectedBuilding.id) return;
    lastAutoFocusedBuildingIdRef.current = selectedBuilding.id;

    map.easeTo({
      center: [selectedBuilding.lng, selectedBuilding.lat],
      zoom: Math.max(map.getZoom(), 18),
      duration: 600,
      essential: true,
    });
  }, [selectedBuilding, mapReady]);

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

      // Follow mode
      if (isFollowing) {
        const ts = performance.now();
        const center = map.getCenter();
        const distToCenter = haversineMeters(center.lat, center.lng, lat, lng);

        if (distToCenter < 2) return;

        if (ts - lastFollowCameraUpdateRef.current > 500) {
          lastFollowCameraUpdateRef.current = ts;
          map.easeTo({
            center: [lng, lat],
            bearing: userHeading ?? map.getBearing(),
            duration: 650,
            easing: (t) => 1 - Math.pow(1 - t, 2),
            essential: true,
          });
        }
      }
    }
  }, [userLocation, userAccuracy, userHeading, isFollowing, mapReady]);

  // ── Explicit recenter (on GPS button click) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !userLocation) return;

    if (recenterTrigger === lastRecenterTriggerRef.current) return;
    lastRecenterTriggerRef.current = recenterTrigger;

    const [lat, lng] = userLocation;
    map.easeTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 16),
      duration: 900,
      easing: (t) => 1 - Math.pow(1 - t, 2),
      essential: true,
    });
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

      // Fetch proper road route via OSRM using selected navigation mode
      const routeProfile = modeRouteProfile[navigationMode] || 'walking';
      fetch(`https://router.project-osrm.org/route/v1/${routeProfile}/${uLng},${uLat};${navigatingTo.lng},${navigatingTo.lat}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates;
             if (map.getSource('nav-route')) {
              (map.getSource('nav-route') as maplibregl.GeoJSONSource).setData({
                type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {},
              });
            }
            
            // Auto fit once per destination so camera stays stable during live updates
            if (routeFramedForDestRef.current !== navigatingTo.id) {
              routeFramedForDestRef.current = navigatingTo.id;
              const bounds = new maplibregl.LngLatBounds();
              coords.forEach((c: [number, number]) => bounds.extend(c));
              map.fitBounds(bounds, { padding: 90, maxZoom: 18, duration: 1200 });
            }
          }
        })
        .catch(() => {});

      // Destination marker
      if (!destMarkerRef.current) {
        const el = document.createElement('div');
        el.innerHTML = `<div style="width:30px;height:30px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 8px 16px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;">${renderToStaticMarkup(<MdLocationOn size={16} />)}</div>`;
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
      routeFramedForDestRef.current = null;
    }
  }, [navigatingTo, userLocation, mapReady, navigationMode]);

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

  // ── Handle campus switching ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !campus) return;

    const changed = lastCampusIdRef.current !== campus.id;
    if (!changed) return;

    lastCampusIdRef.current = campus.id;
    hasAutoFramedCampusRef.current = false;
    routeFramedForDestRef.current = null;
    lastAutoFocusedBuildingIdRef.current = null;
    setMapZoom(campus.zoom);

    try {
      map.flyTo({ center: [campus.lng, campus.lat], zoom: campus.zoom, pitch: 45, bearing: -10, duration: 900 });
    } catch {
      // no-op
    }
  }, [campus, mapReady]);

  // ── Auto-zoom to campus buildings on mount ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !campus) return;
    if (hasAutoFramedCampusRef.current) return;

    const bounds = new maplibregl.LngLatBounds();
    // Always ensure the main campus coordinate is in the view
    bounds.extend([campus.lng, campus.lat]);
    
    // Add all buildings if they exist
    buildingsList.forEach(b => bounds.extend([b.lng, b.lat]));

    setTimeout(() => {
      if (!mapRef.current) return;
      try { 
        mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 17, pitch: 45, duration: 1500 }); 
        hasAutoFramedCampusRef.current = true;
      } catch { /* */ }
    }, 500);
  }, [mapReady, campus, buildingsList]);

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
  }, [showCampusTrigger, mapReady, campus, buildingsList]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full campus-map-shell" />

      {/* Navigation active banner */}
      {navigatingTo && userLocation && (
        <div className="absolute top-28 sm:top-[max(env(safe-area-inset-top),8px)] left-3 right-16 sm:left-1/2 sm:right-auto sm:w-[90%] sm:max-w-sm sm:transform sm:-translate-x-1/2 z-[400]">
          <div className="bg-card/95 backdrop-blur-sm text-foreground px-4 py-3 rounded-2xl shadow-xl border border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">{navigatingTo.shortName}</span>
                <span className="text-xs text-muted-foreground font-medium">
                  {navDistanceMeters != null ? <span className="text-blue-500">{etaByMode(navDistanceMeters, navigationMode)}</span> : 'Calculating...'}
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
              title="Cancel navigation"
              aria-label="Cancel navigation"
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
