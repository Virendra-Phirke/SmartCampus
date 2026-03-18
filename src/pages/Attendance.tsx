import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Clock, Calendar, CheckCircle, GraduationCap, Users, UserCog, Plus, ArrowRight, Flame } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { useBuildings } from '@/hooks/useBuildings';
import QRScanner from '@/components/QRScanner';
import QRGenerator from '@/components/QRGenerator';
import { toast } from 'sonner';
import { format, isToday, isThisWeek } from 'date-fns';
import { ENGINEERING_DEPARTMENTS, STAFF_TYPES, STUDENT_YEARS, CLASS_SECTIONS } from '@/lib/collegeData';
import { useProfile } from '@/hooks/useProfile';
import { useEffect } from 'react';

type RoleTab = 'student' | 'staff' | 'admin';
type HistoryFilter = 'today' | 'week' | 'all';

const Attendance = () => {
    const { profile } = useProfile();
    const [activeRole, setActiveRole] = useState<RoleTab>('student');

    useEffect(() => {
        if (profile?.role === 'admin') setActiveRole('admin');
        else if (profile?.role === 'faculty') setActiveRole('staff');
        else if (profile?.role === 'student') setActiveRole('student');
    }, [profile?.role]);
    const [showScanner, setShowScanner] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);
    const [filter, setFilter] = useState<HistoryFilter>('today');

    // --- State for Selectors ---
    const [studentCourse, setStudentCourse] = useState<string>(ENGINEERING_DEPARTMENTS[0]);
    const [studentYear, setStudentYear] = useState<string>(STUDENT_YEARS[0].id);
    const [studentSection, setStudentSection] = useState<string>(CLASS_SECTIONS[0]);

    const [staffType, setStaffType] = useState<string>(STAFF_TYPES[0].id);
    const [staffDept, setStaffDept] = useState<string>(ENGINEERING_DEPARTMENTS[0]);

    const { records, isLoading, todayCount, weekCount, totalCount, checkIn, isCheckingIn } = useAttendance();
    const { data: buildings } = useBuildings();

    const handleScan = useCallback(
        async (data: string) => {
            setShowScanner(false);
            const buildingId = data.replace('CAMPUS_', '').toLowerCase().replace(/_/g, '-');
            const building = buildings?.find((b) => b.id === buildingId || b.qr_code === data);

            if (!building) {
                toast.error('Unknown QR Code', { description: 'Not recognized as a campus location.' });
                return;
            }

            try {
                // In a real app we'd pass the course/section/staff details to the backend here
                await checkIn({ buildingId: building.id, method: 'qr' });
                toast.success('Attendance Marked!', {
                    description: `Recorded at ${building.name}`,
                    icon: <CheckCircle className="w-4 h-4" />,
                });
            } catch (err) {
                toast.error('Check-in Failed', { description: 'Could not record your attendance.' });
            }
        },
        [buildings, checkIn]
    );

    const filteredRecords = records.filter((r) => {
        const date = new Date(r.checked_in_at);
        if (filter === 'today') return isToday(date);
        if (filter === 'week') return isThisWeek(date);
        return true;
    });

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-background">

            {/* Header Area */}
            <div className="px-4 pt-6 pb-4 bg-card border-b border-border shadow-sm z-10 flex-shrink-0">
                <h1 className="text-2xl font-heading font-bold mb-1">Attendance</h1>
                <p className="text-muted-foreground text-sm">Manage your daily campus presence.</p>

                {/* Role Tabs */}
                <div className="flex bg-muted/50 p-1 rounded-xl mt-4">
                    <button
                        onClick={() => setActiveRole('student')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${activeRole === 'student' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <GraduationCap className="w-4 h-4" /> Student
                    </button>
                    <button
                        onClick={() => setActiveRole('staff')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${activeRole === 'staff' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <Users className="w-4 h-4" /> Staff
                    </button>
                    <button
                        onClick={() => setActiveRole('admin')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${activeRole === 'admin' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <UserCog className="w-4 h-4" /> Faculty
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">

                {/* ---------- STUDENT TAB ---------- */}
                {activeRole === 'student' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
                            <h2 className="font-semibold text-sm flex items-center gap-2 text-primary">
                                <GraduationCap className="w-4 h-4" /> Academic Profile
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Course / Branch</label>
                                    <select value={studentCourse} onChange={(e) => setStudentCourse(e.target.value as any)} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                                        {ENGINEERING_DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Year</label>
                                        <select value={studentYear} onChange={(e) => setStudentYear(e.target.value as any)} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                                            {STUDENT_YEARS.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Section</label>
                                        <select value={studentSection} onChange={(e) => setStudentSection(e.target.value as any)} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                                            {CLASS_SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowScanner(true)}
                            className="w-full flex items-center justify-between py-4 px-5 rounded-2xl bg-primary text-primary-foreground font-heading font-semibold text-base glow-primary transition-all active:scale-[0.98] shadow-lg"
                        >
                            <span className="flex items-center gap-3">
                                <QrCode className="w-6 h-6" /> Scan Class QR
                            </span>
                            <ArrowRight className="w-5 h-5 opacity-70" />
                        </button>
                    </motion.div>
                )}

                {/* ---------- STAFF TAB ---------- */}
                {activeRole === 'staff' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
                            <h2 className="font-semibold text-sm flex items-center gap-2 text-emerald-500">
                                <Users className="w-4 h-4" /> Staff Identity
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Role / Title</label>
                                    <select value={staffType} onChange={(e) => setStaffType(e.target.value as any)} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                                        {STAFF_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Department</label>
                                    <select value={staffDept} onChange={(e) => setStaffDept(e.target.value as any)} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                                        {ENGINEERING_DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                        <option value="Admin">Central Administration</option>
                                        <option value="Library">Library</option>
                                        <option value="Hostel">Hostel Management</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowScanner(true)}
                            className="w-full flex items-center justify-between py-4 px-5 rounded-2xl bg-emerald-600 text-white font-heading font-semibold text-base transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/20"
                        >
                            <span className="flex items-center gap-3">
                                <QrCode className="w-6 h-6" /> Scan Daily Check-In
                            </span>
                            <ArrowRight className="w-5 h-5 opacity-70" />
                        </button>
                    </motion.div>
                )}

                {/* ---------- FACULTY / ADMIN TAB ---------- */}
                {activeRole === 'admin' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center">
                            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                <QrCode className="w-6 h-6 text-accent" />
                            </div>
                            <h3 className="font-heading font-bold text-lg mb-1">Host a Session</h3>
                            <p className="text-sm text-muted-foreground mb-4">Generate a live QR code for students or staff to scan for attendance.</p>

                            <button
                                onClick={() => setShowGenerator(true)}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm transition-all shadow-md active:scale-[0.98]"
                            >
                                <Plus className="w-5 h-5" /> Create QR Session
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ---------- STATS & HISTORY (Common) ---------- */}
                <div className="pt-4 border-t border-border">
                    <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" /> My History
                    </h3>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider">This Week</span>
                            </div>
                            <div className="text-2xl font-bold font-heading">{weekCount} <span className="text-sm font-normal text-muted-foreground">days</span></div>
                        </div>
                        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm relative overflow-hidden">
                            <div className="absolute -right-2 -top-2 opacity-5">
                                <Flame className="w-20 h-20" />
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <Flame className="w-4 h-4 text-orange-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Streak</span>
                            </div>
                            <div className="text-2xl font-bold font-heading">{todayCount > 0 ? todayCount + 2 : todayCount} <span className="text-sm font-normal text-muted-foreground">days</span></div>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                        {(['today', 'week', 'all'] as HistoryFilter[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${filter === tab ? 'bg-foreground text-background shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3 pb-20">
                        {isLoading ? (
                            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading records...</div>
                        ) : filteredRecords.length > 0 ? (
                            filteredRecords.map((record) => (
                                <motion.div
                                    key={record.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm"
                                >
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                                        <CheckCircle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-sm truncate">{record.building_name || 'Campus Location'}</h4>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                            <Clock className="w-3 h-3" /> {format(new Date(record.checked_in_at), 'h:mm a')}
                                            <span className="mx-1">•</span>
                                            {format(new Date(record.checked_in_at), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-card rounded-2xl border border-dashed border-border">
                                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                                    <Clock className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground font-medium">No check-ins {filter === 'today' ? 'today' : filter === 'week' ? 'this week' : 'yet'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showScanner && (
                    <motion.div className="absolute inset-0 z-50 bg-background">
                        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {showGenerator && <QRGenerator onClose={() => setShowGenerator(false)} />}
        </div>
    );
};

export default Attendance;
