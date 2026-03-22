import { motion, AnimatePresence } from 'framer-motion';
import { X, Car, Bike, Bus, Footprints, Navigation, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { CampusBuilding } from '@/data/campusData';

interface NavigationSheetProps {
 building: CampusBuilding | null;
 onClose: () => void;
 onStartNavigation: (mode: string) => void;
 userLocation?: [number, number] | null;
}

const calculateDistance = (
 lat1: number, lng1: number,
 lat2: number, lng2: number
): number => {
 const R = 6371000;
 const rad = Math.PI / 180;
 const dLat = (lat2 - lat1) * rad;
 const dLng = (lng2 - lng1) * rad;
 const a =
 Math.sin(dLat / 2) ** 2 +
 Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
 return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const TRANSPORT_MODES = [
 { id: 'car', icon: Car, label: 'Car', speedKmh: 30 },
 { id: 'bike', icon: Bike, label: 'Bike', speedKmh: 15 },
 { id: 'bus', icon: Bus, label: 'Bus', speedKmh: 20 },
 { id: 'walk', icon: Footprints, label: 'Walk', speedKmh: 4.8 },
];

const NavigationSheet = ({ building, onClose, onStartNavigation, userLocation }: NavigationSheetProps) => {
 const [selectedMode, setSelectedMode] = useState('walk');

 const distanceMeters = building && userLocation ? calculateDistance(userLocation[0], userLocation[1], building.lat, building.lng) : null;
 
 const getETA = (modeId: string) => {
 if (!distanceMeters) return '--';
 const mode = TRANSPORT_MODES.find(m => m.id === modeId);
 if (!mode) return '--';
 
 // Time = Distance / Speed
 const hours = (distanceMeters / 1000) / mode.speedKmh;
 const minutes = Math.ceil(hours * 60);
 
 if (minutes < 1) return '1 min';
 if (minutes > 59) {
 const h = Math.floor(minutes / 60);
 const m = minutes % 60;
 return `${h}h ${m}m`;
 }
 return `${minutes} min`;
 };

 const formattedDistance = distanceMeters !== null 
 ? (distanceMeters < 1000 ? `${Math.round(distanceMeters)} m` : `${(distanceMeters / 1000).toFixed(1)} km`)
 : '--';

 return (
 <AnimatePresence>
 {building && (
 <motion.div
 initial={{ y: '100%' }}
 animate={{ y: 0 }}
 exit={{ y: '100%' }}
 transition={{ type: 'spring', damping: 28, stiffness: 300 }}
 className="fixed bottom-0 left-0 right-0 z-[1100] bg-card/95 border-t border-border/50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-3xl pb-safe"
 >
 {/* Drag handle */}
 <div className="flex justify-center pt-3 pb-1">
 <div className="w-12 h-1.5 rounded-full bg-border" />
 </div>

 <div className="px-5 pb-6 pt-2">
 {/* Header */}
 <div className="flex items-start justify-between mb-4">
 <div>
 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Navigate To</h3>
 <h2 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
 <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
 <MapPin className="w-4 h-4 text-primary" />
 </span>
 <span className="line-clamp-1">{building.name}</span>
 </h2>
 </div>
 <button onClick={onClose} className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors shrink-0">
 <X className="w-5 h-5 text-muted-foreground" />
 </button>
 </div>

 {/* Transport Mode Selector */}
 <div className="flex items-center justify-between gap-2 mb-6 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
 {TRANSPORT_MODES.map((mode) => {
 const isActive = selectedMode === mode.id;
 return (
 <button
 key={mode.id}
 onClick={() => setSelectedMode(mode.id)}
 className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all ${
 isActive 
 ? 'bg-primary shadow-lg shadow-primary/25 scale-[1.02]' 
 : 'hover:bg-muted/50 text-muted-foreground'
 }`}
 >
 <mode.icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : ''}`} />
 <span className={`text-[10px] font-bold ${isActive ? 'text-primary-foreground' : ''}`}>{getETA(mode.id)}</span>
 </button>
 );
 })}
 </div>

 {/* Metrics */}
 <div className="flex items-center justify-between mb-6 px-2">
 <div>
 <p className="text-[11px] text-muted-foreground font-medium mb-0.5">ESTIMATED TIME</p>
 <p className="text-3xl font-heading font-bold text-foreground">
 {getETA(selectedMode)}
 </p>
 </div>
 <div className="text-right">
 <p className="text-[11px] text-muted-foreground font-medium mb-0.5">DISTANCE</p>
 <p className="text-xl font-heading font-bold text-foreground">
 {formattedDistance}
 </p>
 </div>
 </div>

 {/* Actions */}
 <div className="flex flex-col gap-3">
 <button
 onClick={() => onStartNavigation(selectedMode)}
 className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-blue-500 text-primary-foreground font-heading font-bold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
 >
 <Navigation className="w-5 h-5 fill-current" />
 Start Navigation
 </button>
 <button
 onClick={onClose}
 className="w-full py-3.5 rounded-xl bg-muted text-foreground font-semibold text-sm transition-colors hover:bg-muted/80 border border-border/50"
 >
 Cancel
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 );
};

export default NavigationSheet;
