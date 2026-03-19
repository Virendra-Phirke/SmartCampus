import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useColleges } from '@/hooks/useColleges';
import type { College } from '@/lib/types';
import { Search, Loader2, Layers, X, Check, MapPin, Navigation } from 'lucide-react';
import * as turf from '@turf/turf';

interface CampusSelectionMapProps {
    onSelectCampus: (college: College) => void;
    userLocation?: [number, number] | null;
}

// ── Same style URLs as main CampusMap ──
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
        },
        layers: [{ id: 'satellite-layer', type: 'raster' as const, source: 'satellite' }],
    },
    outdoor: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

const layerOptions = [
    { id: 'dark', label: 'Dark Mode', icon: '🌙' },
    { id: 'street', label: 'Street View', icon: '🗺️' },
    { id: 'satellite', label: 'Satellite View', icon: '🛰️' },
    { id: 'outdoor', label: 'Outdoor Map', icon: '🏞️' },
];

const fmtDist = (d: number) => (d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`);

const CampusSelectionMap = ({ onSelectCampus, userLocation }: CampusSelectionMapProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<Record<string, maplibregl.Marker>>({});
    const prevLayerRef = useRef('dark');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeLayer, setActiveLayer] = useState('dark');
    const [showLayersMenu, setShowLayersMenu] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [pendingCollege, setPendingCollege] = useState<College | null>(null);
    const { data: colleges, isLoading } = useColleges();

    // Initialize map
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: STYLE_URLS.dark,
            center: [78.9629, 20.5937],
            zoom: 4,
            pitch: 15,
            attributionControl: false,
        });

        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
        map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Layer switching
    useEffect(() => {
        const map = mapRef.current;
        if (!map || activeLayer === prevLayerRef.current) return;
        prevLayerRef.current = activeLayer;
        map.setStyle(STYLE_URLS[activeLayer] || STYLE_URLS.dark);
    }, [activeLayer]);

    // Build markers — does NOT depend on pendingCollege so markers don't re-render/move
    const buildMarkers = useCallback(() => {
        if (!mapRef.current || !colleges) return;
        const map = mapRef.current;

        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};

        const q = searchQuery.toLowerCase();
        const filtered = colleges.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.short_name.toLowerCase().includes(q) ||
            (c.address && c.address.toLowerCase().includes(q))
        );

        const bounds = new maplibregl.LngLatBounds();
        let hasBounds = false;

        filtered.forEach((college) => {
            let distText = '';
            if (userLocation) {
                const from = turf.point([userLocation[1], userLocation[0]]);
                const to = turf.point([college.lng, college.lat]);
                const dist = turf.distance(from, to, { units: 'meters' });
                distText = fmtDist(dist);
            }

            const el = document.createElement('div');
            el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform .15s ease;';

            el.innerHTML = `
                <div style="
                    width:40px;height:40px;
                    background:linear-gradient(135deg, hsl(174, 62%, 47%), hsl(174, 70%, 35%));
                    border:3px solid rgba(255,255,255,0.95);
                    border-radius:50% 50% 50% 0;
                    transform:rotate(-45deg);
                    box-shadow:0 4px 16px rgba(0,0,0,0.4), 0 0 12px hsl(174, 62%, 47%, 0.3);
                    display:flex;align-items:center;justify-content:center;
                ">
                    <span style="font-size:17px;transform:rotate(45deg);">🏫</span>
                </div>
                <div style="
                    margin-top:4px;
                    background:rgba(15,15,30,0.92);
                    color:#fff;font-size:10px;font-weight:700;
                    padding:3px 8px;border-radius:8px;
                    white-space:nowrap;text-align:center;
                    box-shadow:0 2px 8px rgba(0,0,0,0.5);
                    backdrop-filter:blur(4px);
                    max-width:130px;overflow:hidden;text-overflow:ellipsis;
                ">${college.short_name}${distText ? ` · ${distText}` : ''}</div>
            `;

            el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.08)'; });
            el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

            el.addEventListener('click', (e) => {
                e.stopPropagation();
                setPendingCollege(college);
                map.flyTo({
                    center: [college.lng, college.lat],
                    zoom: 16, pitch: 50, bearing: -10,
                    duration: 1200,
                });
            });

            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([college.lng, college.lat])
                .addTo(map);

            markersRef.current[college.id] = marker;
            bounds.extend([college.lng, college.lat]);
            hasBounds = true;
        });

        if (hasBounds) {
            setTimeout(() => {
                if (!mapRef.current) return;
                try {
                    if (searchQuery && filtered.length === 1) {
                        mapRef.current.flyTo({ center: [filtered[0].lng, filtered[0].lat], zoom: 16, pitch: 40 });
                    } else {
                        mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 800 });
                    }
                } catch { /* */ }
            }, 200);
        }
    }, [searchQuery, colleges, userLocation]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const handler = () => buildMarkers();
        if (map.isStyleLoaded()) buildMarkers();
        map.on('style.load', handler);
        return () => { map.off('style.load', handler); };
    }, [buildMarkers]);

    const handleConfirm = () => {
        if (pendingCollege) {
            onSelectCampus(pendingCollege);
            setPendingCollege(null);
        }
    };

    const pendingDist = pendingCollege && userLocation
        ? turf.distance(
            turf.point([userLocation[1], userLocation[0]]),
            turf.point([pendingCollege.lng, pendingCollege.lat]),
            { units: 'meters' }
        )
        : null;

    return (
        <div className="relative w-full h-full">
            <div ref={containerRef} className="w-full h-full bg-background" />

            {/* ═══ Top-left: small search icon OR expanded search ═══ */}
            <div className="absolute top-[max(env(safe-area-inset-top),12px)] left-3 z-[400]">
                {showSearch ? (
                    <div className="glass-strong rounded-2xl shadow-xl border border-border/50 backdrop-blur-md w-[calc(100vw-24px)] max-w-sm animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-2 p-2.5">
                            <Search className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search colleges..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPendingCollege(null); }}
                                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/50"
                            />
                            <button
                                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                                className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 hover:bg-muted"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        {isLoading && (
                            <div className="flex items-center gap-2 px-3 pb-2 text-muted-foreground text-xs">
                                <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => setShowSearch(true)}
                        className="w-10 h-10 bg-card text-foreground rounded-full shadow-xl flex items-center justify-center hover:bg-muted border border-border/50 transition-all active:scale-90"
                        title="Search"
                    >
                        <Search className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* ═══ Layer switch (right side, above nav controls) ═══ */}
            <div className="absolute right-3 z-[400]" style={{ bottom: pendingCollege ? '190px' : '36px' }}>
                <div className="relative">
                    <button
                        onClick={() => setShowLayersMenu(!showLayersMenu)}
                        className="w-10 h-10 bg-card text-foreground rounded-full shadow-xl flex items-center justify-center hover:bg-muted border border-border/50 transition-all active:scale-90"
                    >
                        <Layers className="w-4 h-4" />
                    </button>
                    {showLayersMenu && (
                        <div className="absolute bottom-0 right-12 w-40 bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden py-1 animate-in slide-in-from-right-2 duration-200">
                            {layerOptions.map(layer => (
                                <button
                                    key={layer.id}
                                    onClick={() => { setActiveLayer(layer.id); setShowLayersMenu(false); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left ${activeLayer === layer.id ? 'bg-primary/20 text-primary font-bold' : 'text-foreground hover:bg-muted/50'}`}
                                >
                                    <span>{layer.icon}</span>
                                    {layer.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Bottom Confirmation Card ═══ */}
            {pendingCollege && (
                <div className="absolute bottom-0 left-0 right-0 z-[500] safe-bottom animate-in slide-in-from-bottom-8 duration-300">
                    <div className="mx-3 mb-3">
                        <div className="bg-card/98 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="p-4 pb-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 border border-primary/20">
                                        <span className="text-2xl">🏫</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-heading font-bold text-foreground text-base leading-tight">
                                            {pendingCollege.short_name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                                            {pendingCollege.name}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            {pendingCollege.address && (
                                                <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 min-w-0">
                                                    <MapPin className="w-3 h-3 shrink-0" />
                                                    <span className="truncate">{pendingCollege.address}</span>
                                                </p>
                                            )}
                                            {pendingDist !== null && (
                                                <p className="text-[10px] text-primary font-bold flex items-center gap-0.5 shrink-0">
                                                    <Navigation className="w-3 h-3" />
                                                    {fmtDist(pendingDist)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-0 border-t border-border/40">
                                <button
                                    onClick={() => setPendingCollege(null)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-secondary-foreground font-medium text-sm hover:bg-secondary/50 transition-colors active:bg-secondary/80 border-r border-border/40"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-primary font-bold text-sm hover:bg-primary/10 transition-colors active:bg-primary/20"
                                >
                                    <Check className="w-4 h-4" />
                                    Select Campus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampusSelectionMap;
