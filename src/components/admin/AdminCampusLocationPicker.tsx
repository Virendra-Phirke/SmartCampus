import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Crosshair, Flame, Layers, Navigation, Ruler, X } from 'lucide-react';
import CampusMap from '@/components/CampusMap';
import type { College } from '@/lib/types';
import type { CampusBuilding } from '@/data/campusData';

const LAYER_OPTIONS = [
  { key: 'dark', label: 'Dark', emoji: '🌑' },
  { key: 'street', label: 'Street', emoji: '🗺️' },
  { key: 'satellite', label: 'Satellite', emoji: '🛰️' },
  { key: 'outdoor', label: 'Light', emoji: '☀️' },
];

interface AdminCampusLocationPickerProps {
  open: boolean;
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
  onClose: () => void;
  onSelect: (location: { lat: number; lng: number; zoom: number }) => void;
}

export default function AdminCampusLocationPicker({
  open,
  initialLat = 20.5937,
  initialLng = 78.9629,
  initialZoom = 14,
  onClose,
  onSelect,
}: AdminCampusLocationPickerProps) {
  const [center, setCenter] = useState<[number, number]>([initialLat, initialLng]);
  const [zoom, setZoom] = useState(initialZoom);
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeLayer, setActiveLayer] = useState('dark');
  const [showLayerDropdown, setShowLayerDropdown] = useState(false);
  const layerDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [showCampusTrigger, setShowCampusTrigger] = useState(0);

  useEffect(() => {
    if (!open) return;
    setCenter([initialLat, initialLng]);
    setZoom(initialZoom);
  }, [open, initialLat, initialLng, initialZoom]);

  useEffect(() => {
    if (!open || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => { /* no-op */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, [open]);

  // Close layer dropdown when tapping outside
  useEffect(() => {
    if (!showLayerDropdown) return;
    const handle = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (layerDropdownRef.current?.contains(target)) return;
      setShowLayerDropdown(false);
    };
    document.addEventListener('touchstart', handle, { passive: true });
    document.addEventListener('mousedown', handle);
    return () => {
      document.removeEventListener('touchstart', handle);
      document.removeEventListener('mousedown', handle);
    };
  }, [showLayerDropdown]);

  const pickerCampus = useMemo<College>(() => ({
    id: 'campus-location-picker',
    name: 'Campus Location Picker',
    short_name: 'Picker',
    lat: center[0],
    lng: center[1],
    zoom,
    address: 'Pick location from map center',
    created_at: new Date().toISOString(),
  }), [center, zoom]);

  if (!open) return null;

  const activeLayerOption = LAYER_OPTIONS.find((l) => l.key === activeLayer);
  return (
    <div className="fixed inset-0 z-[1500] bg-background overflow-hidden">

      {/* ── Full-screen map ── */}
      <div className="absolute inset-0">
        <CampusMap
          campus={pickerCampus}
          selectedBuilding={selectedBuilding}
          onSelectBuilding={setSelectedBuilding}
          userLocation={userLocation}
          navigatingTo={null}
          navigationMode="walk"
          onCancelNavigation={() => undefined}
          isAddingLocation={false}
          onCenterChange={(c) => setCenter(c)}
          activeLayer={activeLayer}
          activeFilter={null}
          isFollowing={false}
          showHeatMap={showHeatMap}
          measureMode={measureMode}
          onMeasureDistance={setMeasuredDistance}
          recenterTrigger={recenterTrigger}
          showCampusTrigger={showCampusTrigger}
        />
      </div>

      {/* ── Crosshair pin at center ── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary/20 shadow-[0_0_0_5px_rgba(20,184,166,0.15)]" />
      </div>

      {/* ── Measure distance badge ── */}
      {measureMode && measuredDistance != null && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+80px)] left-1/2 -translate-x-1/2 z-[1600]
                        bg-accent text-accent-foreground px-4 py-1.5 rounded-full font-bold text-xs shadow-lg">
          📏 {measuredDistance < 1000
            ? `${Math.round(measuredDistance)} m`
            : `${(measuredDistance / 1000).toFixed(1)} km`}
        </div>
      )}

      {/* ── Top controls ── */}
      <div className="absolute top-0 left-0 right-0 z-[1600] pointer-events-none pt-[max(env(safe-area-inset-top),12px)]">
        <div className="pointer-events-auto px-3 flex flex-col gap-2">

          {/* Row 1 — Close | Title | Recenter */}
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center shadow-md active:scale-95 transition-transform"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-[11px] font-semibold bg-card border border-border rounded-full px-3 py-1.5 shadow-sm">
              Pick Campus Location
            </div>

            <button
              onClick={() => setRecenterTrigger((v) => v + 1)}
              className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center shadow-md active:scale-95 transition-transform"
              aria-label="Recenter"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2 — Layer | Ruler | Heat | Focus */}
          <div className="flex items-center gap-1.5 pb-0.5">
            {/* Layer dropdown */}
            <div ref={layerDropdownRef} className="relative flex-shrink-0">
              <button
                onClick={() => { setShowLayerDropdown((v) => !v); }}
                className="flex items-center gap-1 bg-card border border-border rounded-full px-2.5 h-9 text-[11px] font-medium shadow-sm active:scale-95 transition-transform whitespace-nowrap"
              >
                <Layers className="w-3 h-3 flex-shrink-0" />
                <span>{activeLayerOption?.emoji} {activeLayerOption?.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showLayerDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLayerDropdown && (
                <div className="absolute top-full left-0 mt-1.5 bg-card border border-border rounded-2xl shadow-2xl p-1.5 z-[1700] min-w-[140px]">
                  {LAYER_OPTIONS.map((l) => (
                    <button
                      key={l.key}
                      onClick={() => { setActiveLayer(l.key); setShowLayerDropdown(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-[12px] font-medium flex items-center gap-2 transition-colors
                        ${activeLayer === l.key
                          ? 'bg-primary/15 text-primary'
                          : 'text-foreground active:bg-muted'}`}
                    >
                      <span>{l.emoji}</span> {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ruler toggle */}
            <button
              onClick={() => { setMeasureMode(!measureMode); setMeasuredDistance(null); }}
              className={`flex items-center gap-1 rounded-full px-2.5 h-9 text-[11px] font-medium border shadow-sm active:scale-95 transition-transform flex-shrink-0 whitespace-nowrap
                ${measureMode
                  ? 'bg-accent/15 text-accent border-accent/40'
                  : 'bg-card border-border text-foreground'}`}
            >
              <Ruler className="w-3 h-3 flex-shrink-0" />
              Ruler
            </button>

            {/* Heat toggle */}
            <button
              onClick={() => setShowHeatMap((v) => !v)}
              className={`flex items-center gap-1 rounded-full px-2.5 h-9 text-[11px] font-medium border shadow-sm active:scale-95 transition-transform flex-shrink-0 whitespace-nowrap
                ${showHeatMap
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/40'
                  : 'bg-card border-border text-foreground'}`}
            >
              <Flame className="w-3 h-3 flex-shrink-0" />
              Heat
            </button>

            {/* Focus button */}
            <button
              onClick={() => setShowCampusTrigger((v) => v + 1)}
              className="flex items-center gap-1 bg-card border border-border rounded-full px-2.5 h-9 text-[11px] font-medium shadow-sm active:scale-95 transition-transform flex-shrink-0 whitespace-nowrap"
              aria-label="Show full campus view"
            >
              <Navigation className="w-3 h-3 flex-shrink-0" />
              Focus
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom panel ── */}
      <div className="absolute bottom-0 left-0 right-0 z-[1600] pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="mx-3 bg-card border border-border rounded-2xl shadow-2xl p-3">

          {/* Coordinate chips */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-muted/50 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Latitude</span>
              <span className="text-[13px] font-semibold tabular-nums">{center[0].toFixed(6)}</span>
            </div>
            <div className="bg-muted/50 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Longitude</span>
              <span className="text-[13px] font-semibold tabular-nums">{center[1].toFixed(6)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onClose}
              className="h-12 rounded-xl bg-muted text-muted-foreground text-sm font-medium active:scale-[0.98] transition-transform"
            >
              Cancel
            </button>
            <button
              onClick={() => onSelect({ lat: Number(center[0].toFixed(6)), lng: Number(center[1].toFixed(6)), zoom })}
              className="h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <Check className="w-4 h-4" />
              Use This Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}