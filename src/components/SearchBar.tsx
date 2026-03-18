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
    return buildings.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.shortName.toLowerCase().includes(q) ||
        b.category.includes(q) ||
        b.departments?.some((d) => d.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [query]);

  const showResults = isFocused && query.trim().length > 0;

  return (
    <div className="relative w-full">
      <div className="glass-strong rounded-2xl flex items-center gap-3 px-4 py-3 shadow-lg">
        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Where do you want to go?"
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
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 w-full glass-strong rounded-2xl overflow-hidden shadow-xl z-50"
          >
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                No locations found. Try a different search.
              </div>
            ) : (
              results.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    onSelect(b);
                    setQuery('');
                    setIsFocused(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                >
                  <span className="text-lg">{categoryIcons[b.category]}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{b.category}</p>
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
