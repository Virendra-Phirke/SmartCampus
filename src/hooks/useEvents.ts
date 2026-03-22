import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/lib/types';

export const useEvents = (category?: string, campusId?: string | null) => {
    const queryClient = useQueryClient();

    const eventsQuery = useQuery<Event[]>({
        queryKey: ['events', category, campusId || 'all-campus'],
        queryFn: async () => {
            let campusUserIds: string[] | null = null;
            if (campusId) {
                const { data: users, error: usersError } = await supabase
                    .from('user_profiles')
                    .select('clerk_user_id')
                    .eq('college_id', campusId);

                if (usersError) {
                    console.error('Error fetching campus users for events:', usersError);
                    return [];
                }

                campusUserIds = (users || [])
                    .map((u: any) => u?.clerk_user_id)
                    .filter(Boolean);

                if (!campusUserIds.length) return [];
            }

            let query = supabase
                .from('events')
                .select('*')
                .gte('end_time', new Date().toISOString())
                .order('start_time', { ascending: true });

            if (campusUserIds) {
                query = query.in('created_by', campusUserIds);
            }

            if (category && category !== 'all') {
                query = query.eq('category', category);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching events:', error);
                return [];
            }

            return data || [];
        },
        staleTime: 2 * 60 * 1000,
    });

    // Realtime subscription for live event updates
    useEffect(() => {
        const channel = supabase
            .channel('events-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'events' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['events'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    return {
        events: eventsQuery.data || [],
        isLoading: eventsQuery.isLoading,
        error: eventsQuery.error,
    };
};
