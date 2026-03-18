import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Event, Announcement } from '@/lib/types';

export const useAddEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newEvent: Partial<Event>) => {
            const { data, error } = await supabase
                .from('events')
                .insert([newEvent])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });
};

export const useAddAnnouncement = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newAnnouncement: Partial<Announcement>) => {
            const { data, error } = await supabase
                .from('announcements')
                .insert([newAnnouncement])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
        },
    });
};
