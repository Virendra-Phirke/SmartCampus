import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/lib/types';

export const useEvents = (category?: string) => {
    const queryClient = useQueryClient();

    const eventsQuery = useQuery<Event[]>({
        queryKey: ['events', category],
        queryFn: async () => {
            let query = supabase
                .from('events')
                .select('*')
                .gte('end_time', new Date().toISOString())
                .order('start_time', { ascending: true });

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
