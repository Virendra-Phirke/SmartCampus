import { motion } from 'framer-motion';
import { buildings, categoryIcons, type CampusBuilding } from '@/data/campusData';

interface QuickAccessProps {
  onSelect: (building: CampusBuilding) => void;
}

const quickItems = buildings.filter((b) =>
  ['canteen', 'library', 'admin-block', 'auditorium', 'sports-complex'].includes(b.id)
);

const QuickAccess = ({ onSelect }: QuickAccessProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {quickItems.map((b, i) => (
        <motion.button
          key={b.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => onSelect(b)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80  border border-border/30 shrink-0 text-xs font-medium text-secondary-foreground active:scale-95 transition-transform"
        >
          <span className="text-sm">{categoryIcons[b.category]}</span>
          <span className="whitespace-nowrap">{b.shortName}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default QuickAccess;
