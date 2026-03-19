import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/lib/supabase';
import type { AttendanceRecord } from '@/lib/types';

export const useAttendance = () => {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const userId = user?.id || '';

    const attendanceQuery = useQuery<AttendanceRecord[]>({
        queryKey: ['attendance', userId],
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('attendance_records')
                .select('*, buildings(name)')
                .eq('user_id', userId)
                .order('checked_in_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching attendance:', error);
                return [];
            }

            return (data || []).map((r: any) => ({
                ...r,
                building_name: r.buildings?.name || 'Unknown',
            }));
        },
        enabled: !!userId,
    });

    const checkInMutation = useMutation({
        mutationFn: async ({
            buildingId,
            method,
            sessionId,
            metadata
        }: {
            buildingId: string;
            method: 'qr' | 'manual' | 'ble';
            sessionId?: string;
            metadata?: any;
        }) => {
            if (!userId) throw new Error('Not authenticated');

            if (sessionId) {
                const { data: existing, error: existingError } = await supabase
                    .from('attendance_records')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('session_id', sessionId)
                    .limit(1);

                if (existingError) throw existingError;
                if (existing && existing.length > 0) {
                    throw new Error('Attendance already marked for this QR session');
                }
            }

            const insertPayload: Record<string, unknown> = {
                user_id: userId,
                building_id: buildingId,
                method,
                session_id: sessionId,
                metadata: metadata,
                checked_in_at: new Date().toISOString(),
                username: metadata?.username || null,
                full_name: metadata?.full_name || metadata?.name || null,
                email: metadata?.email || null,
                role: metadata?.role || null,
                course_or_department: metadata?.course_or_department || metadata?.branch || null,
                year: metadata?.year || null,
                section: metadata?.section || null,
                roll_no: metadata?.roll_no || metadata?.rollNo || null,
                mobile_no: metadata?.mobile_no || metadata?.mobile || null,
                address: metadata?.address || null,
                scan_timestamp: metadata?.timestamp || null,
                location_lat: metadata?.location_lat ?? null,
                location_lng: metadata?.location_lng ?? null,
                location_accuracy: metadata?.location_accuracy ?? null,
                campus_lat: metadata?.campus_lat ?? null,
                campus_lng: metadata?.campus_lng ?? null,
                distance_from_campus_km: metadata?.distance_from_campus_km ?? metadata?.distanceFromCampusKm ?? null,
            };

            const currentPayload = { ...insertPayload };
            let data: AttendanceRecord | null = null;
            let error: { code?: string; message?: string } | null = null;

            for (let i = 0; i < 10; i++) {
                const result = await supabase
                    .from('attendance_records')
                    .insert(currentPayload)
                    .select()
                    .single();

                data = (result.data as AttendanceRecord | null) || null;
                error = (result.error as { code?: string; message?: string } | null) || null;

                if (!error) break;
                if (error.code !== 'PGRST204') break;

                const msg = String(error.message || '');
                const missingColumn = msg.match(/'([^']+)' column/)?.[1];

                if (!missingColumn || !(missingColumn in currentPayload)) break;
                delete currentPayload[missingColumn];
            }

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance', userId] });
        },
    });

    const creatorSessionsQuery = useQuery({
        queryKey: ['creator-sessions', userId],
        queryFn: async () => {
            if (!userId) return [];
            // Fetch sessions created by user
            const { data: sessions, error } = await supabase
                .from('attendance_sessions')
                .select('*')
                .eq('created_by', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching creator sessions:', error);
                return [];
            }

            if (!sessions || sessions.length === 0) return [];

            const sessionIds = sessions.map((s: any) => s.id);

            // Fetch all check-ins for these sessions separately (more reliable than embedded joins)
            const { data: records, error: recordsError } = await supabase
                .from('attendance_records')
                .select('id, user_id, session_id, checked_in_at, metadata')
                .in('session_id', sessionIds)
                .order('checked_in_at', { ascending: false });

            if (recordsError) {
                console.error('Error fetching session attendance records:', recordsError);
            }

            const recordsBySession = new Map<string, any[]>();
            (records || []).forEach((record: any) => {
                const key = String(record.session_id || '');
                if (!recordsBySession.has(key)) recordsBySession.set(key, []);
                recordsBySession.get(key)?.push(record);
            });

            return sessions.map((session: any) => ({
                ...session,
                attendance_records: recordsBySession.get(String(session.id)) || [],
            }));
        },
        enabled: !!userId,
        refetchInterval: 5000,
    });

    const todayCount = (attendanceQuery.data || []).filter((r) => {
        const today = new Date().toDateString();
        return new Date(r.checked_in_at).toDateString() === today;
    }).length;

    const weekCount = (attendanceQuery.data || []).filter((r) => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return new Date(r.checked_in_at) >= weekAgo;
    }).length;

    const deleteSessionMutation = useMutation({
        mutationFn: async (sessionId: string) => {
            // Delete attendees first (cascade may handle this, but be safe)
            await supabase
                .from('attendance_records')
                .delete()
                .eq('session_id', sessionId);

            const { error } = await supabase
                .from('attendance_sessions')
                .delete()
                .eq('id', sessionId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['creator-sessions', userId] });
        },
    });

    const updateSessionMutation = useMutation({
        mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: Partial<{ session_name: string; college_id: string; target_audience: string; department: string; year: string; section: string; staff_type: string }> }) => {
            const { error } = await supabase
                .from('attendance_sessions')
                .update(updates)
                .eq('id', sessionId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['creator-sessions', userId] });
        },
    });

    return {
        records: attendanceQuery.data || [],
        isLoading: attendanceQuery.isLoading,
        creatorSessions: creatorSessionsQuery.data || [],
        isCreatorLoading: creatorSessionsQuery.isLoading,
        todayCount,
        weekCount,
        totalCount: (attendanceQuery.data || []).length,
        checkIn: checkInMutation.mutateAsync,
        isCheckingIn: checkInMutation.isPending,
        deleteSession: deleteSessionMutation.mutateAsync,
        updateSession: updateSessionMutation.mutateAsync,
    };
};
