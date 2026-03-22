import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { initializePushNotifications } from '@/lib/notifications';
import { initializePathfinding } from '@/lib/pathfinding';
import { testConnection } from '@/lib/supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
 const { isSignedIn } = useAuth();
 const queryClient = useQueryClient();

 useEffect(() => {
 if (isSignedIn) {
 // Test Supabase connection on sign-in
 testConnection().then((isConnected) => {
 if (!isConnected) {
 console.warn('Supabase connection test failed - delete operations may not work');
 }
 });
 
 initializePushNotifications().catch(() => {});
 initializePathfinding().catch(() => {});
 } else {
 queryClient.clear();
 }
 }, [isSignedIn, queryClient]);

 return <>{children}</>;
}
