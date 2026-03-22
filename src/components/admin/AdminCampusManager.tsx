import { useMemo, useState } from 'react';
import {
  Building2, LocateFixed, MapPin, Pencil, Plus,
  Search, ShieldCheck, Trash2, ChevronUp, Check, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppDialog } from '@/hooks/useAppDialog';
import { useProfile } from '@/hooks/useProfile';
import { useAddCollege, useColleges, useDeleteCollege, useUpdateCollege } from '@/hooks/useColleges';
import { isLocalAdminAuthenticated, setLocalAdminCampusId } from '@/lib/adminAuth';
import type { College } from '@/lib/types';
import AdminCampusLocationPicker from '@/components/admin/AdminCampusLocationPicker';

interface AdminCampusManagerProps {
  onCampusSelected?: (campus: College) => void;
}

export default function AdminCampusManager({ onCampusSelected }: AdminCampusManagerProps) {
  const navigate = useNavigate();
  const { confirm } = useAppDialog();
  const { upsertProfile } = useProfile();
  const { data: colleges = [], isLoading } = useColleges();
  const addCollege    = useAddCollege();
  const updateCollege = useUpdateCollege();
  const deleteCollege = useDeleteCollege();

  const [searchQuery,          setSearchQuery         ] = useState('');
  const [showAddCampus,        setShowAddCampus       ] = useState(false);
  const [expandedEditCampusId, setExpandedEditCampusId] = useState<string | null>(null);
  const [isCapturingGps,       setIsCapturingGps      ] = useState(false);
  const [pickerOpen,           setPickerOpen          ] = useState(false);
  const [pickerMode,           setPickerMode          ] = useState<'add' | 'edit'>('add');
  const [form,     setForm    ] = useState({ name: '', short_name: '', address: '', lat: '', lng: '', zoom: '16' });
  const [editForm, setEditForm] = useState({ name: '', short_name: '', address: '', lat: '', lng: '', zoom: '16' });

  const filteredColleges = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = colleges.slice().sort((a, b) =>
      (a.short_name || a.name).localeCompare(b.short_name || b.name)
    );
    if (!q) return base;
    return base.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.short_name.toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  }, [colleges, searchQuery]);

  const resetForm = () =>
    setForm({ name: '', short_name: '', address: '', lat: '', lng: '', zoom: '16' });

  const handleOpenCampus = async (campusId: string) => {
    try {
      if (isLocalAdminAuthenticated()) {
        setLocalAdminCampusId(campusId);
      } else {
        await upsertProfile.mutateAsync({ college_id: campusId });
      }
      const selected = colleges.find((c) => c.id === campusId);
      if (selected && onCampusSelected) onCampusSelected(selected);
      navigate(`/admin/campus/${campusId}/data`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to open campus');
    }
  };

  const handleEditCampus = (campus: College) => {
    setExpandedEditCampusId((prev) => (prev === campus.id ? null : campus.id));
    setEditForm({
      name:       campus.name       || '',
      short_name: campus.short_name || '',
      address:    campus.address    || '',
      lat:        String(campus.lat  ?? ''),
      lng:        String(campus.lng  ?? ''),
      zoom:       String(campus.zoom ?? 16),
    });
  };

  const handleSaveCampus = async () => {
    const lat  = Number(form.lat);
    const lng  = Number(form.lng);
    const zoom = Number(form.zoom || '16');
    if (!form.name.trim() || !form.short_name.trim())
      return toast.error('Campus name and short name are required');
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
      return toast.error('Valid latitude and longitude are required');
    try {
      await addCollege.mutateAsync({
        name: form.name.trim(), short_name: form.short_name.trim(),
        address: form.address.trim(), lat, lng, zoom,
      });
      setShowAddCampus(false);
      resetForm();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save campus');
    }
  };

  const handleSaveCampusEdit = async (campusId: string) => {
    const lat  = Number(editForm.lat);
    const lng  = Number(editForm.lng);
    const zoom = Number(editForm.zoom || '16');
    if (!editForm.name.trim() || !editForm.short_name.trim())
      return toast.error('Campus name and short name are required');
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
      return toast.error('Valid latitude and longitude are required');
    try {
      await updateCollege.mutateAsync({
        id: campusId,
        updates: {
          name: editForm.name.trim(), short_name: editForm.short_name.trim(),
          address: editForm.address.trim(), lat, lng, zoom,
        },
      });
      setExpandedEditCampusId(null);
      toast.success('Campus updated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update campus');
    }
  };

  const handleDeleteCampus = async (campus: College) => {
    const ok = await confirm({
      title: 'Delete campus?',
      description: `Delete ${campus.short_name || campus.name}? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCollege.mutateAsync(campus.id);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete campus');
    }
  };

  const useDeviceLocation = async () => {
    if (!('geolocation' in navigator)) return toast.error('Geolocation not supported');
    if (!window.isSecureContext)        return toast.error('GPS requires HTTPS');
    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((p) => ({
          ...p,
          lat: String(Number(pos.coords.latitude.toFixed(6))),
          lng: String(Number(pos.coords.longitude.toFixed(6))),
        }));
        setIsCapturingGps(false);
        toast.success('Coordinates captured');
      },
      () => { setIsCapturingGps(false); toast.error('Unable to capture GPS coordinates'); },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const openMapPicker = (mode: 'add' | 'edit') => {
    setPickerMode(mode);
    setPickerOpen(true);
  };

  const currentPickerLat  = pickerMode === 'add' ? Number(form.lat  || '20.5937') : Number(editForm.lat  || '20.5937');
  const currentPickerLng  = pickerMode === 'add' ? Number(form.lng  || '78.9629') : Number(editForm.lng  || '78.9629');
  const currentPickerZoom = pickerMode === 'add' ? Number(form.zoom || '16')      : Number(editForm.zoom || '16');

  /* shared field class */
  const field = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background pb-[env(safe-area-inset-bottom)]">

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 bg-card border-b border-border shadow-sm z-10">
        {/* Title row */}
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            </div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">Campus Manager</h1>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Admin
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3 pl-9">
          Select a campus to manage data
        </p>

        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campuses…"
              className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <button
            onClick={() => setShowAddCampus((v) => !v)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 active:scale-95 transition-transform
              ${showAddCampus
                ? 'bg-primary/10 border border-primary/30 text-primary'
                : 'bg-primary text-primary-foreground shadow-sm'
              }`}
            title={showAddCampus ? 'Close' : 'Add campus'}
          >
            {showAddCampus ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-24 space-y-3 bg-muted/10">

        {/* ── Add campus panel ── */}
        {showAddCampus && (
          <div className="rounded-2xl border border-primary/25 bg-card p-3 shadow-sm space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-bold text-foreground">New Campus</span>
            </div>

            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Campus full name"
              className={field}
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.short_name}
                onChange={(e) => setForm((p) => ({ ...p, short_name: e.target.value }))}
                placeholder="Short name"
                className={field}
              />
              <input
                value={form.zoom}
                onChange={(e) => setForm((p) => ({ ...p, zoom: e.target.value }))}
                placeholder="Zoom (16)"
                className={field}
              />
            </div>

            <input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Address"
              className={field}
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.lat}
                onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
                placeholder="Latitude"
                className={field}
              />
              <input
                value={form.lng}
                onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
                placeholder="Longitude"
                className={field}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={useDeviceLocation}
                disabled={isCapturingGps}
                className="h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5
                           bg-muted border border-border text-muted-foreground
                           disabled:opacity-50 active:scale-95 transition-transform"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                {isCapturingGps ? 'Capturing…' : 'Use GPS'}
              </button>
              <button
                onClick={() => openMapPicker('add')}
                className="h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5
                           bg-primary/10 border border-primary/20 text-primary
                           active:scale-95 transition-transform"
              >
                <MapPin className="w-3.5 h-3.5" /> Pick on Map
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => { resetForm(); setShowAddCampus(false); }}
                className="py-2.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground
                           active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCampus}
                className="py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground
                           active:scale-95 transition-transform"
              >
                Add Campus
              </button>
            </div>
          </div>
        )}

        {/* ── Campus list card ── */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">

          {/* list header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
            <span className="text-xs font-bold text-foreground">Campus Locations</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
              {filteredColleges.length}
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="w-6 h-6 rounded-full border-2 border-border border-t-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading campuses…</p>
            </div>
          ) : filteredColleges.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2">
              <Building2 className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                {searchQuery ? 'No results found' : 'No campuses yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredColleges.map((campus) => (
                <div key={campus.id}>

                  {/* ── Campus row ── */}
                  <div className="flex items-start gap-3 px-3.5 py-3">
                    {/* icon */}
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>

                    {/* info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight truncate text-foreground">
                        {campus.short_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {campus.name}
                      </p>
                      {campus.address && (
                        <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                          {campus.address}
                        </p>
                      )}
                      <button
                        onClick={() => handleOpenCampus(campus.id)}
                        className="mt-2 h-7 px-3 rounded-lg text-[11px] font-bold
                                   bg-primary/10 border border-primary/20 text-primary
                                   flex items-center gap-1.5 active:scale-95 transition-transform"
                      >
                        <Building2 className="w-3 h-3" /> Campus Data
                      </button>
                    </div>

                    {/* edit / delete */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEditCampus(campus)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center
                                    active:scale-95 transition-transform border
                                    ${expandedEditCampusId === campus.id
                                      ? 'bg-primary/10 border-primary/30 text-primary'
                                      : 'bg-muted border-border text-muted-foreground'
                                    }`}
                        title="Edit campus"
                      >
                        {expandedEditCampusId === campus.id
                          ? <ChevronUp className="w-3.5 h-3.5" />
                          : <Pencil    className="w-3.5 h-3.5" />
                        }
                      </button>
                      <button
                        onClick={() => handleDeleteCampus(campus)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center
                                   bg-destructive/10 border border-destructive/20 text-destructive
                                   active:scale-95 transition-transform"
                        title="Delete campus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ── Inline edit form ── */}
                  {expandedEditCampusId === campus.id && (
                    <div className="mx-3 mb-3 rounded-2xl border border-primary/20 bg-muted/20 p-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                        Edit Details
                      </p>

                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Campus full name"
                        className={field}
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={editForm.short_name}
                          onChange={(e) => setEditForm((p) => ({ ...p, short_name: e.target.value }))}
                          placeholder="Short name"
                          className={field}
                        />
                        <input
                          value={editForm.zoom}
                          onChange={(e) => setEditForm((p) => ({ ...p, zoom: e.target.value }))}
                          placeholder="Zoom (16)"
                          className={field}
                        />
                      </div>

                      <input
                        value={editForm.address}
                        onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                        placeholder="Address"
                        className={field}
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={editForm.lat}
                          onChange={(e) => setEditForm((p) => ({ ...p, lat: e.target.value }))}
                          placeholder="Latitude"
                          className={field}
                        />
                        <input
                          value={editForm.lng}
                          onChange={(e) => setEditForm((p) => ({ ...p, lng: e.target.value }))}
                          placeholder="Longitude"
                          className={field}
                        />
                      </div>

                      <button
                        onClick={() => openMapPicker('edit')}
                        className="w-full h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5
                                   bg-primary/10 border border-primary/20 text-primary
                                   active:scale-95 transition-transform"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Pick on Map
                      </button>

                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          onClick={() => setExpandedEditCampusId(null)}
                          className="py-2.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground
                                     active:scale-95 transition-transform"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveCampusEdit(campus.id)}
                          className="py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground
                                     flex items-center justify-center gap-1.5
                                     active:scale-95 transition-transform"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Map picker ── */}
      <AdminCampusLocationPicker
        open={pickerOpen}
        initialLat={Number.isFinite(currentPickerLat)   ? currentPickerLat   : 20.5937}
        initialLng={Number.isFinite(currentPickerLng)   ? currentPickerLng   : 78.9629}
        initialZoom={Number.isFinite(currentPickerZoom) ? currentPickerZoom  : 16}
        onClose={() => setPickerOpen(false)}
        onSelect={({ lat, lng, zoom }) => {
          if (pickerMode === 'add') {
            setForm((p) => ({ ...p, lat: String(lat), lng: String(lng), zoom: String(zoom) }));
          } else {
            setEditForm((p) => ({ ...p, lat: String(lat), lng: String(lng), zoom: String(zoom) }));
          }
          setPickerOpen(false);
          toast.success('Campus location selected from map');
        }}
      />
    </div>
  );
}