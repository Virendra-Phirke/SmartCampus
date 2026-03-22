import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { initializePushNotifications, requestNotificationPermission } from '@/lib/notifications';
import { initializePathfinding } from '@/lib/pathfinding';

export function AuthProvider({ children }: { children: React.ReactNode }) {
 const { isSignedIn, userId } = useAuth();
 const queryClient = useQueryClient();

 useEffect(() => {
 if (isSignedIn) {
 const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
 initializePushNotifications(vapidKey, userId || null).then(() => {
 requestNotificationPermission().catch(() => {});
 }).catch(() => {});
 initializePathfinding().catch(() => {});
 } else {
 queryClient.clear();
 }
 }, [isSignedIn, userId, queryClient]);

 return <>{children}</>;
}
