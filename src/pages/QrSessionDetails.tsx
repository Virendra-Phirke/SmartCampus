import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Clock3, Mail, Phone, BookOpen, Hash, School, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/lib/supabase';
import { useColleges } from '@/hooks/useColleges';

const QrSessionDetails = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useUser();
  const { data: colleges } = useColleges();

  const { data, isLoading } = useQuery({
    queryKey: ['qr-session-details', user?.id, sessionId],
    enabled: !!user?.id && !!sessionId,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data: session, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('created_by', user?.id)
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!session) return { session: null, records: [] as any[] };

      const { data: records, error: recordsError } = await supabase
        .from('attendance_records')
        .select('id, user_id, checked_in_at, metadata, session_id')
        .eq('session_id', session.id)
        .order('checked_in_at', { ascending: false });

      if (recordsError) throw recordsError;

      return { session, records: records || [] };
    },
  });

  const session = data?.session;
  const records = data?.records || [];

  const collegeName = useMemo(() => {
    if (!session?.college_id) return '—';
    return colleges?.find((c) => c.id === session.college_id)?.short_name || '—';
  }, [colleges, session?.college_id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground animate-pulse">Loading QR session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background p-4">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-sm"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <p className="text-sm font-semibold">QR session not found</p>
          <p className="text-xs text-muted-foreground mt-1">It may be deleted or unavailable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="p-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center"
            title="Back to app"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">QR Session Details</p>
            <h1 className="text-sm font-bold truncate">{session.session_name || 'Attendance Session'}</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground">Total Scans</p>
              <p className="text-xl font-bold flex items-center gap-1"><Users className="w-4 h-4 text-primary" />{records.length}</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground">Created</p>
              <p className="font-semibold">{format(new Date(session.created_at), 'MMM d')}</p>
              <p className="text-[10px] text-muted-foreground">{format(new Date(session.created_at), 'h:mm a')}</p>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
            <p className="flex items-center gap-1"><School className="w-3.5 h-3.5" /> College: <span className="text-foreground font-medium">{collegeName}</span></p>
            <p>Target: <span className="text-foreground font-medium capitalize">{session.target_audience || 'students'}</span></p>
            <p>Department: <span className="text-foreground font-medium">{session.department || '—'}</span></p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold">Checked-in Users</h2>
          {records.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center">
              <p className="text-sm font-medium">No check-ins yet</p>
              <p className="text-xs text-muted-foreground mt-1">This page auto-refreshes every 5 seconds.</p>
            </div>
          ) : (
            records.map((record: any) => {
              const m = record.metadata || {};
              return (
                <div key={record.id} className="bg-card border border-border rounded-2xl p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{m.name || 'Unknown User'}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{m.role || 'member'}</p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold flex items-center gap-1 shrink-0">
                      <CheckCircle className="w-3 h-3" /> {format(new Date(record.checked_in_at), 'h:mm a')}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-muted-foreground">
                    <p className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" /> {m.email || '—'}</p>
                    <p className="flex items-center gap-1 truncate"><Phone className="w-3 h-3 shrink-0" /> {m.mobile || '—'}</p>
                    <p className="flex items-center gap-1 truncate"><BookOpen className="w-3 h-3 shrink-0" /> {m.branch || m.department || '—'}</p>
                    <p className="flex items-center gap-1 truncate"><Hash className="w-3 h-3 shrink-0" /> {m.rollNo || '—'}</p>
                    <p className="flex items-center gap-1 truncate"><Clock3 className="w-3 h-3 shrink-0" /> {format(new Date(record.checked_in_at), 'MMM d, yyyy • h:mm a')}</p>
                    <p className="flex items-center gap-1 truncate"><User className="w-3 h-3 shrink-0" /> User ID: {record.user_id || '—'}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default QrSessionDetails;
