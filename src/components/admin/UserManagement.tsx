import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
 id: string;
 first_name: string;
 last_name: string;
 email: string;
 role: 'student' | 'faculty' | 'staff' | 'admin';
 department: string;
}

export default function UserManagement() {
 const [users, setUsers] = useState<UserProfile[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');

 const fetchUsers = async () => {
 setLoading(true);
 const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
 if (error) {
 toast.error('Failed to load users');
 } else {
 setUsers(data || []);
 }
 setLoading(false);
 };

 useEffect(() => {
 fetchUsers();
 }, []);

 const handleRoleChange = async (userId: string, newRole: string) => {
 const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
 if (error) {
 toast.error('Failed to update role');
 } else {
 toast.success('Role updated');
 setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
 }
 };

 const filteredUsers = users.filter(u => 
 u.first_name?.toLowerCase().includes(search.toLowerCase()) || 
 u.last_name?.toLowerCase().includes(search.toLowerCase()) || 
 u.email?.toLowerCase().includes(search.toLowerCase())
 );

 return (
 <div className="h-full flex flex-col pt-4">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-heading font-bold flex items-center gap-2">
 <Users className="w-5 h-5 text-primary" /> User Management
 </h2>
 <div className="relative w-64">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <input 
 type="text" 
 placeholder="Search users..." 
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-card border border-border/50 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 />
 </div>
 </div>

 <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
 <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
 <tr>
 <th className="px-4 py-3">Name</th>
 <th className="px-4 py-3">Email</th>
 <th className="px-4 py-3">Department</th>
 <th className="px-4 py-3">Role</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr>
 <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
 <Loader2 className="w-6 h-6 animate-spin mx-auto" />
 </td>
 </tr>
 ) : filteredUsers.length === 0 ? (
 <tr>
 <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
 No users found.
 </td>
 </tr>
 ) : (
 filteredUsers.map(user => (
 <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20">
 <td className="px-4 py-3 font-medium text-foreground">
 {user.first_name || 'Anonymous'} {user.last_name || ''}
 </td>
 <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
 <td className="px-4 py-3 text-muted-foreground">{user.department || '-'}</td>
 <td className="px-4 py-3">
 <select 
 value={user.role || 'student'}
 onChange={(e) => handleRoleChange(user.id, e.target.value)}
 className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
 >
 <option value="student">Student</option>
 <option value="faculty">Faculty</option>
 <option value="staff">Staff</option>
 <option value="admin">Admin</option>
 </select>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
