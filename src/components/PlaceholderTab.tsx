import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';

interface PlaceholderTabProps {
  title: string;
  description: string;
}

const PlaceholderTab = ({ title, description }: PlaceholderTabProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center h-full px-8 text-center"
  >
    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
      <Construction className="w-8 h-8 text-primary" />
    </div>
    <h2 className="font-heading font-semibold text-xl text-foreground mb-2">{title}</h2>
    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{description}</p>
  </motion.div>
);

export default PlaceholderTab;
