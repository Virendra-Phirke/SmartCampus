import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Event, Announcement } from '@/lib/types';
import { dispatchBackgroundPush } from '@/lib/pushDispatch';

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
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            dispatchBackgroundPush({
                type: 'event',
                title: 'New Event',
                body: data?.title || 'A new event was posted',
                resourceId: data?.id,
                actorUserId: data?.created_by || null,
            });
        },
    });
};

export const useUpdateEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Event> & { id: string }) => {
            const { data, error } = await supabase
                .from('events')
                .update(updates)
                .eq('id', id)
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

export const useDeleteEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
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
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            dispatchBackgroundPush({
                type: 'announcement',
                title: data?.title || 'New Alert',
                body: data?.body || 'A new alert was posted',
                resourceId: data?.id,
                actorUserId: data?.created_by || null,
            });
        },
    });
};

export const useUpdateAnnouncement = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Announcement> & { id: string }) => {
            const { data, error } = await supabase
                .from('announcements')
                .update(updates)
                .eq('id', id)
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

export const useDeleteAnnouncement = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
        },
    });
};
