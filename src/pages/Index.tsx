import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import CampusMap from '@/components/CampusMap';
import CampusSelectionMap from '@/components/CampusSelectionMap';
import SearchBar from '@/components/SearchBar';
import BottomSheet from '@/components/BottomSheet';
import BottomNav from '@/components/BottomNav';
import QuickAccess from '@/components/QuickAccess';
import Attendance from '@/pages/Attendance';
import Events from '@/pages/Events';
import Profile from '@/pages/Profile';
import AdminPanel from '@/pages/AdminPanel';
import type { CampusBuilding, Campus } from '@/data/campusData';
import { MapPin, LogOut, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CampusWizard from '@/components/CampusWizard';
import { useProfile } from '@/hooks/useProfile';

const Index = () => {
  const { user } = useUser();
  const { profile } = useProfile();
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null);
  const [activeTab, setActiveTab] = useState('map');
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<CampusBuilding | null>(null);

  // Add/Edit Location State
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<CampusBuilding | null>(null);
  const mapCenterRef = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => { },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const handleSelectBuilding = (building: CampusBuilding) => {
    setSelectedBuilding(building);
    setActiveTab('map');
  };

  const handleNavigate = useCallback((building: CampusBuilding) => {
    setNavigatingTo(building);
    setSelectedBuilding(null);
  }, []);

  const handleSetLocation = () => {
    setShowBuildingForm(true);
  };

  const cancelAddLocation = () => {
    setIsAddingLocation(false);
    setShowBuildingForm(false);
    setEditingBuilding(null);
  };

  const firstName = user?.firstName || 'Explorer';

  if (!selectedCampus) {
    return (
      <div className="h-full w-full">
        <CampusSelectionMap onSelectCampus={setSelectedCampus} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {activeTab === 'map' ? (
        <>
          {/* Map layer */}
          <div className="absolute inset-0 z-0">
            <CampusMap
              campus={selectedCampus}
              selectedBuilding={selectedBuilding}
              onSelectBuilding={setSelectedBuilding}
              userLocation={userLocation}
              navigatingTo={navigatingTo}
              isAddingLocation={isAddingLocation}
              onCenterChange={(center) => { mapCenterRef.current = center; }}
            />
          </div>

          {/* Top overlay */}
          <div className="relative z-20 pointer-events-none">
            <div className="pointer-events-auto bg-gradient-to-b from-background via-background/90 to-transparent pb-8 px-4 pt-[max(env(safe-area-inset-top),12px)]">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center glow-primary">
                    <MapPin className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="font-heading font-bold text-foreground text-sm leading-tight">{selectedCampus.shortName}</h1>
                    <button onClick={() => setSelectedCampus(null)} className="text-[10px] text-primary hover:underline leading-tight flex items-center gap-1 mt-0.5">
                      <LogOut className="w-3 h-3" /> Change Campus
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex items-center justify-center border border-border/50"
                  aria-label="Profile"
                >
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium text-secondary-foreground">
                      {firstName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
              </div>

              {/* Search */}
              <SearchBar onSelect={handleSelectBuilding} />

              {/* Quick access */}
              <div className="mt-3">
                <QuickAccess onSelect={handleSelectBuilding} />
              </div>
            </div>
          </div>

          {/* Floating Action Buttons for Add Location */}
          {!selectedBuilding && !navigatingTo && !isAddingLocation && (
            <div className="absolute bottom-24 right-4 z-[400]">
              <button
                onClick={() => setIsAddingLocation(true)}
                className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex items-center justify-center hover:scale-105 transition-transform active:scale-95 border-2 border-primary/20"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* Add Mode Controls */}
          {isAddingLocation && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-3">
              <button
                onClick={cancelAddLocation}
                className="bg-background text-foreground px-5 py-3 rounded-full shadow-xl font-medium border border-border flex items-center gap-2 hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" /> Cancel
              </button>
              <button
                onClick={handleSetLocation}
                className="bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-xl font-semibold border-2 border-primary/20 flex items-center gap-2 glow-primary animate-pulse-glow"
              >
                <Check className="w-5 h-5" /> Set Location
              </button>
            </div>
          )}

          {/* Bottom sheet */}
          <BottomSheet
            building={selectedBuilding}
            onClose={() => setSelectedBuilding(null)}
            onNavigate={handleNavigate}
            userLocation={userLocation}
            onEdit={(b) => {
              setEditingBuilding(b);
              setShowBuildingForm(true);
              setSelectedBuilding(null);
            }}
          />

          {/* Location Form Dialog */}
          {showBuildingForm && (
            <CampusWizard
              initialLocation={{
                lat: mapCenterRef.current[0] || selectedCampus.lat,
                lng: mapCenterRef.current[1] || selectedCampus.lng
              }}
              onClose={() => {
                cancelAddLocation();
                setEditingBuilding(null);
              }}
            />
          )}
        </>
      ) : (
        <div className="flex-1 pt-[max(env(safe-area-inset-top),12px)] pb-20 overflow-hidden">
          {activeTab === 'attendance' && <Attendance />}
          {activeTab === 'events' && <Events />}
          {activeTab === 'admin' && profile?.role === 'admin' && <AdminPanel />}
          {activeTab === 'profile' && <Profile />}
        </div>
      )}

      {/* Bottom navigation */}
      <BottomNav active={activeTab} onNavigate={setActiveTab} isAdmin={profile?.role === 'admin'} />
    </div>
  );
};

export default Index;
