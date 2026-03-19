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

            const { data, error } = await supabase
                .from('attendance_records')
                .insert({
                    user_id: userId,
                    building_id: buildingId,
                    method,
                    session_id: sessionId,
                    metadata: metadata,
                    checked_in_at: new Date().toISOString(),
                })
                .select()
                .single();

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
            // Fetch sessions created by user, and join the attendees
            const { data, error } = await supabase
                .from('attendance_sessions')
                .select(`
                    *,
                    attendance_records (
                        id,
                        user_id,
                        checked_in_at,
                        metadata
                    )
                `)
                .eq('created_by', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching creator sessions:', error);
                return [];
            }

            return data || [];
        },
        enabled: !!userId,
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
    };
};
