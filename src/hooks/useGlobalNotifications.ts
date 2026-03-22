import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useUser } from '@clerk/clerk-react';

export const useGlobalNotifications = () => {
    const { user } = useUser();

    useEffect(() => {
        // Only run if user is logged in
        if (!user) return;

        const channel = supabase.channel('global-notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'announcements' },
                (payload) => {
                    const newAlert = payload.new;
                    // Don't toast if the current user is the author
                    if (newAlert.created_by !== user.id) {
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
                (payload) => {
                    const newEvent = payload.new;
                    // Don't toast if the current user is the author
                    if (newEvent.created_by !== user.id) {
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
    }, [user]);

    return null;
};
