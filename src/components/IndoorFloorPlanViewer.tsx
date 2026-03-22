import { useState, useEffect, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Loader2 } from 'lucide-react';
import type { RouteResult } from '@/lib/pathfinding';

interface IndoorFloorPlanViewerProps {
 svgUrl: string;
 route?: RouteResult | null;
 startNodeId?: string;
 endNodeId?: string;
}

export default function IndoorFloorPlanViewer({ svgUrl, route, startNodeId, endNodeId }: IndoorFloorPlanViewerProps) {
 const [svgContent, setSvgContent] = useState<string>('');
 const [viewBox, setViewBox] = useState<string>('0 0 1000 1000');
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 if (!svgUrl) return;
 setLoading(true);
 fetch(svgUrl)
 .then(res => res.text())
 .then(text => {
 // Extract viewBox using regex
 const vbMatch = text.match(/viewBox="([^"]+)"/);
 if (vbMatch && vbMatch[1]) {
 setViewBox(vbMatch[1]);
 }
 
 // Strip out width and height to force it to fill container via CSS
 let cleanedSvg = text
 .replace(/width="[^"]+"/, '')
 .replace(/height="[^"]+"/, '');
 
 setSvgContent(cleanedSvg);
 })
 .catch(err => {
 console.error('Failed to load SVG floor plan:', err);
 })
 .finally(() => setLoading(false));
 }, [svgUrl]);

 // Build the SVG path string from route waypoints
 const pathD = useMemo(() => {
 if (!route || route.waypoints.length === 0) return '';
 const pts = route.waypoints.map(w => `${w.x},${w.y}`);
 return `M ${pts.join(' L ')}`;
 }, [route]);

 if (!svgUrl) {
 return <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 text-muted-foreground pb-10">No floor plan available.</div>;
 }

 return (
 <div className="w-full h-full relative bg-background/95 overflow-hidden">
 {loading && (
 <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 ">
 <Loader2 className="w-8 h-8 text-primary animate-spin" />
 </div>
 )}
 
 <TransformWrapper
 initialScale={1}
 minScale={0.5}
 maxScale={5}
 centerOnInit={true}
 wheel={{ step: 0.1 }}
 >
 {({ zoomIn, zoomOut, resetTransform }) => (
 <>
 <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
 <button onClick={() => zoomIn()} className="w-10 h-10 bg-card/90 text-card-foreground border border-border/50 rounded-full shadow-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all text-lg font-bold">
 +
 </button>
 <button onClick={() => zoomOut()} className="w-10 h-10 bg-card/90 text-card-foreground border border-border/50 rounded-full shadow-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all text-lg font-bold">
 -
 </button>
 <button onClick={() => resetTransform()} className="w-10 h-10 bg-card/90 text-card-foreground border border-border/50 rounded-full shadow-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all">
 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
 </button>
 </div>

 <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
 <div className="relative w-full h-full flex items-center justify-center">
 {/* Floor Plan SVG */}
 {svgContent && (
 <div 
 className="w-full h-full max-w-[800px] max-h-[800px] pointer-events-none opacity-80"
 dangerouslySetInnerHTML={{ __html: svgContent }}
 style={{ filter: 'var(--tw-backdrop-brightness, brightness(0.8))' }}
 />
 )}
 
 {/* Overlay SVG for Routes and Nodes */}
 {svgContent && (
 <svg viewBox={viewBox} className="absolute inset-0 w-full h-full max-w-[800px] max-h-[800px] pointer-events-none z-10 m-auto">
 
 {/* Route Path Line */}
 {pathD && (
 <>
 {/* Outer Glow */}
 <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" filter="blur(4px)" className="animate-pulse" />
 {/* Core Line */}
 <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
 </>
 )}

 {/* Nodes */}
 {route?.waypoints.map((wp, i) => {
 const isStart = i === 0;
 const isEnd = i === route.waypoints.length - 1;
 const color = isStart ? '#4ade80' : isEnd ? '#ef4444' : '#f59e0b';
 const size = isStart || isEnd ? 12 : 6;
 
 return (
 <g key={wp.node_id}>
 {/* Pulse effect for start/end */}
 {(isStart || isEnd) && (
 <circle cx={wp.x} cy={wp.y} r={size * 2} fill={color} opacity="0.3">
 <animate attributeName="r" values={`${size};${size*3};${size}`} dur="2s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
 </circle>
 )}
 <circle 
 cx={wp.x} 
 cy={wp.y} 
 r={size} 
 fill={color} 
 stroke="#ffffff" 
 strokeWidth={isStart || isEnd ? 3 : 2} 
 />
 </g>
 );
 })}
 </svg>
 )}
 </div>
 </TransformComponent>
 </>
 )}
 </TransformWrapper>
 </div>
 );
}
