import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/lib/types';

export const useAnnouncements = () => {
    const queryClient = useQueryClient();

    const announcementsQuery = useQuery<Announcement[]>({
        queryKey: ['announcements'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
                .order('created_at', { ascending: false })
                .limit(20);

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
