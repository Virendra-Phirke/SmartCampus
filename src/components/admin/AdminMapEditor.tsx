import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useBuildings } from '@/hooks/useBuildings';
import { Upload, Map as MapIcon, Loader2, Save, MousePointerClick, GitMerge } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminMapEditor() {
 const { data: buildings } = useBuildings();
 const [selectedBuilding, setSelectedBuilding] = useState<string>('');
 const [floor, setFloor] = useState<number>(0);
 const [svgUrl, setSvgUrl] = useState<string>('');
 const [uploading, setUploading] = useState(false);
 
 // Tools: 'none' | 'add_node' | 'add_edge'
 const [tool, setTool] = useState<'none' | 'add_node' | 'add_edge'>('none');

 const handleUploadSvg = async (e: React.ChangeEvent<HTMLInputElement>) => {
 if (!e.target.files || e.target.files.length === 0) return;
 if (!selectedBuilding) {
 toast.error('Select a building first');
 return;
 }

 const file = e.target.files[0];
 setUploading(true);
 try {
 const fileName = `${selectedBuilding}_${floor}.svg`;
 const { data, error } = await supabase.storage
 .from('floorplans')
 .upload(fileName, file, { upsert: true });

 if (error) throw error;

 const url = supabase.storage.from('floorplans').getPublicUrl(fileName).data.publicUrl;
 setSvgUrl(url + '?t=' + Date.now()); // force cache break
 toast.success('SVG uploaded successfully!');
 } catch (err: any) {
 toast.error(err.message || 'Failed to upload SVG');
 } finally {
 setUploading(false);
 }
 };

 return (
 <div className="h-full flex flex-col pt-4">
 <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
 <MapIcon className="w-5 h-5 text-primary" /> Map Editor
 </h2>

 {/* Controls */}
 <div className="bg-card border border-border rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
 <div>
 <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Building</label>
 <select 
 value={selectedBuilding}
 onChange={(e) => setSelectedBuilding(e.target.value)}
 className="w-full bg-secondary border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 >
 <option value="">Select Building...</option>
 {buildings?.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Floor</label>
 <input 
 type="number" 
 value={floor} 
 onChange={(e) => setFloor(Number(e.target.value))}
 className="w-full bg-secondary border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 />
 </div>
 <div className="md:col-span-2">
 <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Upload SVG Target</label>
 <div className="relative">
 <input 
 type="file" 
 accept=".svg" 
 onChange={handleUploadSvg}
 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:pointer-events-none"
 disabled={uploading || !selectedBuilding}
 />
 <div className={`w-full bg-secondary border border-border/50 border-dashed rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2 ${uploading ? 'opacity-50' : ''}`}>
 {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
 {uploading ? 'Uploading...' : 'Click or drag SVG here'}
 </div>
 </div>
 </div>
 </div>

 {/* Editing Tools */}
 {svgUrl && (
 <div className="flex items-center gap-2 mb-4 bg-muted/30 p-2 rounded-xl">
 <button 
 onClick={() => setTool('none')}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tool === 'none' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary'}`}
 >
 <MousePointerClick className="w-4 h-4" /> Pan / Select
 </button>
 <button 
 onClick={() => setTool('add_node')}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tool === 'add_node' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary'}`}
 >
 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6" /></svg>
 Add Node
 </button>
 <button 
 onClick={() => setTool('add_edge')}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tool === 'add_edge' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary'}`}
 >
 <GitMerge className="w-4 h-4" /> Add Path
 </button>
 
 <button className="ml-auto flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors">
 <Save className="w-4 h-4" /> Save Graph
 </button>
 </div>
 )}

 {/* Canvas */}
 <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden relative flex items-center justify-center isolate">
 {!svgUrl ? (
 <div className="text-center text-muted-foreground">
 <MapIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
 <p>Select a building and upload an SVG to start editing.</p>
 </div>
 ) : (
 <div className="w-full h-full relative" style={{ cursor: tool === 'none' ? 'default' : 'crosshair' }}>
 <div className="absolute top-4 left-4 z-10 bg-background/80 border border-border/50 px-3 py-2 rounded-lg text-xs font-mono shadow-sm">
 Map loaded: {fileName(svgUrl)}
 </div>
 <img 
 src={svgUrl} 
 alt="Floor Plan" 
 className="w-full h-full object-contain pointer-events-none opacity-50"
 />
 {/* Overlay SVG for drawing will go here */}
 </div>
 )}
 </div>
 </div>
 );
}

function fileName(url: string) {
 try {
 const u = new URL(url);
 const parts = u.pathname.split('/');
 return parts[parts.length - 1];
 } catch {
 return 'map.svg';
 }
}
