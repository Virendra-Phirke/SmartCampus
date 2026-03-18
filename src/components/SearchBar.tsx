import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildings, categoryIcons, type CampusBuilding } from '@/data/campusData';

interface SearchBarProps {
  onSelect: (building: CampusBuilding) => void;
}

const SearchBar = ({ onSelect }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return buildings
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.shortName.toLowerCase().includes(q) ||
          b.category.includes(q) ||
          b.departments?.some((d) => d.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [query]);

  const showResults = isFocused && query.trim().length > 0;

  return (
    <div className="relative w-full">
      <div className="bg-secondary/90 backdrop-blur-lg rounded-2xl flex items-center gap-3 px-4 py-3 border border-border/40 shadow-lg shadow-black/20">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search buildings, labs, rooms..."
          className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground font-body text-sm"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 w-full bg-card/98 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-border/50 z-50"
          >
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                No locations found
              </div>
            ) : (
              results.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => {
                    onSelect(b);
                    setQuery('');
                    setIsFocused(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 active:bg-secondary/80 transition-colors text-left ${
                    i < results.length - 1 ? 'border-b border-border/30' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-base">{categoryIcons[b.category]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{b.category} · {b.floors} {b.floors === 1 ? 'floor' : 'floors'}</p>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
