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
import type { CampusBuilding } from '@/data/campusData';
import type { College } from '@/lib/types';
import { MapPin, LogOut, Plus, X, Check, Crosshair, Ruler, Flame, Navigation2, ChevronDown, Layers } from 'lucide-react';
import CampusWizard from '@/components/CampusWizard';
import { useProfile } from '@/hooks/useProfile';
import { useColleges } from '@/hooks/useColleges';
import { ENGINEERING_DEPARTMENTS, STUDENT_YEARS, CLASS_SECTIONS, STAFF_TYPES } from '@/lib/collegeData';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

const LAYER_OPTIONS = [
  { key: 'dark', label: 'Dark', emoji: '🌑' },
  { key: 'street', label: 'Street', emoji: '🗺️' },
  { key: 'satellite', label: 'Satellite', emoji: '🛰️' },
  { key: 'outdoor', label: 'Outdoor', emoji: '🌲' },
];

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'academic', label: '🏫 Academic' },
  { key: 'admin', label: '🏛️ Admin' },
  { key: 'facility', label: '🏢 Facility' },
  { key: 'sports', label: '⚽ Sports' },
  { key: 'hostel', label: '🏠 Hostel' },
];

const ROLE_OPTIONS = [
  { value: 'student', label: '🎓 Student', desc: 'Attend classes, scan QR' },
  { value: 'faculty', label: '👨‍🏫 Teacher', desc: 'Create attendance, manage classes' },
];

