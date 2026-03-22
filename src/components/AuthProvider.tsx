import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { initializePushNotifications, requestNotificationPermission } from '@/lib/notifications';
import { initializePathfinding } from '@/lib/pathfinding';
import { testConnection } from '@/lib/supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
 const { isSignedIn, userId } = useAuth();
 const queryClient = useQueryClient();

 useEffect(() => {
 if (isSignedIn) {
 // Test Supabase connection on sign-in
 testConnection().then((isConnected) => {
 if (!isConnected) {
 console.warn('Supabase connection test failed - delete operations may not work');
 }
 });
 
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
