import { motion } from 'framer-motion';
import { buildings, categoryIcons, type CampusBuilding } from '@/data/campusData';

interface QuickAccessProps {
  onSelect: (building: CampusBuilding) => void;
}

const quickItems = buildings.filter((b) =>
  ['canteen', 'library', 'admin-block', 'auditorium'].includes(b.id)
);

const QuickAccess = ({ onSelect }: QuickAccessProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-1">
      {quickItems.map((b, i) => (
        <motion.button
          key={b.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(b)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl glass shrink-0 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
        >
          <span>{categoryIcons[b.category]}</span>
          <span className="whitespace-nowrap">{b.shortName}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default QuickAccess;
