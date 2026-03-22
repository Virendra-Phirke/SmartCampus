import { AnimatePresence, motion } from "framer-motion";
import { X, Layers, Building2, Flame, Ruler, MapPin } from "lucide-react";

export interface MapLayerOption {
 key: string;
 label: string;
 emoji: string;
}

export interface MapFilterOption {
 key: string;
 label: string;
}

interface MapOptionsSheetProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 layerOptions: MapLayerOption[];
 activeLayer: string;
 onLayerChange: (key: string) => void;
 filterOptions: MapFilterOption[];
 activeFilter: string;
 onFilterChange: (key: string) => void;
 showHeatMap: boolean;
 onShowHeatMap: (v: boolean) => void;
 measureMode: boolean;
 onMeasureMode: (v: boolean) => void;
 onCenterCampus?: () => void;
}

/**
 * Google Maps–style bottom sheet: map type, building filters, and tools (Android-friendly).
 */
const MapOptionsSheet = ({
 open,
 onOpenChange,
 layerOptions,
 activeLayer,
 onLayerChange,
 filterOptions,
 activeFilter,
 onFilterChange,
 showHeatMap,
 onShowHeatMap,
 measureMode,
 onMeasureMode,
 onCenterCampus,
}: MapOptionsSheetProps) => {
 return (
 <AnimatePresence>
 {open && (
 <>
 <motion.button
 type="button"
 aria-label="Close map options"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[1100] bg-foreground/20"
 onClick={() => onOpenChange(false)}
 />
 <motion.div
 role="dialog"
 aria-label="Map type and layers"
 initial={{ y: "100%" }}
 animate={{ y: 0 }}
 exit={{ y: "100%" }}
 transition={{ type: "spring", damping: 32, stiffness: 380 }}
 className="fixed bottom-0 left-0 right-0 z-[1101] bg-card border-t border-border rounded-t-3xl shadow-[0_-12px_48px_hsl(var(--foreground)/0.08)] dark:shadow-[0_-12px_48px_rgba(0,0,0,0.45)] safe-bottom max-h-[min(78vh,520px)] flex flex-col"
 >
 <div className="flex justify-center pt-3 pb-2 shrink-0">
 <div className="w-10 h-1 rounded-full bg-muted-foreground/35" />
 </div>
 <div className="flex items-center justify-between px-5 pb-3 border-b border-border/40 shrink-0">
 <div className="flex items-center gap-2">
 <div className="w-9 h-9 rounded-2xl bg-primary/15 flex items-center justify-center">
 <Layers className="w-4 h-4 text-primary" />
 </div>
 <div>
 <h2 className="font-heading font-semibold text-base text-foreground leading-tight">Map & layers</h2>
 <p className="text-[11px] text-muted-foreground">Map type, places, tools</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => onOpenChange(false)}
 className="p-2.5 rounded-full bg-secondary hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
 title="Close"
 >
 <X className="w-5 h-5 text-muted-foreground" />
 </button>
 </div>

 <div className="overflow-y-auto px-5 py-4 space-y-6 no-scrollbar flex-1">
 <section>
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Map type</p>
 <div className="grid grid-cols-2 gap-2.5">
 {layerOptions.map((l) => {
 const on = activeLayer === l.key;
 return (
 <button
 key={l.key}
 type="button"
 onClick={() => {
 onLayerChange(l.key);
 }}
 className={`flex items-center gap-2.5 rounded-2xl border-2 px-3 py-3 text-left min-h-[52px] transition-all active:scale-[0.98] ${
 on
 ? "border-primary bg-primary/10 shadow-sm"
 : "border-border/60 bg-secondary/40 hover:border-border"
 }`}
 >
 <span className="text-xl shrink-0" aria-hidden>
 {l.emoji}
 </span>
 <span className={`text-sm font-semibold ${on ? "text-primary" : "text-foreground"}`}>{l.label}</span>
 </button>
 );
 })}
 </div>
 </section>

 <section>
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
 <Building2 className="w-3.5 h-3.5" />
 Building filters
 </p>
 <div className="flex flex-wrap gap-2">
 {filterOptions.map((f) => {
 const on = activeFilter === f.key;
 return (
 <button
 key={f.key}
 type="button"
 onClick={() => onFilterChange(f.key)}
 className={`rounded-full px-3.5 py-2 text-xs font-medium min-h-[40px] border transition-colors ${
 on
 ? "bg-primary text-primary-foreground border-primary shadow-sm"
 : "bg-secondary/60 text-secondary-foreground border-border/50"
 }`}
 >
 {f.label}
 </button>
 );
 })}
 </div>
 </section>

 <section>
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Tools</p>
 <div className="grid grid-cols-2 gap-2.5">
 <button
 type="button"
 onClick={() => onShowHeatMap(!showHeatMap)}
 className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3.5 text-sm font-semibold min-h-[52px] transition-all ${
 showHeatMap
 ? "border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400"
 : "border-border/60 bg-secondary/30 text-foreground"
 }`}
 >
 <Flame className="w-4 h-4 shrink-0" />
 Heat map
 </button>
 <button
 type="button"
 onClick={() => {
 onMeasureMode(!measureMode);
 }}
 className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3.5 text-sm font-semibold min-h-[52px] transition-all ${
 measureMode
 ? "border-accent bg-accent/15 text-accent"
 : "border-border/60 bg-secondary/30 text-foreground"
 }`}
 >
 <Ruler className="w-4 h-4 shrink-0" />
 Measure
 </button>
 </div>
 </section>

 {onCenterCampus && (
 <button
 type="button"
 onClick={() => {
 onCenterCampus();
 onOpenChange(false);
 }}
 className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-secondary/30 py-3.5 text-sm font-semibold text-foreground min-h-[52px] active:scale-[0.99] transition-transform"
 >
 <MapPin className="w-4 h-4 text-primary shrink-0" />
 Center map on campus
 </button>
 )}
 </div>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 );
};

export default MapOptionsSheet;
