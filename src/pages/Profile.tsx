import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useUser, useClerk } from '@clerk/clerk-react';
import {
    User, Mail, LogOut, MapPin, CheckCircle, Calendar, TrendingUp,
    Shield, GraduationCap, Clock, ChevronRight, Settings, BookOpen, Users,
    Pencil, Save, X, Phone, Home, Briefcase, Camera, Moon, Sun
} from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { useProfile } from '@/hooks/useProfile';
import { ENGINEERING_DEPARTMENTS, STUDENT_YEARS, CLASS_SECTIONS, STAFF_TYPES } from '@/lib/collegeData';
import { toast } from 'sonner';
import { useTheme } from '@/components/ThemeProvider';

const Profile = () => {
    const { user } = useUser();
    const { signOut } = useClerk();
    const { records, todayCount, weekCount, totalCount } = useAttendance();
    const { profile, isLoading, upsertProfile } = useProfile();
    const { theme, setTheme } = useTheme();

    // Edit mode state
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        mobile_no: '',
        address: '',
        role_id: '',
        department_id: '',
        course_id: '',
        role: 'student' as string,
        year: '',
        section: '',
        staff_type: '',
    });
    const [showConfirm, setShowConfirm] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Start editing
    const startEditing = () => {
        setEditForm({
            full_name: profile?.full_name || '',
            mobile_no: profile?.mobile_no || '',
            address: profile?.address || '',
            role_id: profile?.role_id || '',
            department_id: profile?.department_id || '',
            course_id: profile?.course_id || '',
            role: profile?.role || 'student',
            year: profile?.year || '',
            section: profile?.section || '',
            staff_type: profile?.staff_type || '',
        });
        setEditing(true);
    };

    // Save handler
    const handleSave = async () => {
        setShowConfirm(false);
        try {
            await upsertProfile.mutateAsync({
                full_name: editForm.full_name,
                mobile_no: editForm.mobile_no,
                address: editForm.address,
                role_id: editForm.role_id,
                department_id: editForm.department_id,
                course_id: editForm.course_id,
                role: editForm.role as any,
                year: editForm.year,
                section: editForm.section,
                staff_type: editForm.staff_type,
            });
            setEditing(false);
        } catch (err) {
            console.error('Failed to update profile:', err);
            toast.error('Failed to save profile.');
        }
    };

    const handleAvatarPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsUploadingAvatar(true);
        try {
            await user.setProfileImage({ file });
            await user.reload();
            toast.success('Profile picture updated');
        } catch (err) {
            console.error('Failed to update profile picture:', err);
            toast.error('Failed to update profile picture');
        } finally {
            setIsUploadingAvatar(false);
            event.target.value = '';
        }
    };

    // Chart data
    const chartData = Array.from({ length: 7 }, (_, i) => {
        const day = subDays(new Date(), 6 - i);
        const dayStart = startOfDay(day);
        const count = records.filter((r) =>
            isSameDay(new Date(r.checked_in_at), dayStart)
        ).length;
        return { day: format(day, 'EEE'), count };
    });

    const recentLocations = records.slice(0, 5);

    return (
        <div className="flex flex-col min-h-full px-4 pt-2 pb-36 overflow-y-auto scrollbar-hide">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-center justify-between"
            >
                <div>
                    <h1 className="text-2xl font-heading font-bold text-foreground">Profile</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Your campus dashboard</p>
                </div>
                {profile?.full_name && (
                    <button title="Sign out" onClick={() => signOut()} className="p-2 bg-destructive/10 text-destructive rounded-full hover:bg-destructive/20 transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                )}
            </motion.div>

            {/* Onboarding State: Now handled at the app level, so we just show profile if loaded */}
            {!isLoading && !profile ? (
                <div className="flex-1 flex items-center justify-center py-4">
                    <p className="text-muted-foreground text-sm">Please complete your setup on the map page first.</p>
                </div>
            ) : (
                <>
                    {/* User Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="bg-card rounded-2xl p-5 border border-border/50 mb-5 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-0"></div>

                        <div className="relative z-10 flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                {user?.imageUrl ? (
                                    <img src={user.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 text-primary-foreground" />
                                )}
                                <button
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={isUploadingAvatar}
                                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border border-border text-foreground flex items-center justify-center"
                                    title="Update profile picture"
                                >
                                    <Camera className="w-3 h-3" />
                                </button>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarPick}
                                    title="Choose profile picture"
                                    className="hidden"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-heading font-bold text-foreground truncate">
                                    {profile?.full_name || profile?.display_name || user?.firstName || 'Explorer'}
                                </h2>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Mail className="w-3 h-3 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground truncate">
                                        {user?.primaryEmailAddress?.emailAddress}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider flex items-center gap-1">
                                        {profile?.role === 'student' && <GraduationCap className="w-3 h-3" />}
                                        {profile?.role === 'faculty' && <Users className="w-3 h-3" />}
                                        {profile?.role === 'admin' && <Shield className="w-3 h-3" />}
                                        {profile?.role}
                                    </span>
                                    {profile?.role_id && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold">
                                            {profile.role_id}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ─── Edit Profile Section ─── */}
                    {!editing ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                            {/* Info Cards */}
                            <div className="bg-card rounded-2xl border border-border/50 mb-4 overflow-hidden">
                                {[
                                    { icon: BookOpen, label: profile?.role === 'student' ? 'Course / Branch' : 'Department', value: profile?.department_id || profile?.course_id || 'Not set' },
                                    ...(profile?.role === 'student' ? [
                                        { icon: GraduationCap, label: 'Year', value: STUDENT_YEARS.find(y => y.id === profile?.year)?.label || profile?.year || 'Not set' },
                                        { icon: Users, label: 'Section', value: profile?.section ? `Section ${profile?.section}` : 'Not set' }
                                    ] : profile?.role === 'faculty' || profile?.role === 'staff' || profile?.role === 'admin' ? [
                                        { icon: Briefcase, label: 'Staff Category', value: STAFF_TYPES.find(s => s.id === profile?.staff_type)?.label || profile?.staff_type || 'Not set' }
                                    ] : []),
                                    { icon: Phone, label: 'Mobile', value: profile?.mobile_no || 'Not set' },
                                    { icon: Home, label: 'Address', value: profile?.address || 'Not set' },
                                ].map((item, i, arr) => (
                                    <div key={item.label} className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-border/20' : ''}`}>
                                        <item.icon className="w-4 h-4 text-primary shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                                            <p className="text-sm text-foreground truncate">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={startEditing}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary font-semibold text-sm border border-primary/20 hover:bg-primary/20 transition-colors mb-5"
                            >
                                <Pencil className="w-4 h-4" /> Edit Profile
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card rounded-2xl p-4 border border-border/50 mb-5 space-y-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-foreground">Edit Profile</h3>
                                <div className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                    <Save className="w-3 h-3" /> Changes save to database
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* Read-only: Username & Email */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1">🔒 Username</label>
                                        <input
                                            value={user?.username || profile?.username || '—'}
                                            disabled
                                            title="Username"
                                            className="w-full bg-muted/20 border border-border/30 rounded-xl px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1">🔒 Email</label>
                                        <input
                                            value={user?.primaryEmailAddress?.emailAddress || '—'}
                                            disabled
                                            title="Email"
                                            className="w-full bg-muted/20 border border-border/30 rounded-xl px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {/* Full Name */}
                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pl-1">Full Name</label>
                                    <input
                                        value={editForm.full_name}
                                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                        title="Full name"
                                        className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>

                                {/* Role Selector */}
                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pl-1">Role</label>
                                    <select
                                        value={editForm.role}
                                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                        title="Role"
                                        className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                                    >
                                        <option value="student">Student</option>
                                        <option value="faculty">Faculty</option>
                                        <option value="admin">Admin</option>
                                        <option value="visitor">Visitor</option>
                                    </select>
                                </div>

                                {/* Department / Course — based on selected role */}
                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pl-1">
                                        {editForm.role === 'student' ? 'Course / Department' : 'Department'}
                                    </label>
                                    <select
                                        value={editForm.role === 'student' ? editForm.course_id : editForm.department_id}
                                        onChange={(e) => {
                                            if (editForm.role === 'student') {
                                                setEditForm({ ...editForm, course_id: e.target.value });
                                            } else {
                                                setEditForm({ ...editForm, department_id: e.target.value });
                                            }
                                        }}
                                        title={editForm.role === 'student' ? 'Course or department' : 'Department'}
                                        className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                                    >
                                        <option value="">Select...</option>
                                        {ENGINEERING_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>

                                {/* Role Specific Selectors */}
                                {editForm.role === 'student' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pl-1">Year</label>
                                            <select
                                                value={editForm.year}
                                                onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                                                title="Year"
                                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1"
                                            >
                                                <option value="">Select...</option>
                                                {STUDENT_YEARS.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pl-1">Section</label>
                                            <select
                                                value={editForm.section}
                                                onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                                                title="Section"
                                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1"
                                            >
                                                <option value="">Select...</option>
                                                {CLASS_SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                                
                                {(editForm.role === 'faculty' || editForm.role === 'staff' || editForm.role === 'admin') && (
                                    <div>
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pl-1">Staff Category</label>
                                        <select
                                            value={editForm.staff_type}
                                            onChange={(e) => setEditForm({ ...editForm, staff_type: e.target.value })}
                                            title="Staff category"
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

                                {/* Mobile + Role ID */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pl-1">
                                            {editForm.role === 'student' ? 'Roll No.' : 'ID / Register No.'}
                                        </label>
                                        <input
                                            value={editForm.role_id}
                                            onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
                                            title="Role ID"
                                            className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pl-1">Mobile No.</label>
                                        <input
                                            value={editForm.mobile_no}
                                            onChange={(e) => setEditForm({ ...editForm, mobile_no: e.target.value })}
                                            type="tel"
                                            title="Mobile number"
                                            className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pl-1">Address</label>
                                    <textarea
                                        value={editForm.address}
                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                        rows={2}
                                        title="Address"
                                        className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setEditing(false)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-foreground font-medium text-sm border border-border hover:bg-muted/80 transition-colors"
                                >
                                    <X className="w-4 h-4" /> Discard
                                </button>
                                <button
                                    onClick={() => setShowConfirm(true)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all"
                                >
                                    <Save className="w-4 h-4" /> Save
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── Confirm Dialog ─── */}
                    {showConfirm && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-6">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                            >
                                <h3 className="text-lg font-bold text-foreground mb-2">Save Changes?</h3>
                                <p className="text-sm text-muted-foreground mb-5">
                                    Your profile information will be updated in the database.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        className="flex-1 py-2.5 rounded-xl bg-muted text-foreground font-medium text-sm border border-border"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg"
                                    >
                                        Save
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-3 gap-3 mb-5"
                    >
                        <div className="bg-card rounded-2xl p-3 border border-border/50 text-center">
                            <CheckCircle className="w-4 h-4 text-primary mx-auto mb-1" />
                            <p className="text-lg font-bold text-foreground">{todayCount}</p>
                            <p className="text-[10px] text-muted-foreground">Today</p>
                        </div>
                        <div className="bg-card rounded-2xl p-3 border border-border/50 text-center">
                            <Calendar className="w-4 h-4 text-accent mx-auto mb-1" />
                            <p className="text-lg font-bold text-foreground">{weekCount}</p>
                            <p className="text-[10px] text-muted-foreground">This Week</p>
                        </div>
                        <div className="bg-card rounded-2xl p-3 border border-border/50 text-center">
                            <TrendingUp className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                            <p className="text-lg font-bold text-foreground">{totalCount}</p>
                            <p className="text-[10px] text-muted-foreground">Total</p>
                        </div>
                    </motion.div>

                    {/* Weekly Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-card rounded-2xl p-4 border border-border/50 mb-5"
                    >
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <BarChart className="w-3.5 h-3.5" />
                            Weekly Activity
                        </h3>
                        <div className="h-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 15%, 18%)" />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fill: 'hsl(200, 10%, 55%)', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: 'hsl(200, 10%, 55%)', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'hsl(200, 20%, 10%)',
                                            border: '1px solid hsl(200, 15%, 18%)',
                                            borderRadius: '12px',
                                            color: 'hsl(180, 10%, 94%)',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Bar dataKey="count" fill="hsl(174, 62%, 47%)" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Recent Locations */}
                    {recentLocations.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-card rounded-2xl border border-border/50 mb-5 overflow-hidden"
                        >
                            <div className="px-4 py-3 border-b border-border/30">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    Recent Locations
                                </h3>
                            </div>
                            {recentLocations.map((record, i) => (
                                <div
                                    key={record.id}
                                    className={`flex items-center gap-3 px-4 py-3 ${i < recentLocations.length - 1 ? 'border-b border-border/20' : ''}`}
                                >
                                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground truncate">
                                            {record.building_name || record.building_id}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {format(new Date(record.checked_in_at), 'MMM dd, hh:mm a')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* Quick Links + Theme Toggle */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="space-y-2 mb-5"
                    >
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border/40 hover:border-border/60 transition-colors text-left"
                        >
                            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                                {theme === 'dark' ? <Moon className="w-4 h-4 text-foreground" /> : <Sun className="w-4 h-4 text-foreground" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">Theme</p>
                                <p className="text-[10px] text-muted-foreground capitalize">{theme} Mode</p>
                            </div>
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-muted'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                        </button>

                        {[
                            { icon: BookOpen, label: 'Campus Directory', desc: 'Browse all locations' },
                            { icon: Settings, label: 'Preferences', desc: 'Notification & accessibility settings' },
                        ].map((link) => (
                            <button
                                key={link.label}
                                className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border/40 hover:border-border/60 transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                                    <link.icon className="w-4 h-4 text-foreground" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">{link.label}</p>
                                    <p className="text-[10px] text-muted-foreground">{link.desc}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                        ))}
                    </motion.div>
                </>
            )}
        </div>
    );
};

export default Profile;
