import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, GraduationCap, Search, Users, UserCog, Pencil, Trash2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useColleges } from '@/hooks/useColleges';
import { useDepartmentsCrud } from '@/hooks/useAdminCrud';
import { useAppDialog } from '@/hooks/useAppDialog';
import { CLASS_SECTIONS, STAFF_TYPES, STUDENT_YEARS } from '@/lib/collegeData';
import type { College, UserProfile } from '@/lib/types';

type EditableUser = Pick<UserProfile,
  'clerk_user_id' | 'full_name' | 'email' | 'role' | 'role_id' | 'department_id' | 'course_id' | 'year' | 'section' | 'staff_type' | 'mobile_no' | 'address'
>;

export default function AdminCampusPeople() {
  const navigate = useNavigate();
  const { campusId } = useParams();
  const { confirm } = useAppDialog();
  const queryClient = useQueryClient();
  const { data: colleges = [] } = useColleges();
  const departmentsCrud = useDepartmentsCrud();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EditableUser | null>(null);

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

  const usersQuery = useQuery<UserProfile[]>({
    queryKey: ['admin-campus-people', campusId],
    enabled: !!campusId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('college_id', campusId as string)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as UserProfile[];
    },
  });

  const updateUser = useMutation({
    mutationFn: async (payload: EditableUser) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: payload.full_name,
          role: payload.role,
          role_id: payload.role_id,
          department_id: payload.department_id,
          course_id: payload.course_id,
          year: payload.year,
          section: payload.section,
          staff_type: payload.staff_type,
          mobile_no: payload.mobile_no,
          address: payload.address,
        })
        .eq('clerk_user_id', payload.clerk_user_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campus-people', campusId] });
      toast.success('User updated');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update user'),
  });

  const removeUser = useMutation({
    mutationFn: async (clerkUserId: string) => {
      const { error } = await supabase.from('user_profiles').delete().eq('clerk_user_id', clerkUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campus-people', campusId] });
      toast.success('User removed');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to remove user'),
  });

  const people = useMemo(() => usersQuery.data || [], [usersQuery.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      String(p.full_name || p.display_name || '').toLowerCase().includes(q) ||
      String(p.email || '').toLowerCase().includes(q) ||
      String(p.role_id || '').toLowerCase().includes(q)
    );
  }, [people, search]);

  const students = filtered.filter((p) => p.role === 'student');
  const teachers = filtered.filter((p) => p.role === 'faculty' || p.role === 'staff' || p.role === 'admin');

  const handleDelete = async (p: UserProfile) => {
    const ok = await confirm({
      title: 'Delete user profile?',
      description: `${p.full_name || p.display_name || p.email}`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
    });
    if (!ok) return;
    removeUser.mutate(p.clerk_user_id);
  };

  if (!selectedCampus) {
    return <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading campus people...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="px-4 pt-4 pb-3 bg-card border-b border-border shadow-sm z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/admin/campus/${selectedCampus.id}/data`)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center" title="Back to campus data">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-heading font-bold truncate">{selectedCampus.short_name} · People Data</h1>
            <p className="text-xs text-muted-foreground truncate">Manage students and teachers for this campus</p>
          </div>
          <button onClick={() => navigate(`/admin/campus/${selectedCampus.id}/data`)} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1" title="Open campus data">
            <Database className="w-3.5 h-3.5" /> Campus Data
          </button>
        </div>
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, id..."
            className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 bg-muted/10 space-y-3 pb-24">
        <div className="rounded-2xl border border-border bg-card p-3">
          <h3 className="text-sm font-semibold flex items-center gap-1 mb-2"><GraduationCap className="w-4 h-4" /> Students ({students.length})</h3>
          <div className="divide-y divide-border rounded-xl border border-border/60">
            {students.length === 0 && <p className="text-xs text-muted-foreground p-3">No students found for this campus.</p>}
            {students.map((p) => (
              <div key={p.clerk_user_id} className="p-2.5 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{p.full_name || p.display_name || 'Unnamed'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.email} · {p.role_id || 'No roll no.'}</p>
                </div>
                <button onClick={() => setEditing({
                  clerk_user_id: p.clerk_user_id,
                  full_name: p.full_name || '',
                  email: p.email,
                  role: p.role,
                  role_id: p.role_id || '',
                  department_id: p.department_id || '',
                  course_id: p.course_id || '',
                  year: p.year || '',
                  section: p.section || '',
                  staff_type: p.staff_type || '',
                  mobile_no: p.mobile_no || '',
                  address: p.address || '',
                })} className="text-primary text-xs flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(p)} className="text-destructive text-xs flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <h3 className="text-sm font-semibold flex items-center gap-1 mb-2"><Users className="w-4 h-4" /> Teachers / Staff ({teachers.length})</h3>
          <div className="divide-y divide-border rounded-xl border border-border/60">
            {teachers.length === 0 && <p className="text-xs text-muted-foreground p-3">No staff found for this campus.</p>}
            {teachers.map((p) => (
              <div key={p.clerk_user_id} className="p-2.5 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{p.full_name || p.display_name || 'Unnamed'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.email} · {p.role_id || 'No employee id'}</p>
                </div>
                <button onClick={() => setEditing({
                  clerk_user_id: p.clerk_user_id,
                  full_name: p.full_name || '',
                  email: p.email,
                  role: p.role,
                  role_id: p.role_id || '',
                  department_id: p.department_id || '',
                  course_id: p.course_id || '',
                  year: p.year || '',
                  section: p.section || '',
                  staff_type: p.staff_type || '',
                  mobile_no: p.mobile_no || '',
                  address: p.address || '',
                })} className="text-primary text-xs flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(p)} className="text-destructive text-xs flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[1400] bg-background/80 p-4 flex items-center justify-center">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-3 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="text-sm font-semibold flex items-center gap-1"><UserCog className="w-4 h-4" /> Edit User</h3>
            <input value={editing.full_name || ''} onChange={(e) => setEditing((p) => p ? { ...p, full_name: e.target.value } : p)} placeholder="Full name" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" />
            <input value={editing.role_id || ''} onChange={(e) => setEditing((p) => p ? { ...p, role_id: e.target.value } : p)} placeholder="Roll no. / Employee ID" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" />
            <select value={editing.role} onChange={(e) => setEditing((p) => p ? { ...p, role: e.target.value as any } : p)} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" title="Role">
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="visitor">Visitor</option>
            </select>

            <select
              title="Department"
              value={editing.role === 'student' ? (editing.course_id || '') : (editing.department_id || '')}
              onChange={(e) => setEditing((p) => {
                if (!p) return p;
                if (p.role === 'student') return { ...p, course_id: e.target.value };
                return { ...p, department_id: e.target.value };
              })}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select department</option>
              {campusDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            {editing.role === 'student' && (
              <div className="grid grid-cols-2 gap-2">
                <select title="Year" value={editing.year || ''} onChange={(e) => setEditing((p) => p ? { ...p, year: e.target.value } : p)} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="">Year</option>
                  {STUDENT_YEARS.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
                </select>
                <select title="Section" value={editing.section || ''} onChange={(e) => setEditing((p) => p ? { ...p, section: e.target.value } : p)} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="">Section</option>
                  {CLASS_SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {(editing.role === 'faculty' || editing.role === 'staff' || editing.role === 'admin') && (
              <select title="Staff type" value={editing.staff_type || ''} onChange={(e) => setEditing((p) => p ? { ...p, staff_type: e.target.value } : p)} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">Staff category</option>
                {STAFF_TYPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            )}

            <input value={editing.mobile_no || ''} onChange={(e) => setEditing((p) => p ? { ...p, mobile_no: e.target.value } : p)} placeholder="Mobile" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" />
            <textarea rows={2} value={editing.address || ''} onChange={(e) => setEditing((p) => p ? { ...p, address: e.target.value } : p)} placeholder="Address" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm resize-none" />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="py-2.5 rounded-xl bg-muted text-muted-foreground text-sm">Cancel</button>
              <button
                onClick={async () => {
                  if (!editing) return;
                  await updateUser.mutateAsync(editing);
                  setEditing(null);
                }}
                className="py-2.5 rounded-xl bg-primary text-primary-foreground text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
