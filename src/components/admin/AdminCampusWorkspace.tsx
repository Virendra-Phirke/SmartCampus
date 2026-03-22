import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Check, ChevronDown, Crosshair, Flame, Layers, Navigation2, Plus, Ruler, Trash2 } from 'lucide-react';
import CampusMap from '@/components/CampusMap';
import BottomSheet from '@/components/BottomSheet';
import NavigationSheet from '@/components/NavigationSheet';
import CampusWizard from '@/components/CampusWizard';
import SearchBar from '@/components/SearchBar';
import { useColleges } from '@/hooks/useColleges';
import { useBuildings, useDeleteBuilding, useUpdateBuilding, toBuildingLegacy } from '@/hooks/useBuildings';
import type { CampusBuilding } from '@/data/campusData';
import type { College } from '@/lib/types';
import { useAppDialog } from '@/hooks/useAppDialog';
import { toast } from 'sonner';

const LAYER_OPTIONS = [
  { key: 'dark', label: 'Dark', emoji: '🌑' },
  { key: 'street', label: 'Street', emoji: '🗺️' },
  { key: 'satellite', label: 'Satellite', emoji: '🛰️' },
  { key: 'outdoor', label: 'Light', emoji: '☀️' },
];

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'academic', label: '🏫 Academic' },
  { key: 'admin', label: '🏛️ Admin' },
  { key: 'facility', label: '🏢 Facility' },
  { key: 'sports', label: '⚽ Sports' },
  { key: 'hostel', label: '🏠 Hostel' },
];

