import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/clerk-react';
import type { UserProfile } from '@/lib/types';
import { toast } from 'sonner';

export const useProfile = () => {
    const { user, isLoaded } = useUser();
    const queryClient = useQueryClient();

    // Fetch the user's profile from Supabase
    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user) return null;

            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('clerk_user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile:', error);
                throw error;
            }

            return (data as UserProfile) || null;
        },
        enabled: isLoaded && !!user,
    });

    // Create or Update the user's profile
    const upsertProfile = useMutation({
        mutationFn: async (profileData: Partial<UserProfile>) => {
            if (!user) throw new Error('Not authenticated');

            const payload = {
                clerk_user_id: user.id,
                display_name: user.fullName || user.username || 'User',
                email: user.primaryEmailAddress?.emailAddress || '',
                role: profile?.role || 'student',
                year: profileData.year || null,
                section: profileData.section || null,
                staff_type: profileData.staff_type || null,
                ...profileData,
            };

            const { data, error } = await supabase
                .from('user_profiles')
                .upsert(payload, { onConflict: 'clerk_user_id' })
                .select()
                .single();

            if (error) {
                console.error('Error upserting profile:', error);
                throw error;
            }

            return data as UserProfile;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['profile', user?.id], data);
            toast.success('Profile updated successfully!');
        },
        onError: () => {
            toast.error('Failed to update profile.');
        },
    });

    return {
        profile,
        isLoading: isLoading || !isLoaded,
        upsertProfile,
    };
};
