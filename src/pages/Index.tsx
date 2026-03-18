import { useState, useEffect } from 'react';
import CampusMap from '@/components/CampusMap';
import SearchBar from '@/components/SearchBar';
import BottomSheet from '@/components/BottomSheet';
import BottomNav from '@/components/BottomNav';
import QuickAccess from '@/components/QuickAccess';
import PlaceholderTab from '@/components/PlaceholderTab';
import type { CampusBuilding } from '@/data/campusData';
import { MapPin } from 'lucide-react';

const Index = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  const handleSelectBuilding = (building: CampusBuilding) => {
    setSelectedBuilding(building);
    setActiveTab('map');
  };

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {activeTab === 'map' ? (
        <>
          {/* Map layer - behind everything */}
          <div className="absolute inset-0 z-0">
            <CampusMap
              selectedBuilding={selectedBuilding}
              onSelectBuilding={setSelectedBuilding}
              userLocation={userLocation}
            />
          </div>

          {/* Top overlay - header + search + quick access */}
          <div className="relative z-20 pointer-events-none">
            <div className="pointer-events-auto bg-gradient-to-b from-background via-background/90 to-transparent pb-8 px-4 pt-[max(env(safe-area-inset-top),12px)]">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center glow-primary">
                    <MapPin className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="font-heading font-bold text-foreground text-sm leading-tight">CampusMate</h1>
                    <p className="text-[10px] text-muted-foreground leading-tight">P R Pote College</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-xs font-medium text-secondary-foreground">👤</span>
                </div>
              </div>

              {/* Search */}
              <SearchBar onSelect={handleSelectBuilding} />

              {/* Quick access */}
              <div className="mt-3">
                <QuickAccess onSelect={handleSelectBuilding} />
              </div>
            </div>
          </div>

          {/* Bottom sheet */}
          <BottomSheet building={selectedBuilding} onClose={() => setSelectedBuilding(null)} />
        </>
      ) : (
        <div className="flex-1 pt-[max(env(safe-area-inset-top),12px)] pb-20">
          {activeTab === 'attendance' && (
            <PlaceholderTab
              title="QR Attendance"
              description="Scan QR codes to mark your attendance digitally. Coming soon!"
            />
          )}
          {activeTab === 'events' && (
            <PlaceholderTab
              title="Events & Alerts"
              description="Stay updated with campus events and real-time notifications. Coming soon!"
            />
          )}
          {activeTab === 'profile' && (
            <PlaceholderTab
              title="Your Profile"
              description="Sign in to access your schedule, attendance history, and personalized navigation."
            />
          )}
        </div>
      )}

      {/* Bottom navigation - always on top */}
      <BottomNav active={activeTab} onNavigate={setActiveTab} />
    </div>
  );
};

export default Index;