export default function AdminCampusWorkspace() {
  const navigate = useNavigate();
  const { campusId } = useParams();
  const { confirm } = useAppDialog();
  const { data: colleges = [] } = useColleges();
  const { data: supabaseBuildings = [] } = useBuildings();
  const deleteBuilding = useDeleteBuilding();
  const updateBuilding = useUpdateBuilding();

  const selectedCampus = useMemo<College | null>(() => {
    if (!campusId) return null;
    return colleges.find((c) => c.id === campusId) || null;
  }, [colleges, campusId]);

  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<CampusBuilding | null>(null);
  const [navigationMode, setNavigationMode] = useState<'car' | 'bike' | 'bus' | 'walk'>('walk');
  const [showNavMenuFor, setShowNavMenuFor] = useState<CampusBuilding | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [activeLayer, setActiveLayer] = useState('dark');
  const [showLayerDropdown, setShowLayerDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [showCampusTrigger, setShowCampusTrigger] = useState(0);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<any | null>(null);
  const mapCenterRef = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    if (!selectedCampus && colleges.length > 0 && campusId) {
      toast.error('Campus not found');
      navigate('/?tab=admin', { replace: true });
    }
  }, [selectedCampus, colleges, campusId, navigate]);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setUserAccuracy(Math.round(pos.coords.accuracy));
        if (pos.coords.heading != null) setUserHeading(pos.coords.heading);
      },
      () => {
        // silent fail
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const buildingsList = useMemo<CampusBuilding[]>(() => {
    if (!selectedCampus) return [];
    return (supabaseBuildings || [])
      .filter((b: any) => b.college_id === selectedCampus.id)
      .map(toBuildingLegacy);
  }, [supabaseBuildings, selectedCampus]);

  const availableCategories = useMemo(() => new Set(buildingsList.map((b) => b.category)), [buildingsList]);

  const handleDeleteBuilding = useCallback(async (building: CampusBuilding) => {
    const ok = await confirm({
      title: 'Delete location?',
      description: `Delete ${building.name}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteBuilding.mutateAsync(building.id);
      setSelectedBuilding(null);
      toast.success('Building deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete building');
    }
  }, [confirm, deleteBuilding]);

  const handleSaveBuildingEdit = async () => {
    if (!editingBuilding) return;
    try {
      await updateBuilding.mutateAsync({
        id: editingBuilding.id,
        updates: {
          name: editingBuilding.name,
          short_name: editingBuilding.shortName,
          category: editingBuilding.category,
          description: editingBuilding.description,
          floors: editingBuilding.floors,
        } as any,
      });
      toast.success('Building updated');
      setEditingBuilding(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update building');
    }
  };

  if (!selectedCampus) {
    return <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading campus...</div>;
  }

  const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`);

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <CampusMap
          campus={selectedCampus}
          selectedBuilding={selectedBuilding}
          onSelectBuilding={setSelectedBuilding}
          userLocation={userLocation}
          userAccuracy={userAccuracy}
          userHeading={userHeading}
          navigatingTo={navigatingTo}
          navigationMode={navigationMode}
          onCancelNavigation={() => setNavigatingTo(null)}
          isAddingLocation={isAddingLocation}
          onCenterChange={(center) => { mapCenterRef.current = center; }}
          activeLayer={activeLayer}
          isFollowing={false}
          showHeatMap={showHeatMap}
          measureMode={measureMode}
          onMeasureDistance={setMeasuredDistance}
          activeFilter={activeFilter === 'all' ? null : activeFilter}
          recenterTrigger={recenterTrigger}
          showCampusTrigger={showCampusTrigger}
        />
      </div>

      <div className="relative z-[520] pointer-events-none">
        <div className="pointer-events-auto bg-gradient-to-b from-background via-background/80 to-transparent pb-3 px-3 pt-[max(env(safe-area-inset-top),8px)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => navigate('/?tab=admin')}
                className="w-8 h-8 rounded-lg bg-card/90 border border-border/50 flex items-center justify-center"
                title="Back to admin"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h1 className="font-heading font-bold text-foreground text-xs leading-tight truncate">{selectedCampus.short_name}</h1>
                <p className="text-[10px] text-muted-foreground truncate">Admin Campus Workspace</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SearchBar onSelect={setSelectedBuilding} />
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowLayerDropdown(false); }} className="flex items-center gap-1 bg-card/80 border border-border/50 rounded-full px-2.5 py-1 text-[11px] font-medium">
                {FILTER_OPTIONS.find((f) => f.key === activeFilter)?.label || 'All'}
                <ChevronDown className={`w-3 h-3 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showFilterDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border/70 rounded-xl shadow-2xl p-1 z-[620] min-w-[120px]">
                  {FILTER_OPTIONS.filter((f) => f.key === 'all' || availableCategories.has(f.key as any)).map((f) => (
                    <button key={f.key} onClick={() => { setActiveFilter(f.key); setShowFilterDropdown(false); }} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${activeFilter === f.key ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => { setShowLayerDropdown(!showLayerDropdown); setShowFilterDropdown(false); }} className="flex items-center gap-1 bg-card/80 border border-border/50 rounded-full px-2.5 py-1 text-[11px] font-medium">
                <Layers className="w-3 h-3" />
                {LAYER_OPTIONS.find((l) => l.key === activeLayer)?.emoji} {LAYER_OPTIONS.find((l) => l.key === activeLayer)?.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${showLayerDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLayerDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border/70 rounded-xl shadow-2xl p-1 z-[620] min-w-[130px]">
                  {LAYER_OPTIONS.map((l) => (
                    <button key={l.key} onClick={() => { setActiveLayer(l.key); setShowLayerDropdown(false); }} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-2 ${activeLayer === l.key ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted'}`}>
                      <span>{l.emoji}</span> {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => { setMeasureMode(!measureMode); setMeasuredDistance(null); }} className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium border ${measureMode ? 'bg-accent/15 text-accent border-accent/30' : 'bg-card/80 border-border/50 text-foreground'}`}>
              <Ruler className="w-3 h-3" /> Ruler
            </button>
            <button onClick={() => setShowHeatMap(!showHeatMap)} className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium border ${showHeatMap ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'bg-card/80 border-border/50 text-foreground'}`}>
              <Flame className="w-3 h-3" /> Heat
            </button>
          </div>
        </div>
      </div>

      {measureMode && measuredDistance != null && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-accent/90 text-accent-foreground px-4 py-1.5 rounded-full font-bold text-xs shadow-lg">
          📏 {fmtDist(measuredDistance)}
        </div>
      )}

      <div className="absolute bottom-8 right-3 z-[400] flex flex-col gap-2 items-center">
        <button onClick={() => setShowCampusTrigger((v) => v + 1)} title="Show Full Campus" className="w-10 h-10 bg-card/90 border border-border/50 rounded-full flex items-center justify-center shadow-lg">🎓</button>
        <button onClick={() => setRecenterTrigger((v) => v + 1)} title="Center on my location" className="w-10 h-10 bg-card/90 border border-border/50 rounded-full flex items-center justify-center shadow-lg">
          <Crosshair className="w-4 h-4" />
        </button>
        {!isAddingLocation && (
          <button onClick={() => setIsAddingLocation(true)} title="Add location" className="w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center border-2 border-primary/20">
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {isAddingLocation && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-3">
          <button onClick={() => { setIsAddingLocation(false); setShowBuildingForm(false); }} className="bg-card text-foreground px-5 py-3 rounded-full shadow-lg font-medium border border-border text-sm">Cancel</button>
          <button onClick={() => setShowBuildingForm(true)} className="bg-teal-500 text-white px-6 py-2.5 rounded-[30px] shadow-lg shadow-teal-500/30 flex items-center gap-2">
            <Check className="w-4 h-4" /> Set Location
          </button>
        </div>
      )}

      <BottomSheet
        building={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
        onNavigate={(b) => { setShowNavMenuFor(b); setSelectedBuilding(null); }}
        userLocation={userLocation}
        onEdit={(b) => setEditingBuilding({ ...b })}
        onDelete={handleDeleteBuilding}
        canDelete={true}
        navigatingTo={navigatingTo}
        onCancelNavigation={() => setNavigatingTo(null)}
      />

      {showNavMenuFor && (
        <NavigationSheet
          building={showNavMenuFor}
          userLocation={userLocation}
          onClose={() => setShowNavMenuFor(null)}
          onStartNavigation={(mode) => {
            setNavigationMode((mode as 'car' | 'bike' | 'bus' | 'walk') || 'walk');
            setNavigatingTo(showNavMenuFor);
            setShowNavMenuFor(null);
          }}
        />
      )}

      {showBuildingForm && (
        <CampusWizard
          campusId={selectedCampus.id}
          initialLocation={{ lat: mapCenterRef.current[0] || selectedCampus.lat, lng: mapCenterRef.current[1] || selectedCampus.lng }}
          onClose={() => { setShowBuildingForm(false); setIsAddingLocation(false); }}
        />
      )}

      {editingBuilding && (
        <div className="fixed inset-0 z-[1300] bg-background/80 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-3 space-y-2">
            <h3 className="text-sm font-semibold">Edit Building</h3>
            <input value={editingBuilding.name || ''} onChange={(e) => setEditingBuilding((p: any) => ({ ...p, name: e.target.value }))} placeholder="Name" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" />
            <input value={editingBuilding.shortName || ''} onChange={(e) => setEditingBuilding((p: any) => ({ ...p, shortName: e.target.value }))} placeholder="Short Name" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" />
            <select title="Building category" value={editingBuilding.category || 'academic'} onChange={(e) => setEditingBuilding((p: any) => ({ ...p, category: e.target.value }))} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm">
              <option value="academic">Academic</option>
              <option value="admin">Admin</option>
              <option value="facility">Facility</option>
              <option value="sports">Sports</option>
              <option value="hostel">Hostel</option>
            </select>
            <input type="number" value={editingBuilding.floors || 1} onChange={(e) => setEditingBuilding((p: any) => ({ ...p, floors: Number(e.target.value) }))} placeholder="Floors" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" />
            <textarea rows={3} value={editingBuilding.description || ''} onChange={(e) => setEditingBuilding((p: any) => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm resize-none" />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => setEditingBuilding(null)} className="py-2.5 rounded-xl bg-muted text-muted-foreground text-sm">Cancel</button>
              <button onClick={handleSaveBuildingEdit} className="py-2.5 rounded-xl bg-primary text-primary-foreground text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
