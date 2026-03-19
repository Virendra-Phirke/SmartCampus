import { useState, useRef, useCallback, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, QrCode, Calendar, Clock, BookOpen, Users, MapPin, GraduationCap, Building2, Briefcase, ChevronDown, ChevronRight } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@clerk/clerk-react';
import { ENGINEERING_DEPARTMENTS, STUDENT_YEARS, CLASS_SECTIONS, STAFF_TYPES } from '@/lib/collegeData';
import { useColleges } from '@/hooks/useColleges';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface QRGeneratorProps {
    onClose: () => void;
}

export default function QRGenerator({ onClose }: QRGeneratorProps) {
    const { user } = useUser();
    const { profile } = useProfile();
    const { data: colleges } = useColleges();
    const role = profile?.role || 'student';

    // Session details
    const [sessionName, setSessionName] = useState('');
    const [sessionDescription, setSessionDescription] = useState('');
    const [showOptionalScope, setShowOptionalScope] = useState(false);
    
    // Selectors
    const [collegeId, setCollegeId] = useState(profile?.college_id || '');
    const [department, setDepartment] = useState(profile?.department_id || profile?.course_id || '');
    
    // Student specific
    const [year, setYear] = useState('');
    const [section, setSection] = useState('');
    
    // Staff specific
    const [staffType, setStaffType] = useState('');

    // Target Audience (who is this QR for)
    const [targetAudience, setTargetAudience] = useState<'students' | 'staff'>('students');

    const [generated, setGenerated] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const qrRef = useRef<HTMLDivElement>(null);

    const qrPayload = sessionId ? `CMA:${sessionId}` : 'CMA:PENDING';

    const handleGenerate = async () => {
        if (!sessionName.trim()) {
            toast.error('Please enter a session name');
            return;
        }
        // collegeId, department, year, section are optional
        
        setIsGenerating(true);
        try {
            const { data, error } = await supabase
                .from('attendance_sessions')
                .insert({
                    session_name: sessionName.trim(),
                    description: sessionDescription.trim() || null,
                    college_id: collegeId || null,
                    target_audience: showOptionalScope ? targetAudience : null,
                    department: showOptionalScope ? (department || null) : null,
                    year: showOptionalScope && targetAudience === 'students' && year ? year : null,
                    section: showOptionalScope && targetAudience === 'students' && section ? section : null,
                    staff_type: showOptionalScope && targetAudience === 'staff' && staffType ? staffType : null,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (error) throw error;
            
            setSessionId(data.id);
            setGenerated(true);
        } catch (error) {
            console.error('Error creating session:', error);
            toast.error('Failed to create attendance session. Did you run the database update?');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = useCallback(() => {
        const svgEl = qrRef.current?.querySelector('svg');
        if (!svgEl) return;

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
                link.download = `attendance-${sessionName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                toast.success('QR Code downloaded!');
            }
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }, [sessionName]);

    return (
        <div className="fixed inset-0 z-[1000] bg-background/95 backdrop-blur flex flex-col items-center justify-center p-4">
            <div className="absolute top-4 right-4 z-10">
                <button onClick={onClose} title="Close QR generator" className="p-3 bg-secondary rounded-full hover:bg-secondary/80 transition-colors shadow-sm">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="bg-card w-full max-w-md max-h-[90vh] rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 text-center shrink-0">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-primary/20">
                        <QrCode className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl font-heading font-bold">Create Attendance QR</h2>
                    <p className="text-sm text-muted-foreground mt-1">Configure session details to generate QR</p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
                    {!generated ? (
                        <div className="space-y-4">
                            {/* Session Name */}
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1 font-heading">Session Name *</label>
                                <input
                                    value={sessionName}
                                    onChange={(e) => setSessionName(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary/50 mt-1 transition-all"
                                    placeholder="e.g. Data Structures Lecture"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1 font-heading">Description (optional)</label>
                                <textarea
                                    value={sessionDescription}
                                    onChange={(e) => setSessionDescription(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary/50 mt-1 transition-all resize-none"
                                    rows={2}
                                    placeholder="e.g. Mid-sem attendance for DS lecture"
                                />
                            </div>

                            <button
                                onClick={() => setShowOptionalScope((v) => !v)}
                                className="w-full flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm"
                                title="Toggle optional session filters"
                            >
                                <span className="font-medium">Session / Optional Filters</span>
                                {showOptionalScope ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>

                            {showOptionalScope && (
                                <>
                                    {/* College Selector */}
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1 font-heading">
                                            <Building2 className="w-3 h-3" /> College (optional)
                                        </label>
                                        <select
                                            value={collegeId}
                                            onChange={(e) => setCollegeId(e.target.value)}
                                            title="College"
                                            className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1"
                                        >
                                            <option value="">Any / Not set</option>
                                            {colleges?.map(c => <option key={c.id} value={c.id}>{c.short_name}</option>)}
                                        </select>
                                    </div>

                                    {/* Target Audience Toggle */}
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1 font-heading mb-1 block">Attendance For</label>
                                        <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                                            <button
                                                onClick={() => setTargetAudience('students')}
                                                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${targetAudience === 'students' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                            >Students</button>
                                            <button
                                                onClick={() => setTargetAudience('staff')}
                                                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${targetAudience === 'staff' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                            >Staff / Faculty</button>
                                        </div>
                                    </div>

                                    {/* Department */}
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1 font-heading">
                                            <BookOpen className="w-3 h-3" /> Department / Branch
                                        </label>
                                        <select title="Department" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1">
                                            <option value="">Any / Not set</option>
                                            {ENGINEERING_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>

                                    {/* Conditional Selectors based on Target */}
                                    {targetAudience === 'students' ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1 font-heading">
                                                    <GraduationCap className="w-3 h-3" /> Year
                                                </label>
                                                <select title="Year" value={year} onChange={(e) => setYear(e.target.value)} className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1">
                                                    <option value="">Any</option>
                                                    {STUDENT_YEARS.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1 font-heading">
                                                    <Users className="w-3 h-3" /> Section
                                                </label>
                                                <select title="Section" value={section} onChange={(e) => setSection(e.target.value)} className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1">
                                                    <option value="">Any</option>
                                                    {CLASS_SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1 font-heading">
                                                <Briefcase className="w-3 h-3" /> Staff Category
                                            </label>
                                            <select title="Staff category" value={staffType} onChange={(e) => setStaffType(e.target.value)} className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none mt-1">
                                                <option value="">Any</option>
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
                                </>
                            )}

                            {/* Info Box */}
                            <div className="bg-muted/30 rounded-xl p-3 border border-border/50 text-xs text-muted-foreground">
                                <p className="mb-1 text-foreground font-medium">This QR will record attendance for:</p>
                                <ul className="list-disc pl-4 space-y-0.5 mt-1 opacity-80">
                                    <li>Session: <strong>{sessionName || '...'}</strong></li>
                                    {sessionDescription.trim() && <li>Description: {sessionDescription}</li>}
                                    {showOptionalScope && <li>College: {colleges?.find(c => c.id === collegeId)?.short_name || 'Any'}</li>}
                                    {showOptionalScope && <li>Target: {targetAudience === 'students' ? `${STUDENT_YEARS.find(y=>y.id===year)?.label || 'Any Year'} • ${department || 'Any Dept'} • Sec ${section || 'Any'}` : `${STAFF_TYPES.find(s=>s.id===staffType)?.label || 'Any Staff'} • ${department || 'Any Dept'}`}</li>}
                                    <li>Generated by: {profile?.full_name || 'You'}</li>
                                </ul>
                            </div>

                            {/* Action */}
                            <button
                                onClick={handleGenerate}
                                disabled={!sessionName.trim()}
                                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                            >
                                Generate QR Code
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                            {/* QR Code Canvas */}
                            <div ref={qrRef} className="p-5 bg-white rounded-3xl shadow-md border border-gray-100 mb-6 relative group">
                                <QRCodeSVG
                                    value={qrPayload}
                                    size={260}
                                    level="M"
                                    bgColor="#FFFFFF"
                                    fgColor="#000000"
                                    includeMargin={true}
                                />
                                <div className="absolute inset-0 bg-black/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </div>

                            {/* Session Summary Card */}
                            <div className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm mb-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full pointer-events-none" />
                                
                                <h3 className="font-heading font-bold text-lg mb-1 pr-8">{sessionName}</h3>
                                {sessionDescription.trim() && (
                                    <p className="text-xs text-muted-foreground mb-2">{sessionDescription}</p>
                                )}
                                
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                    {colleges?.find(c => c.id === collegeId)?.short_name || 'Any campus'}
                                </div>

                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs bg-muted/30 p-3 rounded-xl">
                                    <div className="col-span-2 flex items-start gap-2">
                                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                        <span className="font-medium">{showOptionalScope ? (department || 'Any Department') : 'No audience filters'}</span>
                                    </div>
                                    
                                    {showOptionalScope && targetAudience === 'students' ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="font-medium">{STUDENT_YEARS.find(y => y.id === year)?.label || 'Any Year'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="font-medium">Section {section || 'Any'}</span>
                                            </div>
                                        </>
                                    ) : showOptionalScope ? (
                                        <div className="col-span-2 flex items-center gap-2">
                                            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="font-medium">{STAFF_TYPES.find(s => s.id === staffType)?.label || 'Any Staff'}</span>
                                        </div>
                                    ) : (
                                        <div className="col-span-2 text-muted-foreground">Attendees can scan without extra audience filters.</div>
                                    )}
                                    
                                    <div className="col-span-2 flex items-center gap-4 pt-2 mt-1 border-t border-border/50 text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date().toLocaleDateString('en-IN')}</span>
                                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Actions */}
                            <div className="flex gap-3 w-full mt-auto">
                                <button
                                    onClick={() => setGenerated(false)}
                                    className="flex-1 py-3 rounded-xl bg-muted text-foreground font-semibold text-sm border border-border active:scale-95 transition-all"
                                >
                                    Edit Settings
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                >
                                    <Download className="w-4 h-4" /> Download QR
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
