import { useState, useEffect } from 'react';
import CampusMap from '@/components/CampusMap';
import SearchBar from '@/components/SearchBar';
import BottomSheet from '@/components/BottomSheet';
import BottomNav from '@/components/BottomNav';
import QuickAccess from '@/components/QuickAccess';
import PlaceholderTab from '@/components/PlaceholderTab';
import type { CampusBuilding } from '@/data/campusData';

const Index = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {} // silently fail
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
          {/* Map fills full screen */}
          <div className="absolute inset-0">
            <CampusMap
              selectedBuilding={selectedBuilding}
              onSelectBuilding={setSelectedBuilding}
              userLocation={userLocation}
            />
          </div>

          {/* Search overlay */}
          <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-[max(env(safe-area-inset-top),1rem)] space-y-3">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-primary">
                <span className="font-heading font-bold text-primary-foreground text-xs">CM</span>
              </div>
              <h1 className="font-heading font-semibold text-foreground text-base">CampusMate</h1>
            </div>
            <SearchBar onSelect={handleSelectBuilding} />
            <QuickAccess onSelect={handleSelectBuilding} />
          </div>

          {/* Bottom sheet for selected building */}
          <BottomSheet building={selectedBuilding} onClose={() => setSelectedBuilding(null)} />
        </>
      ) : (
        <div className="flex-1 pt-[max(env(safe-area-inset-top),1rem)] pb-20">
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

      {/* Bottom navigation */}
      <BottomNav active={activeTab} onNavigate={setActiveTab} />
    </div>
  );
};

export default Index;
