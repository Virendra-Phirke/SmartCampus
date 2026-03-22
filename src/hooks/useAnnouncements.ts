import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/lib/types';

export const useAnnouncements = (campusId?: string | null) => {
    const queryClient = useQueryClient();

    const announcementsQuery = useQuery<Announcement[]>({
        queryKey: ['announcements', campusId || 'all-campus'],
        queryFn: async () => {
            let campusUserIds: string[] | null = null;
            if (campusId) {
                const { data: users, error: usersError } = await supabase
                    .from('user_profiles')
                    .select('clerk_user_id')
                    .eq('college_id', campusId);

                if (usersError) {
                    console.error('Error fetching campus users for announcements:', usersError);
                    return [];
                }

                campusUserIds = (users || [])
                    .map((u: any) => u?.clerk_user_id)
                    .filter(Boolean);

                if (!campusUserIds.length) return [];
            }

            let query = supabase
                .from('announcements')
                .select('*')
                .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
                .order('created_at', { ascending: false })
                .limit(20);

            if (campusUserIds) {
                query = query.in('created_by', campusUserIds);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching announcements:', error);
                return [];
            }

            return data || [];
        },
        staleTime: 1 * 60 * 1000,
    });

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('announcements-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'announcements' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['announcements'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    return {
        announcements: announcementsQuery.data || [],
        isLoading: announcementsQuery.isLoading,
    };
};
