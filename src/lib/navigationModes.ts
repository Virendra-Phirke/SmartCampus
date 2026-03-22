/** How the user chose to travel (drives OSRM profile + UI). */
export type TransportMode = 'bus' | 'bike' | 'car' | 'walk';

export const TRANSPORT_ORDER: TransportMode[] = ['bus', 'bike', 'car', 'walk'];

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
 const R = 6371000;
 const toRad = (v: number) => (v * Math.PI) / 180;
 const dLat = toRad(lat2 - lat1);
 const dLng = toRad(lng2 - lng1);
 const a =
 Math.sin(dLat / 2) * Math.sin(dLat / 2) +
 Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
 return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatRouteDistance(meters: number): string {
 return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function formatDurationMinutes(totalMin: number): string {
 if (totalMin < 60) return `${totalMin} min`;
 const h = Math.floor(totalMin / 60);
 const m = totalMin % 60;
 return m ? `${h}h ${m}m` : `${h}h`;
}

/** Rough ETA from straight-line distance (same model as map banner). */
export function etaForMode(mode: TransportMode, meters: number): string {
 const min =
 mode === 'walk'
 ? Math.ceil(meters / 80)
 : mode === 'bike'
 ? Math.ceil(meters / 200)
 : mode === 'bus'
 ? Math.ceil(meters / 150)
 : Math.ceil(meters / 250);
 return formatDurationMinutes(min);
}

/** OSRM public endpoint profile segment (bus uses driving geometry). */
export function osrmProfile(mode: TransportMode): 'foot' | 'bike' | 'driving' {
 if (mode === 'walk') return 'foot';
 if (mode === 'bike') return 'bike';
 return 'driving';
}

export const TRANSPORT_META: Record<
 TransportMode,
 { label: string; emoji: string; description: string }
> = {
 bus: { label: 'Bus', emoji: '🚌', description: 'Public transit pace' },
 bike: { label: 'Bike', emoji: '🚲', description: 'Cycle-friendly route' },
 car: { label: 'Car', emoji: '🚗', description: 'Driving roads' },
 walk: { label: 'Walk', emoji: '🚶', description: 'Pedestrian paths' },
};
