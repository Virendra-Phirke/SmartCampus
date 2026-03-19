import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { College } from '@/lib/types';
import { toast } from 'sonner';

export const useColleges = () => {
    return useQuery<College[]>({
        queryKey: ['colleges'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('colleges')
                .select('*')
                .order('name');

            if (error) {
                console.error('Error fetching colleges:', error);
                return [];
            }

            return data || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useAddCollege = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (college: Omit<College, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('colleges')
                .insert([college])
                .select()
                .single();

            if (error) throw error;
            return data as College;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['colleges'] });
            toast.success('College added successfully!');
        },
        onError: () => {
            toast.error('Failed to add college.');
        },
    });
};

export const useUpdateCollege = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<College> }) => {
            const { data, error } = await supabase
                .from('colleges')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as College;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['colleges'] });
            toast.success('College updated!');
        },
        onError: () => {
            toast.error('Failed to update college.');
        },
    });
};

export const useDeleteCollege = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('colleges')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['colleges'] });
            toast.success('College deleted.');
        },
        onError: () => {
            toast.error('Failed to delete college.');
        },
    });
};
