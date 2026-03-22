import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Building2, MapPinned, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAppDialog } from '@/hooks/useAppDialog';
import { useColleges } from '@/hooks/useColleges';
import { useBuildings, useDeleteBuilding, useUpdateBuilding } from '@/hooks/useBuildings';
import { useDepartmentsCrud } from '@/hooks/useAdminCrud';
import type { College } from '@/lib/types';

export default function AdminCampusData() {
  const navigate = useNavigate();
  const { campusId } = useParams();
  const { confirm } = useAppDialog();
  const { data: colleges = [] } = useColleges();
  const { data: buildings = [] } = useBuildings();
  const departmentsCrud = useDepartmentsCrud();
  const deleteBuilding = useDeleteBuilding();
  const updateBuilding = useUpdateBuilding();

  const [departmentDraft, setDepartmentDraft] = useState({ id: '', name: '' });
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [buildingDraft, setBuildingDraft] = useState({ name: '', short_name: '', category: 'academic', floors: '1', description: '' });

  const selectedCampus = useMemo<College | null>(() => {
    if (!campusId) return null;
    return colleges.find((c) => c.id === campusId) || null;
  }, [campusId, colleges]);

  const campusPrefix = useMemo(() => {
    if (!selectedCampus) return '';
    return (selectedCampus.short_name || selectedCampus.name || 'CAMPUS')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }, [selectedCampus]);

  const campusDepartments = useMemo(() => {
    const list = departmentsCrud.list.data || [];
    if (!campusPrefix) return [];
    return list.filter((d) => String(d.id || '').startsWith(`${campusPrefix}_`));
  }, [departmentsCrud.list.data, campusPrefix]);

  const campusBuildings = useMemo(() => {
    if (!selectedCampus) return [] as any[];

    const toRad = (v: number) => (v * Math.PI) / 180;
    const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371000;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    return buildings
      .filter((b: any) => {
        if (b.college_id === selectedCampus.id) return true;
        if (b.college_id) return false;
        if (!Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return false;
        return distanceMeters(selectedCampus.lat, selectedCampus.lng, Number(b.lat), Number(b.lng)) <= 3000;
      })
      .sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [buildings, selectedCampus]);

  const slugifyId = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40)
      .toUpperCase();

  const saveDepartment = async () => {
    if (!selectedCampus) return;
    if (!departmentDraft.name.trim()) return toast.error('Department name is required');

    try {
      const rawId = (departmentDraft.id || slugifyId(departmentDraft.name));
      const id = `${campusPrefix}_${rawId}`;

      if (editingDepartmentId) {
        await departmentsCrud.update.mutateAsync({ id: editingDepartmentId, updates: { name: departmentDraft.name.trim() } });
      } else {
        await departmentsCrud.create.mutateAsync({ id, name: departmentDraft.name.trim(), head_id: null });
      }

      setDepartmentDraft({ id: '', name: '' });
      setEditingDepartmentId(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save department');
    }
  };

  const removeDepartment = async (id: string, name: string) => {
    const ok = await confirm({ title: 'Delete department?', description: name, confirmText: 'Delete', cancelText: 'Cancel', destructive: true });
    if (!ok) return;
    departmentsCrud.remove.mutate(id);
  };

  const saveBuildingEdit = async () => {
    if (!editingBuildingId) return;
    if (!buildingDraft.name.trim() || !buildingDraft.short_name.trim()) return toast.error('Building name and short name are required');

    try {
      await updateBuilding.mutateAsync({
        id: editingBuildingId,
        updates: {
          name: buildingDraft.name.trim(),
          short_name: buildingDraft.short_name.trim(),
          category: buildingDraft.category as any,
          floors: Number(buildingDraft.floors || '1'),
          description: buildingDraft.description,
        },
      });
      setEditingBuildingId(null);
      setBuildingDraft({ name: '', short_name: '', category: 'academic', floors: '1', description: '' });
      toast.success('Building updated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update building');
    }
  };

  const removeBuilding = async (id: string, name: string) => {
    const ok = await confirm({ title: 'Delete building?', description: name, confirmText: 'Delete', cancelText: 'Cancel', destructive: true });
    if (!ok) return;
    try {
      await deleteBuilding.mutateAsync(id);
      if (editingBuildingId === id) {
        setEditingBuildingId(null);
        setBuildingDraft({ name: '', short_name: '', category: 'academic', floors: '1', description: '' });
      }
      toast.success('Building deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete building');
    }
  };

  if (!selectedCampus) {
    return <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading campus data...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="px-4 pt-4 pb-3 bg-card border-b border-border shadow-sm z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/?tab=admin')} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center" title="Back to campuses">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-heading font-bold truncate">{selectedCampus.short_name} · Campus Data</h1>
            <p className="text-xs text-muted-foreground truncate">Database-style management for departments and buildings</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/admin/campus/${selectedCampus.id}/people`)} className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold flex items-center gap-1" title="Open people data">
              <Users className="w-3.5 h-3.5" /> People
            </button>
            <button onClick={() => navigate(`/admin/campus/${selectedCampus.id}/map`)} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1" title="Open map visuals">
              <MapPinned className="w-3.5 h-3.5" /> Map Visuals
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 bg-muted/10 space-y-3 pb-24">
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1"><BookOpen className="w-4 h-4" /> Departments</h3>
          <input value={departmentDraft.name} onChange={(e) => setDepartmentDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Department name" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" />
          <input value={departmentDraft.id} onChange={(e) => setDepartmentDraft((p) => ({ ...p, id: e.target.value }))} placeholder="Department code (optional)" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" />
          <button onClick={saveDepartment} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">{editingDepartmentId ? 'Save Department' : 'Add Department'}</button>

          <div className="divide-y divide-border rounded-xl border border-border/60">
            {campusDepartments.length === 0 && <p className="text-xs text-muted-foreground p-3">No departments yet.</p>}
            {campusDepartments.map((d) => (
              <div key={d.id} className="p-2.5 flex items-center gap-2">
                <span className="text-sm flex-1 truncate">{d.name}</span>
                <button onClick={() => { setEditingDepartmentId(d.id); setDepartmentDraft({ id: d.id.replace(`${campusPrefix}_`, ''), name: d.name }); }} className="text-primary text-xs flex items-center gap-1" title="Edit department">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => removeDepartment(d.id, d.name)} className="text-destructive text-xs flex items-center gap-1" title="Delete department">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1"><Building2 className="w-4 h-4" /> Buildings</h3>
          <div className="flex justify-end">
            <button onClick={() => navigate(`/admin/campus/${selectedCampus.id}/map`)} className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-semibold flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add from Map
            </button>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border/60">
            {campusBuildings.length === 0 && <p className="text-xs text-muted-foreground p-3">No buildings yet.</p>}
            {campusBuildings.map((b: any) => (
              <div key={b.id} className="p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm flex-1 truncate">{b.name}</span>
                  <button
                    onClick={() => {
                      setEditingBuildingId(b.id);
                      setBuildingDraft({
                        name: b.name || '',
                        short_name: b.short_name || '',
                        category: b.category || 'academic',
                        floors: String(b.floors || 1),
                        description: b.description || '',
                      });
                    }}
                    className="text-primary text-xs flex items-center gap-1"
                    title="Edit building"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => removeBuilding(b.id, b.name)} className="text-destructive text-xs flex items-center gap-1" title="Delete building">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>

                {editingBuildingId === b.id && (
                  <div className="grid grid-cols-1 gap-2">
                    <input value={buildingDraft.name} onChange={(e) => setBuildingDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Building name" className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-xs" />
                    <input value={buildingDraft.short_name} onChange={(e) => setBuildingDraft((p) => ({ ...p, short_name: e.target.value }))} placeholder="Short name" className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-xs" />
                    <select title="Building category" value={buildingDraft.category} onChange={(e) => setBuildingDraft((p) => ({ ...p, category: e.target.value }))} className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-xs">
                      <option value="academic">Academic</option>
                      <option value="admin">Admin</option>
                      <option value="facility">Facility</option>
                      <option value="sports">Sports</option>
                      <option value="hostel">Hostel</option>
                    </select>
                    <input type="number" value={buildingDraft.floors} onChange={(e) => setBuildingDraft((p) => ({ ...p, floors: e.target.value }))} placeholder="Floors" className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-xs" />
                    <textarea rows={2} value={buildingDraft.description} onChange={(e) => setBuildingDraft((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-xs resize-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => { setEditingBuildingId(null); setBuildingDraft({ name: '', short_name: '', category: 'academic', floors: '1', description: '' }); }} className="py-2 rounded-lg bg-muted text-muted-foreground text-xs">Cancel</button>
                      <button onClick={saveBuildingEdit} className="py-2 rounded-lg bg-primary text-primary-foreground text-xs">Save</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
