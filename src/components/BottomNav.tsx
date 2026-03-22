import { Map, QrCode, Bell, User, ShieldCheck } from 'lucide-react';

interface BottomNavProps {
  active: string;
  onNavigate: (tab: string) => void;
  isAdmin?: boolean;
}

const tabs = [
  { id: 'map', icon: Map, label: 'Map' },
  { id: 'attendance', icon: QrCode, label: 'Attend' },
  { id: 'events', icon: Bell, label: 'Events' },
  { id: 'admin', icon: ShieldCheck, label: 'Admin' },
  { id: 'profile', icon: User, label: 'Profile' },
];

const BottomNav = ({ active, onNavigate, isAdmin = false }: BottomNavProps) => {
  const visibleTabs = isAdmin
    ? tabs.filter(tab => tab.id === 'attendance' || tab.id === 'events' || tab.id === 'admin')
    : tabs.filter(tab => tab.id !== 'admin');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[999] bg-background/95  border-t border-border/40 safe-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {visibleTabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`relative flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl transition-all active:scale-95 ${isActive ? 'bg-primary/10' : ''}`}
            >
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
              )}
              <tab.icon
                className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
