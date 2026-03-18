import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { campuses, type Campus } from '@/data/campusData';
import { Search } from 'lucide-react';

interface CampusSelectionMapProps {
    onSelectCampus: (campus: Campus) => void;
}

const createCampusMarkerIcon = () => {
    return L.divIcon({
        className: '',
        html: `<div style="
      width: 24px;
      height: 24px;
      background: hsl(174, 62%, 47%);
      border: 3px solid hsl(200, 25%, 6%);
      border-radius: 50%;
      box-shadow: 0 0 15px hsl(174, 62%, 47%, 0.6);
      transition: all 0.3s ease;
      animation: pulse-glow 2s ease-in-out infinite;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    ">🏫</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
};

const CampusSelectionMap = ({ onSelectCampus }: CampusSelectionMapProps) => {
    const mapRef = useRef<L.Map | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<Map<string, L.Marker>>(new Map());
    const [searchQuery, setSearchQuery] = useState('');

    // Initialize map
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        // Center map roughly on Amravati for these colleges
        const map = L.map(containerRef.current, {
            center: [20.9400, 77.7550],
            zoom: 12,
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

        // Add dark layer by default
        darkLayer.addTo(map);

        const baseMaps = {
            "Dark Theme View": darkLayer,
            "Satellite View": satelliteLayer
        };

        L.control.layers(baseMaps, undefined, { position: 'bottomright' }).addTo(map);
        L.control.zoom({ position: 'topright' }).addTo(map);

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Update markers based on search query
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current.clear();

        const filteredCampuses = campuses.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.shortName.toLowerCase().includes(searchQuery.toLowerCase())
        );

        filteredCampuses.forEach((campus) => {
            const marker = L.marker([campus.lat, campus.lng], {
                icon: createCampusMarkerIcon(),
            }).addTo(map);

            marker.on('click', () => onSelectCampus(campus));

            marker.bindTooltip(campus.shortName, {
                permanent: true,
                direction: 'bottom',
                className: 'campus-tooltip',
                offset: [0, 12],
            });

            markersRef.current.set(campus.id, marker);
        });

        // Fit bounds if there are markers
        if (filteredCampuses.length > 0) {
            const bounds = L.latLngBounds(filteredCampuses.map(c => [c.lat, c.lng]));
            // Only fit bounds if there's more than 1 or if we are filtering
            if (searchQuery && filteredCampuses.length === 1) {
                map.flyTo([filteredCampuses[0].lat, filteredCampuses[0].lng], 16);
            } else if (searchQuery) {
                map.fitBounds(bounds, { padding: [50, 50] });
            } else {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
            }
        }

    }, [searchQuery, onSelectCampus]);

    return (
        <div className="relative w-full h-full">
            <div ref={containerRef} className="w-full h-full" />
            <div className="absolute top-16 left-4 right-4 z-[400]">
                <div className="glass-strong p-4 rounded-2xl shadow-xl border border-border/50 backdrop-blur-md">
                    <h2 className="text-lg font-heading font-bold text-foreground">Select Your Campus</h2>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">Find and tap your campus to enter the navigation system.</p>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search for a college..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-background border border-border/50 rounded-xl py-2.5 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampusSelectionMap;