const Index = () => {
  const location = useLocation();
  const { user } = useUser();
  const { profile, isLoading: profileLoading, upsertProfile } = useProfile();
  const { data: colleges } = useColleges();
  const [selectedCampus, setSelectedCampus] = useState<College | null>(null);
  const [activeTab, setActiveTab] = useState('map');
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<CampusBuilding | null>(null);

  // Map feature states
  const [activeLayer, setActiveLayer] = useState('dark');
  const [showLayerDropdown, setShowLayerDropdown] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Flag to allow switching campus (bypass auto-load)
  const [manualSwitch, setManualSwitch] = useState(false);

  // Onboarding states
  const [onboardingStep, setOnboardingStep] = useState<'none' | 'role' | 'college' | 'profile'>('none');
  const [selectedRole, setSelectedRole] = useState('student');
  const [onboardForm, setOnboardForm] = useState({
    full_name: '',
    mobile_no: '',
    address: '',
    role_id: '',
    course_id: '',
    department_id: '',
    year: '',
    section: '',
    staff_type: '',
  });

  // Add location
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<CampusBuilding | null>(null);
  const mapCenterRef = useRef<[number, number]>([0, 0]);

  // ── Support deep link tab selection: /?tab=attendance ──
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['map', 'attendance', 'events', 'profile', 'admin'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  // ── Auto-load college from profile (unless user manually switched) ──
  useEffect(() => {
    if (manualSwitch) return;
    if (profile?.college_id && colleges && !selectedCampus) {
      const saved = colleges.find((c: College) => c.id === profile.college_id);
      if (saved) setSelectedCampus(saved);
    }
  }, [profile?.college_id, colleges, selectedCampus, manualSwitch]);

  // ── Check if onboarding needed ──
  useEffect(() => {
    if (profileLoading) return;

    if (!profile?.role) {
      setOnboardingStep('role');
      return;
    }

    if (!profile?.college_id) {
      setOnboardingStep('college');
      return;
    }

    if (!profile?.full_name) {
      setOnboardingStep('profile');
      return;
    }

    setOnboardingStep('none');
  }, [profileLoading, profile?.role, profile?.college_id, profile?.full_name]);

  useEffect(() => {
    if (profile?.role === 'student' || profile?.role === 'faculty') {
      setSelectedRole(profile.role);
    }
  }, [profile?.role]);

  // ── GPS tracking ──
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setUserAccuracy(pos.coords.accuracy);
        if (pos.coords.heading != null) setUserHeading(pos.coords.heading);
      },
      () => { },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Save college on first selection ──
  const handleSelectCampus = useCallback(async (college: College) => {
    setSelectedCampus(college);
    setManualSwitch(false);
    try {
      await upsertProfile.mutateAsync({ college_id: college.id });
      if (onboardingStep === 'college') {
        setOnboardingStep(profile?.full_name ? 'none' : 'profile');
      }
    } catch {
      toast.error('Failed to save selected college');
    }
  }, [upsertProfile, onboardingStep, profile?.full_name]);

  // ── Switch campus handler ──
  const handleSwitchCampus = () => {
    setManualSwitch(true);
    setSelectedCampus(null);
    setOnboardingStep('college');
  };

  // ── Onboarding: save role ──
  const handleRoleSave = async () => {
    try {
      await upsertProfile.mutateAsync({ role: selectedRole as any });
      setOnboardingStep('college');
    } catch {
      toast.error('Failed to save role');
    }
  };

  // ── Onboarding: save full profile ──
  const handleProfileSave = async () => {
    if (!onboardForm.full_name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    try {
      await upsertProfile.mutateAsync({
        full_name: onboardForm.full_name,
        mobile_no: onboardForm.mobile_no,
        address: onboardForm.address,
        role_id: onboardForm.role_id,
        course_id: onboardForm.course_id,
        department_id: onboardForm.department_id,
        year: onboardForm.year,
        section: onboardForm.section,
        staff_type: onboardForm.staff_type,
        role: selectedRole as any,
      });
      setOnboardingStep('none');
      toast.success('Profile saved! Welcome to CampusMate');
    } catch {
      toast.error('Failed to save profile');
    }
  };

  const handleSelectBuilding = (building: CampusBuilding) => {
    setSelectedBuilding(building);
    setActiveTab('map');
  };

  const handleNavigate = useCallback((building: CampusBuilding) => {
    setNavigatingTo(building);
    setSelectedBuilding(null);
  }, []);

  const cancelAddLocation = () => {
    setIsAddingLocation(false);
    setShowBuildingForm(false);
    setEditingBuilding(null);
  };

  const firstName = user?.firstName || 'Explorer';
  const fmtDist = (m: number) => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;

  // ── Campus Selection Screen ──
  if (onboardingStep === 'college') {
    return (
      <div className="h-full w-full relative">
        <CampusSelectionMap onSelectCampus={handleSelectCampus} userLocation={userLocation} />
        <div className="absolute top-[max(env(safe-area-inset-top),10px)] left-1/2 -translate-x-1/2 z-[500]">
          <div className="bg-card/90 backdrop-blur border border-border/50 rounded-full px-3 py-1.5 text-[11px] font-semibold">
            Select your college to continue
          </div>
        </div>
      </div>
    );
  }

  if (!selectedCampus) {
    return (
      <div className="h-full w-full">
        <CampusSelectionMap onSelectCampus={handleSelectCampus} userLocation={userLocation} />
      </div>
    );
  }

  // ── Onboarding: Role Selection ──
  if (onboardingStep === 'role') {
    return (
      <div className="h-full flex flex-col bg-background px-5 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-primary/20">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-heading font-bold">Welcome!</h1>
            <p className="text-sm text-muted-foreground mt-1">Select your role to set up your account</p>
          </div>
          <div className="space-y-2.5 mb-6">
            {ROLE_OPTIONS.map(r => (
              <button
                key={r.value}
                onClick={() => setSelectedRole(r.value)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${selectedRole === r.value ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}
              >
                <span className="text-2xl">{r.label.split(' ')[0]}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{r.label.split(' ').slice(1).join(' ')}</p>
                  <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                </div>
                {selectedRole === r.value && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <button onClick={handleRoleSave} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg active:scale-[0.98]">
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Onboarding: Profile Fill ──
  if (onboardingStep === 'profile') {
    return (
      <div className="h-full flex flex-col bg-background px-5 pt-[max(env(safe-area-inset-top),16px)] pb-8 overflow-y-auto">
        <div className="max-w-sm mx-auto w-full">
          <div className="text-center mb-5">
            <h1 className="text-xl font-heading font-bold">Complete Your Profile</h1>
            <p className="text-xs text-muted-foreground mt-1">This info helps with attendance & campus services</p>
          </div>
          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">Full Name *</label>
              <input
                value={onboardForm.full_name}
                onChange={(e) => setOnboardForm({ ...onboardForm, full_name: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                placeholder="Your full name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">Mobile</label>
                <input
                  value={onboardForm.mobile_no}
                  onChange={(e) => setOnboardForm({ ...onboardForm, mobile_no: e.target.value })}
                  type="tel"
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  {selectedRole === 'student' ? 'Roll No.' : 'Employee ID'}
                </label>
                <input
                  value={onboardForm.role_id}
                  onChange={(e) => setOnboardForm({ ...onboardForm, role_id: e.target.value })}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1"
                  placeholder={selectedRole === 'student' ? 'Roll number' : 'Emp ID'}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">Address</label>
              <input
                value={onboardForm.address}
                onChange={(e) => setOnboardForm({ ...onboardForm, address: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1"
                placeholder="Your address"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                {selectedRole === 'student' ? 'Course / Branch' : 'Department'}
              </label>
              <select
                title={selectedRole === 'student' ? 'Course or department' : 'Department'}
                value={selectedRole === 'student' ? onboardForm.course_id : onboardForm.department_id}
                onChange={(e) => {
                  if (selectedRole === 'student') setOnboardForm({ ...onboardForm, course_id: e.target.value });
                  else setOnboardForm({ ...onboardForm, department_id: e.target.value });
                }}
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1"
              >
                <option value="">Select...</option>
                {ENGINEERING_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Role Specific Selectors */}
            {selectedRole === 'student' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">Year</label>
                  <select
                    title="Year"
                    value={onboardForm.year}
                    onChange={(e) => setOnboardForm({ ...onboardForm, year: e.target.value })}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1"
                  >
                    <option value="">Select...</option>
                    {STUDENT_YEARS.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">Section</label>
                  <select
                    title="Section"
                    value={onboardForm.section}
                    onChange={(e) => setOnboardForm({ ...onboardForm, section: e.target.value })}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1"
                  >
                    <option value="">Select...</option>
                    {CLASS_SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                </div>
              </div>
            )}
            
            {(selectedRole === 'faculty' || selectedRole === 'staff' || selectedRole === 'admin') && (
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">Staff Category</label>
                <select
                  title="Staff category"
                    value={onboardForm.staff_type}
                    onChange={(e) => setOnboardForm({ ...onboardForm, staff_type: e.target.value })}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1"
                >
                    <option value="">Select...</option>
                    <optgroup label="Teaching Staff">
                        {STAFF_TYPES.filter(s => s.type === 'teaching').map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </optgroup>
                    <optgroup label="Non-Teaching Staff">
                        {STAFF_TYPES.filter(s => s.type === 'non-teaching').map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </optgroup>
                    <optgroup label="Admin">
                        {STAFF_TYPES.filter(s => s.type === 'admin').map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </optgroup>
                </select>
              </div>
            )}

          </div>
          <button
            onClick={handleProfileSave}
            disabled={!onboardForm.full_name.trim()}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg active:scale-[0.98] mt-6 disabled:opacity-50"
          >
            Save & Enter Campus 🚀
          </button>
          <button onClick={() => setOnboardingStep('role')} className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground">
            ← Back to role selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {activeTab === 'map' ? (
        <>
          {/* Map */}
          <div className="absolute inset-0 z-0">
            <CampusMap
              campus={selectedCampus}
              selectedBuilding={selectedBuilding}
              onSelectBuilding={setSelectedBuilding}
              userLocation={userLocation}
              userAccuracy={userAccuracy}
              userHeading={userHeading}
              navigatingTo={navigatingTo}
              isAddingLocation={isAddingLocation}
              onCenterChange={(center) => { mapCenterRef.current = center; }}
              activeLayer={activeLayer}
              isFollowing={isFollowing}
              showHeatMap={showHeatMap}
              measureMode={measureMode}
              onMeasureDistance={(d) => setMeasuredDistance(d)}
              activeFilter={activeFilter === 'all' ? null : activeFilter}
              recenterTrigger={recenterTrigger}
            />
          </div>

          {/* ─── Top Bar ─── */}
          <div className="relative z-20 pointer-events-none">
            <div className="pointer-events-auto bg-gradient-to-b from-background via-background/80 to-transparent pb-3 px-3 pt-[max(env(safe-area-inset-top),8px)]">
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="font-heading font-bold text-foreground text-xs leading-tight">{selectedCampus.short_name}</h1>
                    <button onClick={handleSwitchCampus} className="text-[9px] text-primary hover:underline leading-tight flex items-center gap-0.5">
                      <LogOut className="w-2.5 h-2.5" /> Switch
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <SearchBar onSelect={handleSelectBuilding} />
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex items-center justify-center border border-border/50 shrink-0"
                  >
                    {user?.imageUrl ? (
                      <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-medium text-secondary-foreground">{firstName.charAt(0)}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* ─── Breadcrumb Row: Filter + Layer ─── */}
              <div className="mt-2 flex items-center gap-2">
                {/* Filter dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowLayerDropdown(false); }}
                    className="flex items-center gap-1 bg-card/80 backdrop-blur border border-border/50 rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm"
                  >
                    {FILTER_OPTIONS.find(f => f.key === activeFilter)?.label || 'All'}
                    <ChevronDown className={`w-3 h-3 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showFilterDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl p-1 z-50 min-w-[120px]">
                      {FILTER_OPTIONS.map(f => (
                        <button key={f.key} onClick={() => { setActiveFilter(f.key); setShowFilterDropdown(false); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${activeFilter === f.key ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted'}`}
                        >{f.label}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Layer dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setShowLayerDropdown(!showLayerDropdown); setShowFilterDropdown(false); }}
                    className="flex items-center gap-1 bg-card/80 backdrop-blur border border-border/50 rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm"
                  >
                    <Layers className="w-3 h-3" />
                    {LAYER_OPTIONS.find(l => l.key === activeLayer)?.emoji} {LAYER_OPTIONS.find(l => l.key === activeLayer)?.label}
                    <ChevronDown className={`w-3 h-3 transition-transform ${showLayerDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showLayerDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl p-1 z-50 min-w-[130px]">
                      {LAYER_OPTIONS.map(l => (
                        <button key={l.key} onClick={() => { setActiveLayer(l.key); setShowLayerDropdown(false); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-2 ${activeLayer === l.key ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted'}`}
                        ><span>{l.emoji}</span> {l.label}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick toggles */}
                <button
                  onClick={() => { setMeasureMode(!measureMode); setMeasuredDistance(null); }}
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium border shadow-sm transition-all ${measureMode ? 'bg-accent/15 text-accent border-accent/30' : 'bg-card/80 border-border/50 text-foreground'}`}
                >
                  <Ruler className="w-3 h-3" /> Ruler
                </button>
                <button
                  onClick={() => setShowHeatMap(!showHeatMap)}
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium border shadow-sm transition-all ${showHeatMap ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'bg-card/80 border-border/50 text-foreground'}`}
                >
                  <Flame className="w-3 h-3" /> Heat
                </button>
              </div>
            </div>
          </div>

          {/* ─── Measure Distance ─── */}
          {measureMode && measuredDistance != null && (
            <div className="absolute top-[max(env(safe-area-inset-top),8px)] left-1/2 -translate-x-1/2 z-40 bg-accent/90 text-accent-foreground px-4 py-1.5 rounded-full font-bold text-xs shadow-lg mt-1">
              📏 {fmtDist(measuredDistance)}
            </div>
          )}

          {/* ─── GPS Location Pill (bottom-left) ─── */}
          {userLocation && (
            <div className="absolute bottom-24 left-3 z-30 pointer-events-auto">
              <div className="flex items-center gap-1.5 bg-card/90 backdrop-blur border border-border/50 rounded-full px-2.5 py-1 shadow-lg">
                <Navigation2 className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-mono text-foreground/80">
                  {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                </span>
                {userAccuracy && <span className="text-[8px] text-muted-foreground">±{Math.round(userAccuracy)}m</span>}
              </div>
            </div>
          )}

          {/* ─── Bottom-right: GPS above + button ─── */}
          {!selectedBuilding && !navigatingTo && !isAddingLocation && (
            <div className="absolute bottom-24 right-3 z-[400] flex flex-col gap-2 items-center">
              <button
                onClick={() => {
                  if (!userLocation) {
                    toast.info('Waiting for your GPS location...');
                    return;
                  }
                  setIsFollowing(true);
                  setRecenterTrigger((v) => v + 1);
                }}
                title="Center on my location"
                className={`w-10 h-10 bg-card/90 backdrop-blur border border-border/50 rounded-full flex items-center justify-center shadow-lg ${isFollowing ? 'ring-2 ring-primary' : ''}`}
              >
                <Crosshair className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={() => setIsAddingLocation(true)}
                title="Add location"
                className="w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform border-2 border-primary/20"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Add Mode */}
          {isAddingLocation && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-3">
              <button onClick={cancelAddLocation} className="bg-background text-foreground px-4 py-2.5 rounded-full shadow-xl font-medium border border-border flex items-center gap-1.5 text-sm">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={() => setShowBuildingForm(true)} className="bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-xl font-semibold flex items-center gap-1.5 text-sm border-2 border-primary/20">
                <Check className="w-4 h-4" /> Set Location
              </button>
            </div>
          )}

          {/* Bottom sheet */}
          <BottomSheet
            building={selectedBuilding}
            onClose={() => setSelectedBuilding(null)}
            onNavigate={handleNavigate}
            userLocation={userLocation}
            onEdit={(b) => { setEditingBuilding(b); setShowBuildingForm(true); setSelectedBuilding(null); }}
          />

          {showBuildingForm && (
            <CampusWizard
              initialLocation={{ lat: mapCenterRef.current[0] || selectedCampus.lat, lng: mapCenterRef.current[1] || selectedCampus.lng }}
              onClose={() => { cancelAddLocation(); setEditingBuilding(null); }}
            />
          )}
        </>
      ) : (
        <div className="flex-1 pt-[max(env(safe-area-inset-top),8px)] overflow-y-auto">
          {activeTab === 'attendance' && <Attendance />}
          {activeTab === 'events' && <Events />}
          {activeTab === 'admin' && profile?.role === 'admin' && <AdminPanel />}
          {activeTab === 'profile' && <Profile />}
        </div>
      )}

      <BottomNav active={activeTab} onNavigate={setActiveTab} isAdmin={profile?.role === 'admin'} />
    </div>
  );
};

export default Index;
