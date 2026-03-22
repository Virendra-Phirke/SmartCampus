import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, MapPin, Plus, Search, ShieldCheck, Trash2, Navigation, X, Pencil, LocateFixed, BookOpen, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAddCollege, useColleges, useDeleteCollege, useUpdateCollege } from '@/hooks/useColleges';
import { useAppDialog } from '@/hooks/useAppDialog';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import maplibregl from '@/lib/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { isLocalAdminAuthenticated, setLocalAdminCampusId } from '@/lib/adminAuth';
import type { College } from '@/lib/types';
import { useCoursesCrud, useDepartmentsCrud, useStaffCrud, useStudentsCrud } from '@/hooks/useAdminCrud';
import { useBuildings, useDeleteBuilding, useUpdateBuilding } from '@/hooks/useBuildings';
import CampusWizard from '@/components/CampusWizard';

interface AdminPanelProps {
    onCampusSelected?: (campus: College) => void;
}

export default function AdminPanel({ onCampusSelected }: AdminPanelProps) {
    const navigate = useNavigate();
    const { confirm } = useAppDialog();
    const { upsertProfile } = useProfile();
    const { data: colleges = [], isLoading } = useColleges();
    const addCollege = useAddCollege();
    const updateCollege = useUpdateCollege();
    const deleteCollege = useDeleteCollege();
    const departmentsCrud = useDepartmentsCrud();
    const coursesCrud = useCoursesCrud();
    const staffCrud = useStaffCrud();
    const studentsCrud = useStudentsCrud();
    const { data: buildings = [] } = useBuildings();
    const updateBuilding = useUpdateBuilding();
    const deleteBuilding = useDeleteBuilding();
    const mapPickerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const campusPreviewMapRef = useRef<HTMLDivElement | null>(null);
    const campusPreviewMapObjRef = useRef<maplibregl.Map | null>(null);
    const campusPreviewMarkersRef = useRef<maplibregl.Marker[]>([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [showAddCampus, setShowAddCampus] = useState(false);
    const [editingCampusId, setEditingCampusId] = useState<string | null>(null);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [pickerCoords, setPickerCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [isCapturingGps, setIsCapturingGps] = useState(false);
    const [activeCampus, setActiveCampus] = useState<College | null>(null);
    const [showCampusMapPreview, setShowCampusMapPreview] = useState(false);
    const [showCampusBuildingWizard, setShowCampusBuildingWizard] = useState(false);
    const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
    const [buildingDraft, setBuildingDraft] = useState({ name: '', short_name: '', category: 'academic', description: '', floors: '1' });
    const [departmentDraft, setDepartmentDraft] = useState({ id: '', name: '', head_id: '' });
    const [courseDraft, setCourseDraft] = useState({ id: '', name: '', department_id: '', duration_years: '4' });
    const [staffDraft, setStaffDraft] = useState({ name: '', type: 'teaching', role_id: '', department_id: '' });
    const [studentDraft, setStudentDraft] = useState({ name: '', roll_no: '', course_id: '', year: '1' });
    const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: '',
        short_name: '',
        address: '',
        lat: '',
        lng: '',
        zoom: '16',
    });

    const filteredColleges = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const base = colleges
            .slice()
            .sort((a, b) => (a.short_name || a.name).localeCompare(b.short_name || b.name));

        if (!q) return base;
        return base.filter((c) =>
            c.name.toLowerCase().includes(q) ||
            c.short_name.toLowerCase().includes(q) ||
            (c.address || '').toLowerCase().includes(q)
        );
    }, [colleges, searchQuery]);

    const activeCampusBuildings = useMemo(() => {
        if (!activeCampus) return [] as any[];
        return (buildings || [])
            .filter((b: any) => b.college_id === activeCampus.id)
            .sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));
    }, [buildings, activeCampus]);

    const campusPrefix = useMemo(() => {
        if (!activeCampus) return '';
        return (activeCampus.short_name || activeCampus.name || 'CAMPUS')
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }, [activeCampus]);

    const activeCampusDepartments = useMemo(() => {
        const list = departmentsCrud.list.data || [];
        if (!activeCampus || !campusPrefix) return list;
        return list.filter((d) => String(d.id || '').startsWith(`${campusPrefix}_`));
    }, [departmentsCrud.list.data, activeCampus, campusPrefix]);

    const handleSelectCampus = async (campusId: string) => {
        try {
            if (isLocalAdminAuthenticated()) {
                setLocalAdminCampusId(campusId);
            } else {
                await upsertProfile.mutateAsync({ college_id: campusId });
            }

            const selectedCampus = colleges.find((c) => c.id === campusId);
            if (onCampusSelected && selectedCampus) onCampusSelected(selectedCampus);
            navigate(`/admin/campus/${campusId}`);
            toast.success('Campus selected');
        } catch (e: any) {
            toast.error(e?.message || 'Failed to select campus');
        }
    };

    const resetForm = () => {
        setForm({
            name: '',
            short_name: '',
            address: '',
            lat: '',
            lng: '',
            zoom: '16',
        });
        setEditingCampusId(null);
    };

    useEffect(() => {
        if (!showMapPicker || !mapPickerRef.current) return;

        const initialLat = Number(form.lat);
        const initialLng = Number(form.lng);
        const lat = Number.isFinite(initialLat) ? initialLat : 20.5937;
        const lng = Number.isFinite(initialLng) ? initialLng : 78.9629;
        setPickerCoords({ lat, lng });

        const map = new maplibregl.Map({
            container: mapPickerRef.current,
            style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
            center: [lng, lat],
            zoom: 13,
            attributionControl: false,
        });
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

        const marker = new maplibregl.Marker({ color: '#14b8a6' }).setLngLat([lng, lat]).addTo(map);
        markerRef.current = marker;
        mapRef.current = map;

        map.on('click', (e) => {
            const next = { lat: Number(e.lngLat.lat.toFixed(6)), lng: Number(e.lngLat.lng.toFixed(6)) };
            setPickerCoords(next);
            marker.setLngLat([next.lng, next.lat]);
        });

        return () => {
            markerRef.current?.remove();
            markerRef.current = null;
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [showMapPicker, form.lat, form.lng]);

    const handleSaveCampus = async () => {
        const lat = Number(form.lat);
        const lng = Number(form.lng);
        const zoom = Number(form.zoom || '16');

        if (!form.name.trim() || !form.short_name.trim()) {
            toast.error('Campus name and short name are required');
            return;
        }
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            toast.error('Valid latitude and longitude are required');
            return;
        }

        try {
            if (editingCampusId) {
                await updateCollege.mutateAsync({
                    id: editingCampusId,
                    updates: {
                        name: form.name.trim(),
                        short_name: form.short_name.trim(),
                        address: form.address.trim(),
                        lat,
                        lng,
                        zoom: Number.isFinite(zoom) ? zoom : 16,
                    },
                });
            } else {
                await addCollege.mutateAsync({
                    name: form.name.trim(),
                    short_name: form.short_name.trim(),
                    address: form.address.trim(),
                    lat,
                    lng,
                    zoom: Number.isFinite(zoom) ? zoom : 16,
                });
            }
            resetForm();
            setShowAddCampus(false);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save campus');
        }
    };

    const handleEditCampus = (campus: { id: string; name: string; short_name: string; address: string; lat: number; lng: number; zoom: number; }) => {
        setEditingCampusId(campus.id);
        setForm({
            name: campus.name || '',
            short_name: campus.short_name || '',
            address: campus.address || '',
            lat: String(campus.lat ?? ''),
            lng: String(campus.lng ?? ''),
            zoom: String(campus.zoom ?? 16),
        });
        setShowAddCampus(true);
    };

    const useDeviceLocation = async () => {
        if (!('geolocation' in navigator)) {
            toast.error('Geolocation not supported in this browser');
            return;
        }

        if (!window.isSecureContext) {
            toast.error('GPS requires HTTPS/secure context');
            return;
        }

        setIsCapturingGps(true);

        const fillCoords = (pos: GeolocationPosition) => {
            const lat = Number(pos.coords.latitude.toFixed(6));
            const lng = Number(pos.coords.longitude.toFixed(6));
            setForm((p) => ({ ...p, lat: String(lat), lng: String(lng) }));
            toast.success('Latitude and longitude captured from GPS');
            setIsCapturingGps(false);
        };

        const fail = () => {
            setIsCapturingGps(false);
            toast.error('Unable to read GPS location. Allow location permission and try again.');
        };

        try {
            if ('permissions' in navigator && (navigator as any).permissions?.query) {
                const status = await (navigator as any).permissions.query({ name: 'geolocation' });
                if (status.state === 'denied') {
                    setIsCapturingGps(false);
                    toast.error('Location permission is blocked in browser settings');
                    return;
                }
            }
        } catch {
            // continue with direct geolocation call
        }

        navigator.geolocation.getCurrentPosition(fillCoords, fail, {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
        });
    };

    const handleDeleteCampus = async (id: string, name: string) => {
        const ok = await confirm({
            title: 'Delete campus?',
            description: `Delete ${name}? This cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            destructive: true,
        });
        if (!ok) return;

        try {
            await deleteCollege.mutateAsync(id);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to delete campus');
        }
    };

    const slugifyId = (value: string) =>
        value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 40);

    const saveDepartment = async () => {
        if (!departmentDraft.name.trim()) return toast.error('Department name is required');
        try {
            const rawId = (departmentDraft.id || slugifyId(departmentDraft.name)).toUpperCase();
            const id = activeCampus ? `${campusPrefix}_${rawId}` : rawId;
            if (editingDepartmentId) {
                await departmentsCrud.update.mutateAsync({
                    id: editingDepartmentId,
                    updates: { name: departmentDraft.name.trim(), head_id: departmentDraft.head_id.trim() || null },
                });
            } else {
                await departmentsCrud.create.mutateAsync({ id, name: departmentDraft.name.trim(), head_id: departmentDraft.head_id.trim() || null });
            }
            setDepartmentDraft({ id: '', name: '', head_id: '' });
            setEditingDepartmentId(null);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save department');
        }
    };

    const saveBuildingEdit = async () => {
        if (!editingBuildingId) return;
        if (!buildingDraft.name.trim() || !buildingDraft.short_name.trim()) {
            toast.error('Building name and short name are required');
            return;
        }
        try {
            await updateBuilding.mutateAsync({
                id: editingBuildingId,
                updates: {
                    name: buildingDraft.name.trim(),
                    short_name: buildingDraft.short_name.trim(),
                    category: buildingDraft.category as any,
                    description: buildingDraft.description,
                    floors: Number(buildingDraft.floors || '1'),
                },
            });
            setEditingBuildingId(null);
            setBuildingDraft({ name: '', short_name: '', category: 'academic', description: '', floors: '1' });
            toast.success('Building updated');
        } catch (e: any) {
            toast.error(e?.message || 'Failed to update building');
        }
    };

    const deleteCampusBuilding = async (building: any) => {
        const ok = await confirm({
            title: 'Delete building?',
            description: `Delete ${building.name}?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            destructive: true,
        });
        if (!ok) return;
        try {
            await deleteBuilding.mutateAsync(building.id);
            if (editingBuildingId === building.id) {
                setEditingBuildingId(null);
                setBuildingDraft({ name: '', short_name: '', category: 'academic', description: '', floors: '1' });
            }
            toast.success('Building deleted');
        } catch (e: any) {
            toast.error(e?.message || 'Failed to delete building');
        }
    };

    useEffect(() => {
        if (!showCampusMapPreview || !campusPreviewMapRef.current || !activeCampus) return;

        const map = new maplibregl.Map({
            container: campusPreviewMapRef.current,
            style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
            center: [activeCampus.lng, activeCampus.lat],
            zoom: activeCampus.zoom || 15,
            attributionControl: false,
        });
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

        const campusEl = document.createElement('div');
        campusEl.style.cssText = 'width:14px;height:14px;border-radius:999px;background:#14b8a6;border:2px solid #fff;box-shadow:0 0 0 4px rgba(20,184,166,.25);';
        const campusMarker = new maplibregl.Marker({ element: campusEl }).setLngLat([activeCampus.lng, activeCampus.lat]).addTo(map);
        campusPreviewMarkersRef.current.push(campusMarker);

        activeCampusBuildings.forEach((b: any) => {
            const mEl = document.createElement('div');
            mEl.style.cssText = 'width:10px;height:10px;border-radius:999px;background:#3b82f6;border:2px solid #fff;';
            const marker = new maplibregl.Marker({ element: mEl }).setLngLat([b.lng, b.lat]).addTo(map);
            campusPreviewMarkersRef.current.push(marker);
        });

        campusPreviewMapObjRef.current = map;

        return () => {
            campusPreviewMarkersRef.current.forEach((m) => m.remove());
            campusPreviewMarkersRef.current = [];
            campusPreviewMapObjRef.current?.remove();
            campusPreviewMapObjRef.current = null;
        };
    }, [showCampusMapPreview, activeCampus, activeCampusBuildings]);

    const saveCourse = async () => {
        if (!courseDraft.name.trim()) return toast.error('Course name is required');
        try {
            const id = (courseDraft.id || slugifyId(courseDraft.name)).toUpperCase();
            const payload = {
                id,
                name: courseDraft.name.trim(),
                department_id: courseDraft.department_id || null,
                duration_years: Number(courseDraft.duration_years || '4'),
            };
            if (editingCourseId) {
                await coursesCrud.update.mutateAsync({ id: editingCourseId, updates: payload });
            } else {
                await coursesCrud.create.mutateAsync(payload);
            }
            setCourseDraft({ id: '', name: '', department_id: '', duration_years: '4' });
            setEditingCourseId(null);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save course');
        }
    };

    const saveStaff = async () => {
        if (!staffDraft.name.trim() || !staffDraft.role_id.trim()) {
            return toast.error('Staff name and role ID are required');
        }
        try {
            const payload = {
                name: staffDraft.name.trim(),
                type: staffDraft.type,
                role_id: staffDraft.role_id.trim(),
                department_id: staffDraft.department_id || null,
                user_id: null,
            };
            if (editingStaffId) {
                await staffCrud.update.mutateAsync({ id: editingStaffId, updates: payload });
            } else {
                await staffCrud.create.mutateAsync(payload);
            }
            setStaffDraft({ name: '', type: 'teaching', role_id: '', department_id: '' });
            setEditingStaffId(null);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save staff');
        }
    };

    const saveStudent = async () => {
        if (!studentDraft.name.trim() || !studentDraft.roll_no.trim()) {
            return toast.error('Student name and roll number are required');
        }
        try {
            const payload = {
                name: studentDraft.name.trim(),
                roll_no: studentDraft.roll_no.trim(),
                course_id: studentDraft.course_id || null,
                year: studentDraft.year,
                section_id: null,
                user_id: null,
            };
            if (editingStudentId) {
                await studentsCrud.update.mutateAsync({ id: editingStudentId, updates: payload });
            } else {
                await studentsCrud.create.mutateAsync(payload);
            }
            setStudentDraft({ name: '', roll_no: '', course_id: '', year: '1' });
            setEditingStudentId(null);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save student');
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background pb-[env(safe-area-inset-bottom)]">
            <div className="px-4 pt-4 pb-3 bg-card border-b border-border shadow-sm z-10">
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <h1 className="text-lg font-heading font-bold">Admin Control</h1>
                </div>
                <p className="text-muted-foreground text-xs">Manage campuses and open map tools for building management.</p>

                <div className="flex gap-2 mt-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search campuses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddCampus((v) => !v)}
                        className="bg-primary text-primary-foreground px-3 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform"
                        title="Add campus"
                    >
                        {showAddCampus ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => {
                            if (!activeCampus) {
                                toast.info('Open a campus first');
                                return;
                            }
                            setShowCampusMapPreview(true);
                        }}
                        className="bg-secondary text-secondary-foreground px-3 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform"
                        title="Open selected campus map"
                    >
                        <Navigation className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 bg-muted/10 space-y-3 pb-24">
                {showAddCampus && (
                    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm space-y-2">
                        <h3 className="text-sm font-semibold">{editingCampusId ? 'Edit Campus' : 'Add New Campus'}</h3>
                        <div className="grid grid-cols-1 gap-2">
                            <input
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                placeholder="Campus name"
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"
                            />
                            <input
                                value={form.short_name}
                                onChange={(e) => setForm((p) => ({ ...p, short_name: e.target.value }))}
                                placeholder="Short name"
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"
                            />
                            <input
                                value={form.address}
                                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                                placeholder="Address"
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    value={form.lat}
                                    onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
                                    placeholder="Latitude"
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"
                                />
                                <input
                                    value={form.lng}
                                    onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
                                    placeholder="Longitude"
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setShowMapPicker(true)}
                                    className="w-full py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold"
                                >
                                    Pick on Map
                                </button>
                                <button
                                    onClick={useDeviceLocation}
                                    disabled={isCapturingGps}
                                    className="w-full py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold flex items-center justify-center gap-1"
                                >
                                    <LocateFixed className="w-3.5 h-3.5" /> {isCapturingGps ? 'Capturing...' : 'Use GPS'}
                                </button>
                            </div>
                            <input
                                value={form.zoom}
                                onChange={(e) => setForm((p) => ({ ...p, zoom: e.target.value }))}
                                placeholder="Zoom"
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => { resetForm(); setShowAddCampus(false); }}
                                className="w-full py-2.5 rounded-xl bg-muted text-muted-foreground font-semibold text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveCampus}
                                disabled={addCollege.isPending || updateCollege.isPending}
                                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
                            >
                                {editingCampusId ? (updateCollege.isPending ? 'Saving...' : 'Save Campus') : (addCollege.isPending ? 'Adding...' : 'Add Campus')}
                            </button>
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Campus Locations</h3>
                        <span className="text-xs text-muted-foreground">{filteredColleges.length}</span>
                    </div>

                    {isLoading ? (
                        <div className="p-4 text-sm text-muted-foreground">Loading campuses...</div>
                    ) : filteredColleges.length === 0 ? (
                        <div className="p-5 text-center">
                            <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm font-medium">No campuses found</p>
                            <p className="text-xs text-muted-foreground mt-1">Add a campus from the form above.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredColleges.map((campus) => (
                                <div key={campus.id} className="p-3 flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{campus.short_name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{campus.name}</p>
                                        <p className="text-[11px] text-muted-foreground mt-1 truncate">{campus.address || 'No address'}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{campus.lat.toFixed(5)}, {campus.lng.toFixed(5)}</p>
                                        <button
                                            onClick={() => {
                                                handleSelectCampus(campus.id);
                                            }}
                                            className="mt-2 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-semibold"
                                        >
                                            Open Campus Data
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleEditCampus(campus)}
                                        className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"
                                        title="Edit campus"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCampus(campus.id, campus.short_name || campus.name)}
                                        disabled={deleteCollege.isPending}
                                        className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0"
                                        title="Delete campus"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {activeCampus && (
                    <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-semibold">Campus Workspace: {activeCampus.short_name}</h3>
                                <p className="text-xs text-muted-foreground">Manage departments and buildings for this campus.</p>
                            </div>
                            <button
                                onClick={() => setActiveCampus(null)}
                                className="h-8 px-2 rounded-lg bg-muted text-muted-foreground text-xs"
                            >
                                Close
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setShowCampusMapPreview(true)}
                                className="py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold"
                            >
                                Open Campus Map View
                            </button>
                            <button
                                onClick={() => setShowCampusBuildingWizard(true)}
                                className="py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                Add Building
                            </button>
                        </div>

                        <div className="rounded-xl border border-border p-2.5 space-y-2">
                            <p className="text-xs font-semibold flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Campus Departments</p>
                            <div className="grid grid-cols-1 gap-2">
                                <input value={departmentDraft.name} onChange={(e) => setDepartmentDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Department name" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                                <input value={departmentDraft.id} onChange={(e) => setDepartmentDraft((p) => ({ ...p, id: e.target.value }))} placeholder="Department code (optional)" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                            </div>
                            <button onClick={saveDepartment} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">{editingDepartmentId ? 'Save Department' : 'Add Department'}</button>
                            <div className="divide-y divide-border">
                                {activeCampusDepartments.slice(0, 10).map((d) => (
                                    <div key={d.id} className="py-1.5 flex items-center gap-2">
                                        <span className="text-[11px] flex-1 truncate">{d.name}</span>
                                        <button onClick={() => { setEditingDepartmentId(d.id); setDepartmentDraft({ id: d.id.replace(`${campusPrefix}_`, ''), name: d.name, head_id: d.head_id || '' }); }} className="text-primary text-[11px]">Edit</button>
                                        <button onClick={async () => { const ok = await confirm({ title: 'Delete department?', description: d.name, confirmText: 'Delete', cancelText: 'Cancel', destructive: true }); if (ok) departmentsCrud.remove.mutate(d.id); }} className="text-destructive text-[11px]">Delete</button>
                                    </div>
                                ))}
                                {activeCampusDepartments.length === 0 && <p className="text-[11px] text-muted-foreground py-2">No departments for this campus yet.</p>}
                            </div>
                        </div>

                        <div className="rounded-xl border border-border p-2.5 space-y-2">
                            <p className="text-xs font-semibold flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Campus Buildings</p>
                            {activeCampusBuildings.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground">No buildings in this campus yet.</p>
                            ) : (
                                <div className="divide-y divide-border">
                                    {activeCampusBuildings.map((b: any) => (
                                        <div key={b.id} className="py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] flex-1 truncate">{b.name}</span>
                                                <button
                                                    onClick={() => {
                                                        setEditingBuildingId(b.id);
                                                        setBuildingDraft({
                                                            name: b.name || '',
                                                            short_name: b.short_name || '',
                                                            category: b.category || 'academic',
                                                            description: b.description || '',
                                                            floors: String(b.floors || 1),
                                                        });
                                                    }}
                                                    className="text-primary text-[11px]"
                                                >
                                                    Edit
                                                </button>
                                                <button onClick={() => deleteCampusBuilding(b)} className="text-destructive text-[11px]">Delete</button>
                                            </div>

                                            {editingBuildingId === b.id && (
                                                <div className="mt-2 grid grid-cols-1 gap-2">
                                                    <input value={buildingDraft.name} onChange={(e) => setBuildingDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Building name" className="w-full bg-muted/50 border border-border rounded-lg px-2 py-1.5 text-xs" />
                                                    <input value={buildingDraft.short_name} onChange={(e) => setBuildingDraft((p) => ({ ...p, short_name: e.target.value }))} placeholder="Short name" className="w-full bg-muted/50 border border-border rounded-lg px-2 py-1.5 text-xs" />
                                                    <select title="Building category" value={buildingDraft.category} onChange={(e) => setBuildingDraft((p) => ({ ...p, category: e.target.value }))} className="w-full bg-muted/50 border border-border rounded-lg px-2 py-1.5 text-xs">
                                                        <option value="academic">Academic</option>
                                                        <option value="admin">Admin</option>
                                                        <option value="facility">Facility</option>
                                                        <option value="sports">Sports</option>
                                                        <option value="hostel">Hostel</option>
                                                    </select>
                                                    <input value={buildingDraft.floors} onChange={(e) => setBuildingDraft((p) => ({ ...p, floors: e.target.value }))} placeholder="Floors" className="w-full bg-muted/50 border border-border rounded-lg px-2 py-1.5 text-xs" />
                                                    <textarea value={buildingDraft.description} onChange={(e) => setBuildingDraft((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full bg-muted/50 border border-border rounded-lg px-2 py-1.5 text-xs resize-none" rows={2} />
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button onClick={() => { setEditingBuildingId(null); setBuildingDraft({ name: '', short_name: '', category: 'academic', description: '', floors: '1' }); }} className="py-1.5 rounded-md bg-muted text-muted-foreground text-xs">Cancel</button>
                                                        <button onClick={saveBuildingEdit} className="py-1.5 rounded-md bg-primary text-primary-foreground text-xs">Save</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border border-border bg-card p-3">
                    <h3 className="text-sm font-semibold mb-1">Building Management</h3>
                    <p className="text-xs text-muted-foreground mb-2">Use campus workspace to add/edit/delete buildings and open campus map view.</p>
                    <button
                        onClick={() => {
                            if (!activeCampus) {
                                toast.info('Open a campus first');
                                return;
                            }
                            setShowCampusBuildingWizard(true);
                        }}
                        className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold"
                    >
                        Add Building to Selected Campus
                    </button>
                </div>

                <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
                    <h3 className="text-sm font-semibold">Master Data CRUD</h3>

                    <div className="rounded-xl border border-border p-2.5 space-y-2">
                        <p className="text-xs font-semibold flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Departments</p>
                        <div className="grid grid-cols-1 gap-2">
                            <input value={departmentDraft.name} onChange={(e) => setDepartmentDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Department name" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                            <input value={departmentDraft.id} onChange={(e) => setDepartmentDraft((p) => ({ ...p, id: e.target.value }))} placeholder="Department ID (optional)" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                            <input value={departmentDraft.head_id} onChange={(e) => setDepartmentDraft((p) => ({ ...p, head_id: e.target.value }))} placeholder="Head ID (optional)" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                        </div>
                        <button onClick={saveDepartment} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">{editingDepartmentId ? 'Save Department' : 'Add Department'}</button>
                        <div className="divide-y divide-border">
                            {(departmentsCrud.list.data || []).slice(0, 8).map((d) => (
                                <div key={d.id} className="py-1.5 flex items-center gap-2">
                                    <span className="text-[11px] flex-1 truncate">{d.name}</span>
                                    <button onClick={() => { setEditingDepartmentId(d.id); setDepartmentDraft({ id: d.id, name: d.name, head_id: d.head_id || '' }); }} className="text-primary text-[11px]">Edit</button>
                                    <button onClick={async () => { const ok = await confirm({ title: 'Delete department?', description: d.name, confirmText: 'Delete', cancelText: 'Cancel', destructive: true }); if (ok) departmentsCrud.remove.mutate(d.id); }} className="text-destructive text-[11px]">Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border p-2.5 space-y-2">
                        <p className="text-xs font-semibold flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Courses</p>
                        <input value={courseDraft.name} onChange={(e) => setCourseDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Course name" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                        <div className="grid grid-cols-2 gap-2">
                            <input value={courseDraft.id} onChange={(e) => setCourseDraft((p) => ({ ...p, id: e.target.value }))} placeholder="Course ID" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                            <input value={courseDraft.duration_years} onChange={(e) => setCourseDraft((p) => ({ ...p, duration_years: e.target.value }))} placeholder="Duration" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                        </div>
                        <select title="Course department" value={courseDraft.department_id} onChange={(e) => setCourseDraft((p) => ({ ...p, department_id: e.target.value }))} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs">
                            <option value="">Department (optional)</option>
                            {(departmentsCrud.list.data || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <button onClick={saveCourse} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">{editingCourseId ? 'Save Course' : 'Add Course'}</button>
                        <div className="divide-y divide-border">
                            {(coursesCrud.list.data || []).slice(0, 8).map((c) => (
                                <div key={c.id} className="py-1.5 flex items-center gap-2">
                                    <span className="text-[11px] flex-1 truncate">{c.name}</span>
                                    <button onClick={() => { setEditingCourseId(c.id); setCourseDraft({ id: c.id, name: c.name, department_id: c.department_id || '', duration_years: String(c.duration_years || 4) }); }} className="text-primary text-[11px]">Edit</button>
                                    <button onClick={async () => { const ok = await confirm({ title: 'Delete course?', description: c.name, confirmText: 'Delete', cancelText: 'Cancel', destructive: true }); if (ok) coursesCrud.remove.mutate(c.id); }} className="text-destructive text-[11px]">Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border p-2.5 space-y-2">
                        <p className="text-xs font-semibold flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Staff</p>
                        <input value={staffDraft.name} onChange={(e) => setStaffDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Staff name" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                        <div className="grid grid-cols-2 gap-2">
                            <input value={staffDraft.role_id} onChange={(e) => setStaffDraft((p) => ({ ...p, role_id: e.target.value }))} placeholder="Role ID" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                            <select title="Staff type" value={staffDraft.type} onChange={(e) => setStaffDraft((p) => ({ ...p, type: e.target.value }))} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs">
                                <option value="teaching">Teaching</option>
                                <option value="non-teaching">Non-teaching</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <select title="Staff department" value={staffDraft.department_id} onChange={(e) => setStaffDraft((p) => ({ ...p, department_id: e.target.value }))} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs">
                            <option value="">Department (optional)</option>
                            {(departmentsCrud.list.data || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <button onClick={saveStaff} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">{editingStaffId ? 'Save Staff' : 'Add Staff'}</button>
                        <div className="divide-y divide-border">
                            {(staffCrud.list.data || []).slice(0, 8).map((s) => (
                                <div key={s.id} className="py-1.5 flex items-center gap-2">
                                    <span className="text-[11px] flex-1 truncate">{s.name}</span>
                                    <button onClick={() => { setEditingStaffId(s.id); setStaffDraft({ name: s.name, type: s.type, role_id: s.role_id, department_id: s.department_id || '' }); }} className="text-primary text-[11px]">Edit</button>
                                    <button onClick={async () => { const ok = await confirm({ title: 'Delete staff?', description: s.name, confirmText: 'Delete', cancelText: 'Cancel', destructive: true }); if (ok) staffCrud.remove.mutate(s.id); }} className="text-destructive text-[11px]">Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border p-2.5 space-y-2">
                        <p className="text-xs font-semibold flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Students</p>
                        <input value={studentDraft.name} onChange={(e) => setStudentDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Student name" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                        <div className="grid grid-cols-2 gap-2">
                            <input value={studentDraft.roll_no} onChange={(e) => setStudentDraft((p) => ({ ...p, roll_no: e.target.value }))} placeholder="Roll No" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                            <input value={studentDraft.year} onChange={(e) => setStudentDraft((p) => ({ ...p, year: e.target.value }))} placeholder="Year" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs" />
                        </div>
                        <select title="Student course" value={studentDraft.course_id} onChange={(e) => setStudentDraft((p) => ({ ...p, course_id: e.target.value }))} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs">
                            <option value="">Course (optional)</option>
                            {(coursesCrud.list.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={saveStudent} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">{editingStudentId ? 'Save Student' : 'Add Student'}</button>
                        <div className="divide-y divide-border">
                            {(studentsCrud.list.data || []).slice(0, 8).map((s) => (
                                <div key={s.id} className="py-1.5 flex items-center gap-2">
                                    <span className="text-[11px] flex-1 truncate">{s.name} ({s.roll_no})</span>
                                    <button onClick={() => { setEditingStudentId(s.id); setStudentDraft({ name: s.name, roll_no: s.roll_no, course_id: s.course_id || '', year: s.year || '1' }); }} className="text-primary text-[11px]">Edit</button>
                                    <button onClick={async () => { const ok = await confirm({ title: 'Delete student?', description: s.name, confirmText: 'Delete', cancelText: 'Cancel', destructive: true }); if (ok) studentsCrud.remove.mutate(s.id); }} className="text-destructive text-[11px]">Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showMapPicker && (
                <div className="fixed inset-0 z-[1200] bg-background/90 p-3 flex flex-col">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden flex-1 flex flex-col">
                        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Pick Campus Coordinates</h3>
                            <button title="Close map picker" aria-label="Close map picker" onClick={() => setShowMapPicker(false)} className="h-8 w-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div ref={mapPickerRef} className="flex-1 min-h-[300px]" />
                        <div className="px-3 py-2 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                                {pickerCoords ? `${pickerCoords.lat}, ${pickerCoords.lng} (tap anywhere to update)` : 'Tap map to choose location'}
                            </p>
                            <button
                                onClick={() => {
                                    if (!pickerCoords) return;
                                    setForm((p) => ({ ...p, lat: String(pickerCoords.lat), lng: String(pickerCoords.lng) }));
                                    setShowMapPicker(false);
                                }}
                                disabled={!pickerCoords}
                                className="w-full mt-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
                            >
                                Use This Location
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCampusMapPreview && activeCampus && (
                <div className="fixed inset-0 z-[1300] bg-background/90 p-3 flex flex-col">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden flex-1 flex flex-col">
                        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-semibold">{activeCampus.short_name} Campus Map</h3>
                            <button title="Close campus map" aria-label="Close campus map" onClick={() => setShowCampusMapPreview(false)} className="h-8 w-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div ref={campusPreviewMapRef} className="flex-1 min-h-[320px]" />
                    </div>
                </div>
            )}

            {showCampusBuildingWizard && activeCampus && (
                <CampusWizard
                    campusId={activeCampus.id}
                    initialLocation={{ lat: activeCampus.lat, lng: activeCampus.lng }}
                    onClose={() => setShowCampusBuildingWizard(false)}
                />
            )}
        </div>
    );
}
