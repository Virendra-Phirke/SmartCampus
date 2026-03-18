import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Building2, Layers, Navigation, CheckCircle, Clock, Route, PenSquare, LayoutGrid } from 'lucide-react';
import { categoryIcons, type CampusBuilding } from '@/data/campusData';
import { useAttendance } from '@/hooks/useAttendance';
import { toast } from 'sonner';
import { useState } from 'react';
import BuildingDetailsManager from '@/components/BuildingDetailsManager';

interface BottomSheetProps {
  building: CampusBuilding | null;
  onClose: () => void;
  onNavigate?: (building: CampusBuilding) => void;
  userLocation?: [number, number] | null;
  onEdit?: (building: CampusBuilding) => void;
}

const calculateDistance = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 6371000; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const BottomSheet = ({ building, onClose, onNavigate, userLocation, onEdit }: BottomSheetProps) => {
  const { checkIn, isCheckingIn } = useAttendance();
  const [showManager, setShowManager] = useState(false);

  const distance = building && userLocation
    ? calculateDistance(userLocation[0], userLocation[1], building.lat, building.lng)
    : null;

  const walkingTime = distance ? Math.ceil(distance / 80) : null; // ~80m/min walking speed

  const handleCheckIn = async () => {
    if (!building) return;
    try {
      await checkIn({ buildingId: building.id, method: 'manual' });
      toast.success('Checked In!', {
        description: `You've manually checked in at ${building.name}`,
        icon: <CheckCircle className="w-4 h-4" />,
      });
    } catch {
      toast.error('Check-in Failed', {
        description: 'Could not record your attendance.',
      });
    }
  };

  return (
    <AnimatePresence>
      {building && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 glass-strong rounded-t-3xl safe-bottom"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="px-5 pb-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{categoryIcons[building.category]}</span>
                <div>
                  <h2 className="font-heading font-semibold text-lg text-foreground leading-tight">
                    {building.name}
                  </h2>
                  <p className="text-xs text-primary capitalize font-medium mt-0.5">
                    {building.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 -mt-1 -mr-1">
                {onEdit && (
                  <button onClick={() => onEdit(building)} className="p-2 rounded-full hover:bg-secondary transition-colors" title="Edit Location">
                    <PenSquare className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors" title="Close">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {building.description}
            </p>

            {/* Info chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {building.floors && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                  <Layers className="w-3.5 h-3.5" />
                  {building.floors} {building.floors === 1 ? 'Floor' : 'Floors'}
                </div>
              )}
              {distance !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Route className="w-3.5 h-3.5" />
                  {distance < 1000
                    ? `${Math.round(distance)} m`
                    : `${(distance / 1000).toFixed(1)} km`}
                </div>
              )}
              {walkingTime !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {walkingTime} min walk
                </div>
              )}
              {building.departments?.map((d) => (
                <div
                  key={d}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {d}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate?.(building)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-heading font-semibold text-sm transition-all hover:bg-secondary/80"
              >
                <Navigation className="w-4 h-4" />
                Navigate Here
              </button>
              <button
                onClick={() => setShowManager(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-heading font-semibold text-sm glow-primary transition-all active:scale-[0.98]"
              >
                <LayoutGrid className="w-4 h-4 text-primary-foreground/80" />
                Manage Building
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Full Details Manager Modal */}
      {showManager && building && (
        <BuildingDetailsManager
          building={building}
          onClose={() => setShowManager(false)}
        />
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
