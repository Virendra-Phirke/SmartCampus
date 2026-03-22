import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useUser } from '@clerk/clerk-react';
import { useProfile } from '@/hooks/useProfile';

export const useGlobalNotifications = () => {
    const { user } = useUser();
    const { profile } = useProfile();

    useEffect(() => {
        // Only run if user is logged in
        if (!user) return;
        if (!profile?.college_id) return;

        const role = profile.role;
        const canReceiveCampusNotifications = role === 'student' || role === 'faculty' || role === 'staff';
        if (!canReceiveCampusNotifications) return;

        const isRelevantCampusAuthor = async (authorId?: string | null) => {
            if (!authorId) return false;
            const { data, error } = await supabase
                .from('user_profiles')
                .select('college_id')
                .eq('clerk_user_id', authorId)
                .maybeSingle();

            if (error) return false;
            return data?.college_id === profile.college_id;
        };

        const channel = supabase.channel('global-notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'announcements' },
                async (payload) => {
                    const newAlert = payload.new;
                    // Don't toast if the current user is the author
                    if (newAlert.created_by !== user.id && await isRelevantCampusAuthor(newAlert.created_by)) {
                        toast.info(`New Alert: ${newAlert.title}`, {
                            description: newAlert.body,
                            duration: 6000,
                            icon: '🔔',
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'events' },
                async (payload) => {
                    const newEvent = payload.new;
                    // Don't toast if the current user is the author
                    if (newEvent.created_by !== user.id && await isRelevantCampusAuthor(newEvent.created_by)) {
                        toast.success(`New Campus Event!`, {
                            description: newEvent.title,
                            duration: 6000,
                            icon: '📅',
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, profile?.college_id, profile?.role]);

    return null;
};
