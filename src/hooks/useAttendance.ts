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
        }: {
            buildingId: string;
            method: 'qr' | 'manual' | 'ble';
        }) => {
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('attendance_records')
                .insert({
                    user_id: userId,
                    building_id: buildingId,
                    method,
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
        todayCount,
        weekCount,
        totalCount: (attendanceQuery.data || []).length,
        checkIn: checkInMutation.mutateAsync,
        isCheckingIn: checkInMutation.isPending,
    };
};
