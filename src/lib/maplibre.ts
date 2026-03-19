import maplibregl from 'maplibre-gl/dist/maplibre-gl-csp';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker?url';

if (typeof window !== 'undefined') {
  const m = maplibregl as unknown as { setWorkerUrl?: (value: string) => void };
  if (typeof m.setWorkerUrl === 'function') {
    m.setWorkerUrl(maplibreWorkerUrl);
  }
}

export default maplibregl;
