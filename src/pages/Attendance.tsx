import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Clock, Calendar, CheckCircle, Users, Plus, ArrowRight, Flame, ScanLine, User, Mail, Phone, MapPin, BookOpen, Hash } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { useBuildings } from '@/hooks/useBuildings';
import QRScanner from '@/components/QRScanner';
import QRGenerator from '@/components/QRGenerator';
import { toast } from 'sonner';
import { format, isToday, isThisWeek } from 'date-fns';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@clerk/clerk-react';

type HistoryFilter = 'today' | 'week' | 'all';

interface ScannedPerson {
    name: string;
    email: string;
    mobile: string;
    college: string;
    branch: string;
    year: string;
    section: string;
    rollNo: string;
    role: string;
    timestamp: string;
}

const Attendance = () => {
    const { user } = useUser();
    const { profile } = useProfile();
    const role = profile?.role || 'student';

    const [showScanner, setShowScanner] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);
    const [filter, setFilter] = useState<HistoryFilter>('today');
    const [lastScan, setLastScan] = useState<any>(null);
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

    // Creator-side: people who scanned the QR
    const [scannedPeople, setScannedPeople] = useState<ScannedPerson[]>([]);

    const { records, isLoading, creatorSessions, isCreatorLoading, todayCount, weekCount, checkIn } = useAttendance();
    const { data: buildings } = useBuildings();

    const handleScan = useCallback(
        async (data: string) => {
            setShowScanner(false);
            try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'CAMPUSMATE_ATTENDANCE') {
                    setLastScan(parsed);
                    const buildingId = buildings?.[0]?.id || 'general-checkin';
                    try {
                        const guestMeta = {
                            name: profile?.full_name || user?.fullName || 'Unknown',
                            email: user?.primaryEmailAddress?.emailAddress || '',
                            mobile: profile?.mobile_no || '',
                            college: profile?.college_id || '',
                            branch: profile?.course_id || profile?.department_id || '',
                            year: profile?.year || '', 
                            section: profile?.section || '',
                            rollNo: profile?.role_id || '',
                            role: profile?.role || 'student',
                            timestamp: new Date().toISOString(),
                        };
                        
                        await checkIn({ 
                            buildingId, 
                            method: 'qr', 
                            sessionId: parsed.session_id,
                            metadata: guestMeta
                        });
                        
                        setScannedPeople(prev => [guestMeta as unknown as ScannedPerson, ...prev]);
                        toast.success('✅ Attendance Marked!', { description: `${parsed.session.name}` });
                    } catch { toast.error('Check-in failed'); }
                    return;
                }
            } catch { }
            // Legacy
            const buildingId = data.replace('CAMPUS_', '').toLowerCase().replace(/_/g, '-');
            const building = buildings?.find(b => b.id === buildingId || b.qr_code === data);
            if (!building) { toast.error('Unknown QR Code'); return; }
            try {
                await checkIn({ buildingId: building.id, method: 'qr' });
                toast.success('Checked In!', { description: building.name });
            } catch { toast.error('Check-in Failed'); }
        },
        [buildings, checkIn, profile, user]
    );

    const filteredRecords = records.filter(r => {
        const d = new Date(r.checked_in_at);
        if (filter === 'today') return isToday(d);
        if (filter === 'week') return isThisWeek(d);
        return true;
    });

    const roleBadge = role === 'admin' ? 'bg-amber-500' : role === 'faculty' ? 'bg-emerald-600' : role === 'staff' ? 'bg-violet-500' : 'bg-primary';

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 bg-card border-b border-border shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center justify-between mb-0.5">
                    <h1 className="text-xl font-heading font-bold">Attendance</h1>
                    <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${roleBadge} text-white`}>{role}</span>
                </div>
                <p className="text-muted-foreground text-xs">Create or scan QR for attendance</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide pb-24">

                {/* ── Two Action Buttons: Create QR + Scan QR ── */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setShowGenerator(true)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl ${roleBadge} text-white font-semibold shadow-lg active:scale-[0.97] transition-all`}
                    >
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <QrCode className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold">Create QR</span>
                        <span className="text-[9px] opacity-80">For others to scan</span>
                    </button>
                    <button
                        onClick={() => setShowScanner(true)}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border text-foreground font-semibold shadow-sm active:scale-[0.97] transition-all"
                    >
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <ScanLine className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-xs font-bold">Scan QR</span>
                        <span className="text-[9px] text-muted-foreground">Check-in attendance</span>
                    </button>
                </div>

                {/* Last scanned session */}
                {lastScan && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-primary/5 border border-primary/20 rounded-2xl p-3">
                        <p className="text-[9px] text-primary font-bold uppercase tracking-wider mb-1">Last Check-In</p>
                        <p className="text-sm font-semibold">{lastScan.session.name}</p>
                        <p className="text-[11px] text-muted-foreground">{lastScan.session.course} • {lastScan.session.date} • By: {lastScan.creator.name}</p>
                    </motion.div>
                )}

                {/* ── Creator's Sessions ── */}
                {creatorSessions?.length > 0 && (
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-heading font-bold text-sm flex items-center gap-1.5">
                                <QrCode className="w-4 h-4 text-primary" /> Generated QRs ({creatorSessions.length})
                            </h3>
                        </div>
                        {creatorSessions.map((session: any) => {
                            const isExpanded = expandedSessionId === session.id;
                            const attendees = session.attendance_records || [];
                            
                            return (
                                <motion.div key={session.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                                    {/* Session Header (Clickable) */}
                                    <button 
                                        onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                        className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                                    >
                                        <div>
                                            <h4 className="font-bold text-sm">{session.session_name}</h4>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                {format(new Date(session.created_at), 'MMM d, yyyy • h:mm a')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                {attendees.length} Scans
                                            </span>
                                        </div>
                                    </button>
                                    
                                    {/* Attendees List (Expanded) */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }} 
                                                animate={{ height: 'auto', opacity: 1 }} 
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-border/50 bg-muted/10 divide-y divide-border/50"
                                            >
                                                {attendees.length > 0 ? attendees.map((record: any, idx: number) => {
                                                    const s = record.metadata || {};
                                                    return (
                                                        <div key={record.id} className="p-3">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                                        <User className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-semibold truncate">{s.name || 'Unknown'}</p>
                                                                        <p className="text-[9px] text-muted-foreground capitalize">{s.role || 'Member'}</p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[8px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shrink-0">
                                                                    <CheckCircle className="w-2.5 h-2.5" /> {format(new Date(record.checked_in_at), 'h:mm a')}
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] pl-9">
                                                                <span className="flex items-center gap-1 text-muted-foreground truncate"><Mail className="w-2.5 h-2.5 shrink-0" /> {s.email || '—'}</span>
                                                                <span className="flex items-center gap-1 text-muted-foreground truncate"><Phone className="w-2.5 h-2.5 shrink-0" /> {s.mobile || '—'}</span>
                                                                <span className="flex items-center gap-1 text-muted-foreground truncate"><BookOpen className="w-2.5 h-2.5 shrink-0" /> {s.branch || '—'}</span>
                                                                <span className="flex items-center gap-1 text-muted-foreground truncate"><Hash className="w-2.5 h-2.5 shrink-0" /> {s.rollNo || '—'}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }) : (
                                                    <div className="p-6 text-center text-xs text-muted-foreground">
                                                        No attendees have scanned this QR yet.
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* ── Stats Cards ── */}
                <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-card border border-border p-3 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-[9px] font-semibold uppercase tracking-wider">Week</span>
                        </div>
                        <div className="text-xl font-bold font-heading">{weekCount} <span className="text-xs font-normal text-muted-foreground">days</span></div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-2xl shadow-sm relative overflow-hidden">
                        <div className="absolute -right-1 -top-1 opacity-5"><Flame className="w-16 h-16" /></div>
                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-[9px] font-semibold uppercase tracking-wider">Today</span>
                        </div>
                        <div className="text-xl font-bold font-heading">{todayCount} <span className="text-xs font-normal text-muted-foreground">check-ins</span></div>
                    </div>
                </div>

                {/* ── History ── */}
                <div>
                    <h3 className="font-heading font-bold text-sm mb-2 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-primary" /> History
                    </h3>
                    <div className="flex gap-1.5 mb-3">
                        {(['today', 'week', 'all'] as HistoryFilter[]).map(tab => (
                            <button key={tab} onClick={() => setFilter(tab)}
                                className={`px-3 py-1 rounded-full text-[10px] font-semibold capitalize ${filter === tab ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}
                            >{tab}</button>
                        ))}
                    </div>
                    <div className="space-y-2">
                        {isLoading ? (
                            <div className="text-center py-6 text-muted-foreground animate-pulse text-xs">Loading...</div>
                        ) : filteredRecords.length > 0 ? (
                            filteredRecords.map(record => (
                                <motion.div key={record.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-xs truncate">{record.building_name || 'Location'}</h4>
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" /> {format(new Date(record.checked_in_at), 'h:mm a • MMM d')}
                                        </p>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-8 bg-card rounded-xl border border-dashed border-border">
                                <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                                <p className="text-muted-foreground text-xs">No check-ins {filter === 'today' ? 'today' : filter === 'week' ? 'this week' : 'yet'}</p>
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
