import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Clock, Calendar, CheckCircle, Users, Flame, ScanLine, User, Mail, Phone, BookOpen, Hash, Trash2, Pencil, Save, X, Eye, Edit3, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAttendance } from '@/hooks/useAttendance';
import { useBuildings } from '@/hooks/useBuildings';
import { useColleges } from '@/hooks/useColleges';
import QRScanner from '@/components/QRScanner';
import QRGenerator from '@/components/QRGenerator';
import { toast } from 'sonner';
import { format, isToday, isThisWeek } from 'date-fns';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@clerk/clerk-react';
import { ENGINEERING_DEPARTMENTS, STUDENT_YEARS, CLASS_SECTIONS, STAFF_TYPES } from '@/lib/collegeData';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();
    const { user } = useUser();
    const { profile } = useProfile();
    const role = profile?.role || 'student';

    const [showScanner, setShowScanner] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);
    const [filter, setFilter] = useState<HistoryFilter>('today');
    const [lastScan, setLastScan] = useState<any>(null);
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [viewerSession, setViewerSession] = useState<any | null>(null);
    const viewerQrRef = useRef<HTMLDivElement>(null);
    const [editingDetailsSessionId, setEditingDetailsSessionId] = useState<string | null>(null);
    const [editDetails, setEditDetails] = useState({
        college_id: '',
        target_audience: 'students',
        department: '',
        year: '',
        section: '',
        staff_type: '',
    });

    // Creator-side: people who scanned the QR
    const [scannedPeople, setScannedPeople] = useState<ScannedPerson[]>([]);

    const { records, isLoading, creatorSessions, isCreatorLoading, todayCount, weekCount, checkIn, deleteSession, updateSession } = useAttendance();
    const { data: buildings } = useBuildings();
    const { data: colleges } = useColleges();

    const buildSessionQrPayload = useCallback((session: any) => {
        return JSON.stringify({
            type: 'CAMPUSMATE_ATTENDANCE',
            session_id: session.id,
            creator: {
                name: profile?.full_name || user?.fullName || 'Unknown',
                email: user?.primaryEmailAddress?.emailAddress || '',
                role: profile?.role || 'student',
                mobile: profile?.mobile_no || '',
                college: session.college_id || profile?.college_id || '',
                rollNo: profile?.role_id || '',
            },
            session: {
                name: session.session_name || 'Attendance Session',
                targetAudience: session.target_audience || 'students',
                department: session.department || '',
                ...(session.target_audience === 'staff'
                    ? { staffType: session.staff_type || '' }
                    : { year: session.year || '', section: session.section || '' }),
                date: session.created_at ? new Date(session.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                time: session.created_at
                    ? new Date(session.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                createdAt: session.created_at || new Date().toISOString(),
            },
        });
    }, [profile, user]);

    const startEditDetails = (session: any) => {
        setEditingDetailsSessionId(session.id);
        setEditDetails({
            college_id: session.college_id || '',
            target_audience: session.target_audience || 'students',
            department: session.department || ENGINEERING_DEPARTMENTS[0],
            year: session.year || STUDENT_YEARS[0].id,
            section: session.section || CLASS_SECTIONS[0],
            staff_type: session.staff_type || STAFF_TYPES[0].id,
        });
    };

    const saveSessionDetails = async (sessionId: string) => {
        try {
            await updateSession({
                sessionId,
                updates: {
                    college_id: editDetails.college_id || null,
                    target_audience: editDetails.target_audience,
                    department: editDetails.department || null,
                    year: editDetails.target_audience === 'students' ? editDetails.year || null : null,
                    section: editDetails.target_audience === 'students' ? editDetails.section || null : null,
                    staff_type: editDetails.target_audience === 'staff' ? editDetails.staff_type || null : null,
                },
            });
            setEditingDetailsSessionId(null);
            toast.success('Session fields updated');
        } catch (e: any) {
            toast.error(e?.message || 'Failed to update fields');
        }
    };

    const handleDownloadViewedQr = useCallback(() => {
        const svgEl = viewerQrRef.current?.querySelector('svg');
        if (!svgEl || !viewerSession) return;

        const svgData = new XMLSerializer().serializeToString(svgEl);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width * 2;
            canvas.height = img.height * 2;
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const link = document.createElement('a');
                link.download = `attendance-${String(viewerSession.session_name || 'session').replace(/\s+/g, '_')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                toast.success('QR downloaded');
            }
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }, [viewerSession]);

    const handleScan = useCallback(
        async (data: string) => {
            setShowScanner(false);
            try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'CAMPUSMATE_ATTENDANCE') {
                    const shouldMarkAttendance = window.confirm(
                        `Confirm attendance?\n\nSession: ${parsed.session?.name || 'Attendance Session'}\nDepartment: ${parsed.session?.department || 'N/A'}\nCreated by: ${parsed.creator?.name || 'Unknown'}`
                    );

                    if (!shouldMarkAttendance) {
                        toast.info('Attendance cancelled');
                        return;
                    }

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
                    } catch (e: any) {
                        toast.error(e?.message || 'Check-in failed');
                    }
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
            } catch (e: any) { toast.error(e?.message || 'Check-in Failed'); }
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
                                <motion.div
                                    key={session.id}
                                    onClick={() => navigate(`/attendance/session/${session.id}`)}
                                    className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.995] transition-transform"
                                    title="Open QR session details"
                                >
                                    {/* Session Header */}
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex-1 text-left hover:opacity-80 transition-opacity min-w-0">
                                            {editingSessionId === session.id ? (
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        autoFocus
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        title="Session name"
                                                        placeholder="Session name"
                                                        className="bg-muted/50 border border-border rounded-lg px-2 py-1 text-sm font-bold w-full outline-none focus:ring-1 focus:ring-primary"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                updateSession({ sessionId: session.id, updates: { session_name: editName.trim() } });
                                                                setEditingSessionId(null);
                                                                toast.success('Session renamed');
                                                            }
                                                            if (e.key === 'Escape') setEditingSessionId(null);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateSession({ sessionId: session.id, updates: { session_name: editName.trim() } });
                                                            setEditingSessionId(null);
                                                            toast.success('Session renamed');
                                                        }}
                                                        className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0"
                                                        title="Save name"
                                                    >
                                                        <Save className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingSessionId(null); }}
                                                        className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0"
                                                        title="Cancel rename"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <h4 className="font-bold text-sm truncate">{session.session_name}</h4>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        {format(new Date(session.created_at), 'MMM d, yyyy • h:mm a')}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                {attendees.length} Scans
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setViewerSession(session);
                                                }}
                                                className="w-7 h-7 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
                                                title="View QR"
                                            >
                                                <Eye className="w-3 h-3" />
                                            </button>
                                            {editingSessionId !== session.id && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingSessionId(session.id);
                                                            setEditName(session.session_name || '');
                                                        }}
                                                        className="w-7 h-7 rounded-lg bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                                                        title="Rename session"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm('Delete this QR session and all its attendance records?')) {
                                                                deleteSession(session.id);
                                                                toast.success('Session deleted');
                                                            }
                                                        }}
                                                        className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
                                                        title="Delete session"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Attendees List (Expanded) */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }} 
                                                animate={{ height: 'auto', opacity: 1 }} 
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-border/50 bg-muted/10 divide-y divide-border/50"
                                            >
                                                <div className="p-3 bg-background/70">
                                                    {editingDetailsSessionId === session.id ? (
                                                        <div className="space-y-2">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <select
                                                                    value={editDetails.college_id}
                                                                    onChange={(e) => setEditDetails(prev => ({ ...prev, college_id: e.target.value }))}
                                                                    title="College"
                                                                    className="bg-muted/60 border border-border rounded-lg px-2 py-1.5 text-[11px]"
                                                                >
                                                                    <option value="">Select College</option>
                                                                    {colleges?.map(c => (
                                                                        <option key={c.id} value={c.id}>{c.short_name}</option>
                                                                    ))}
                                                                </select>
                                                                <select
                                                                    value={editDetails.target_audience}
                                                                    onChange={(e) => setEditDetails(prev => ({ ...prev, target_audience: e.target.value as 'students' | 'staff' }))}
                                                                    title="Target audience"
                                                                    className="bg-muted/60 border border-border rounded-lg px-2 py-1.5 text-[11px]"
                                                                >
                                                                    <option value="students">Students</option>
                                                                    <option value="staff">Staff</option>
                                                                </select>
                                                            </div>
                                                            <select
                                                                value={editDetails.department}
                                                                onChange={(e) => setEditDetails(prev => ({ ...prev, department: e.target.value }))}
                                                                title="Department"
                                                                className="w-full bg-muted/60 border border-border rounded-lg px-2 py-1.5 text-[11px]"
                                                            >
                                                                {ENGINEERING_DEPARTMENTS.map(d => (
                                                                    <option key={d} value={d}>{d}</option>
                                                                ))}
                                                            </select>
                                                            {editDetails.target_audience === 'students' ? (
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <select
                                                                        value={editDetails.year}
                                                                        onChange={(e) => setEditDetails(prev => ({ ...prev, year: e.target.value }))}
                                                                        title="Year"
                                                                        className="bg-muted/60 border border-border rounded-lg px-2 py-1.5 text-[11px]"
                                                                    >
                                                                        {STUDENT_YEARS.map(y => (
                                                                            <option key={y.id} value={y.id}>{y.label}</option>
                                                                        ))}
                                                                    </select>
                                                                    <select
                                                                        value={editDetails.section}
                                                                        onChange={(e) => setEditDetails(prev => ({ ...prev, section: e.target.value }))}
                                                                        title="Section"
                                                                        className="bg-muted/60 border border-border rounded-lg px-2 py-1.5 text-[11px]"
                                                                    >
                                                                        {CLASS_SECTIONS.map(s => (
                                                                            <option key={s} value={s}>Section {s}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            ) : (
                                                                <select
                                                                    value={editDetails.staff_type}
                                                                    onChange={(e) => setEditDetails(prev => ({ ...prev, staff_type: e.target.value }))}
                                                                    title="Staff type"
                                                                    className="w-full bg-muted/60 border border-border rounded-lg px-2 py-1.5 text-[11px]"
                                                                >
                                                                    {STAFF_TYPES.map(s => (
                                                                        <option key={s.id} value={s.id}>{s.label}</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => saveSessionDetails(session.id)}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold"
                                                                >
                                                                    Save fields
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingDetailsSessionId(null)}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-semibold"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="text-[10px] text-muted-foreground">
                                                                <p>College: <span className="text-foreground font-medium">{colleges?.find(c => c.id === session.college_id)?.short_name || '—'}</span></p>
                                                                <p>Target: <span className="text-foreground font-medium capitalize">{session.target_audience || 'students'}</span></p>
                                                                <p>
                                                                    Scope: <span className="text-foreground font-medium">{session.department || '—'}
                                                                        {session.target_audience === 'staff'
                                                                            ? ` • ${(STAFF_TYPES.find(s => s.id === session.staff_type)?.label || 'Any Staff')}`
                                                                            : ` • ${(STUDENT_YEARS.find(y => y.id === session.year)?.label || 'Any Year')} • Sec ${session.section || '—'}`}
                                                                    </span>
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startEditDetails(session);
                                                                }}
                                                                className="h-7 px-2 rounded-lg bg-muted/70 text-muted-foreground hover:text-foreground flex items-center gap-1 text-[10px] font-semibold"
                                                            >
                                                                <Edit3 className="w-3 h-3" /> Edit fields
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
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

            <AnimatePresence>
                {viewerSession && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1100] bg-background/95 backdrop-blur flex items-center justify-center p-4"
                    >
                        <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-4 shadow-2xl relative">
                            <button
                                onClick={() => setViewerSession(null)}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
                                title="Close QR preview"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="text-center mb-3">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Session QR</p>
                                <h4 className="font-bold text-sm mt-1">{viewerSession.session_name}</h4>
                            </div>
                            <div ref={viewerQrRef} className="bg-white rounded-2xl p-3 flex items-center justify-center mb-3">
                                <QRCodeSVG value={buildSessionQrPayload(viewerSession)} size={220} level="H" includeMargin={true} />
                            </div>
                            <button
                                onClick={handleDownloadViewedQr}
                                className="w-full mb-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5"
                                title="Download QR"
                            >
                                <Download className="w-3.5 h-3.5" /> Download QR
                            </button>
                            <p className="text-[10px] text-muted-foreground text-center">Ask attendees to scan and confirm attendance.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {showGenerator && <QRGenerator onClose={() => setShowGenerator(false)} />}
        </div>
    );
};

export default Attendance;
