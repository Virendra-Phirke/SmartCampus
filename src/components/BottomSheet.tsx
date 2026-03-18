import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Building2, Layers } from 'lucide-react';
import { categoryIcons, type CampusBuilding } from '@/data/campusData';

interface BottomSheetProps {
  building: CampusBuilding | null;
  onClose: () => void;
}

const BottomSheet = ({ building, onClose }: BottomSheetProps) => {
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
            <div className="flex items-start justify-between mb-4">
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
              <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {building.description}
            </p>

            {/* Info chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              {building.floors && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                  <Layers className="w-3.5 h-3.5" />
                  {building.floors} {building.floors === 1 ? 'Floor' : 'Floors'}
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

            {/* Navigate button */}
            <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-heading font-semibold text-sm glow-primary transition-all active:scale-[0.98]">
              <MapPin className="w-4 h-4" />
              Navigate Here
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
