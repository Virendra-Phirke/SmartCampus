import { Map, QrCode, Bell, User } from 'lucide-react';

interface BottomNavProps {
  active: string;
  onNavigate: (tab: string) => void;
}

const tabs = [
  { id: 'map', icon: Map, label: 'Explore' },
  { id: 'attendance', icon: QrCode, label: 'Attendance' },
  { id: 'events', icon: Bell, label: 'Events' },
  { id: 'profile', icon: User, label: 'Profile' },
];

const BottomNav = ({ active, onNavigate }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[999] bg-background/95 backdrop-blur-xl border-t border-border/60 safe-bottom">
      <div className="flex items-center justify-around py-1.5">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-5 rounded-2xl transition-all ${
                isActive ? 'bg-primary/10' : ''
              }`}
            >
              <tab.icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
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
