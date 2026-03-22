import { supabase } from './supabase';
import type { Announcement } from './types';

export interface PushNotificationPayload {
 title: string;
 body: string;
 icon?: string;
 badge?: string;
 tag?: string;
 data?: Record<string, any>;
 actions?: Array<{
 action: string;
 title: string;
 icon?: string;
 }>;
 requireInteraction?: boolean;
}

export interface NotificationPermission {
 granted: boolean;
 default: boolean;
 denied: boolean;
}

class PushNotificationManager {
 private vapidKey: string = '';
 private userId: string | null = null;
 private permission: NotificationPermission = {
 granted: false,
 default: true,
 denied: false,
 };
 private pushSubscription: PushSubscription | null = null;
 private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
 private realtimeChannel: any = null;
 private notificationCallbacks: ((notification: Announcement) => void)[] = [];
 private isInitialized = false;

 constructor() {
 if (typeof window !== 'undefined') {
 this.permission = Notification.permission === 'granted'
 ? { granted: true, default: false, denied: false }
 : Notification.permission === 'denied'
 ? { granted: false, default: false, denied: true }
 : { granted: false, default: true, denied: false };
 }
 }

 async initialize(vapidKey?: string, userId?: string | null): Promise<boolean> {
 if (vapidKey) {
 this.vapidKey = vapidKey;
 }

 if (userId) {
 this.userId = userId;
 }

 if (this.isInitialized) {
 if (this.permission.granted && this.vapidKey && !this.pushSubscription) {
 await this.subscribeToPush();
 }
 return true;
 }

 if (!('Notification' in window)) {
 console.warn('Notifications are not supported in this browser');
 return false;
 }

 if (!('serviceWorker' in navigator)) {
 console.warn('Service Workers are not supported in this browser');
 return false;
 }

 try {
 this.serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
 console.log('Service Worker registered successfully');

 await this.setupRealtimeSubscription();
 this.isInitialized = true;
 return true;
 } catch (error) {
 console.error('Failed to initialize push notifications:', error);
 return false;
 }
 }

 async requestPermission(): Promise<NotificationPermission> {
 if (!('Notification' in window)) {
 return this.permission;
 }

 try {
 const result = await Notification.requestPermission();
 this.permission = result === 'granted'
 ? { granted: true, default: false, denied: false }
 : result === 'denied'
 ? { granted: false, default: false, denied: true }
 : { granted: false, default: true, denied: false };

 if (this.permission.granted && this.vapidKey) {
 await this.subscribeToPush();
 }

 return this.permission;
 } catch (error) {
 console.error('Failed to request notification permission:', error);
 return this.permission;
 }
 }

 getPermission(): NotificationPermission {
 return this.permission;
 }

 private async subscribeToPush(): Promise<void> {
 if (!this.serviceWorkerRegistration || !this.vapidKey) {
 console.warn('Cannot subscribe to push: missing service worker or VAPID key');
 return;
 }

 try {
 const applicationServerKey = this.urlBase64ToUint8Array(this.vapidKey) as unknown as BufferSource;
 const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
 userVisibleOnly: true,
 applicationServerKey,
 });

 this.pushSubscription = subscription;
 await this.sendSubscriptionToServer(subscription);
 console.log('Push subscription successful');
 } catch (error) {
 console.error('Failed to subscribe to push:', error);
 }
 }

 private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
 const userId = this.userId || localStorage.getItem('clerk_user_id');
 if (!userId) {
 console.warn('No user ID found, cannot save push subscription');
 return;
 }

 try {
 await supabase.from('push_subscriptions').upsert({
 user_id: userId,
 subscription: subscription.toJSON(),
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 }, {
 onConflict: 'user_id',
 });
 } catch (error) {
 console.error('Failed to save push subscription to server:', error);
 }
 }

 private urlBase64ToUint8Array(base64String: string): Uint8Array {
 const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
 const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
 const rawData = window.atob(base64);
 const outputArray = new Uint8Array(rawData.length);

 for (let i = 0; i < rawData.length; ++i) {
 outputArray[i] = rawData.charCodeAt(i);
 }
 return outputArray;
 }

 private async setupRealtimeSubscription(): Promise<void> {
 try {
 this.realtimeChannel = supabase
 .channel('announcements')
 .on(
 'postgres_changes',
 {
 event: 'INSERT',
 schema: 'public',
 table: 'announcements',
 },
 async (payload) => {
 const announcement = payload.new as Announcement;
 await this.handleNewAnnouncement(announcement);
 }
 )
 .on(
 'postgres_changes',
 {
 event: 'INSERT',
 schema: 'public',
 table: 'events',
 },
 async (payload) => {
 const event = payload.new;
 await this.showNotification({
 title: 'New Event',
 body: event.title,
 data: { type: 'event', eventId: event.id },
 });
 }
 )
 .subscribe();
 } catch (error) {
 console.error('Failed to setup realtime subscription:', error);
 }
 }

 private async handleNewAnnouncement(announcement: Announcement): Promise<void> {
 if (announcement.expires_at && new Date(announcement.expires_at) < new Date()) {
 return;
 }

 await this.showNotification({
 title: announcement.title,
 body: announcement.body,
 tag: `announcement-${announcement.id}`,
 data: { type: 'announcement', announcementId: announcement.id },
 requireInteraction: announcement.priority === 'high' || announcement.priority === 'urgent',
 });

 for (const callback of this.notificationCallbacks) {
 callback(announcement);
 }
 }

 async showNotification(payload: PushNotificationPayload): Promise<void> {
 if (!this.permission.granted) {
 console.warn('Notification permission not granted');
 return;
 }

 if (!this.serviceWorkerRegistration) {
 new Notification(payload.title, {
 body: payload.body,
 icon: payload.icon || '/icon.png',
 badge: payload.badge,
 tag: payload.tag,
 data: payload.data,
 requireInteraction: payload.requireInteraction,
 });
 return;
 }

 try {
 const swOptions: Record<string, any> = {
 body: payload.body,
 icon: payload.icon || '/icon.png',
 badge: payload.badge || '/icon.png',
 tag: payload.tag,
 data: payload.data,
 requireInteraction: payload.requireInteraction,
 actions: payload.actions,
 vibrate: payload.requireInteraction ? [200, 100, 200] : [100],
 silent: false,
 };
 await this.serviceWorkerRegistration.showNotification(payload.title, swOptions);
 } catch (error) {
 console.error('Failed to show notification:', error);
 new Notification(payload.title, {
 body: payload.body,
 icon: payload.icon,
 badge: payload.badge,
 });
 }
 }

 async scheduleNotification(
 title: string,
 body: string,
 scheduledTime: Date,
 data?: Record<string, any>
 ): Promise<string> {
 const id = `scheduled_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
 const delay = scheduledTime.getTime() - Date.now();

 if (delay <= 0) {
 await this.showNotification({ title, body, data });
 return id;
 }

 const timeoutId = window.setTimeout(() => {
 this.showNotification({ title, body, data });
 this.removeScheduledNotification(id);
 }, delay);

 const scheduledNotifications = this.getScheduledNotifications();
 scheduledNotifications.push({
 id,
 title,
 body,
 scheduledTime: scheduledTime.toISOString(),
 data,
 timeoutId,
 });
 localStorage.setItem('scheduled_notifications', JSON.stringify(scheduledNotifications));

 return id;
 }

 private getScheduledNotifications(): any[] {
 try {
 return JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
 } catch {
 return [];
 }
 }

 private removeScheduledNotification(id: string): void {
 const scheduled = this.getScheduledNotifications();
 const notification = scheduled.find((n: any) => n.id === id);
 if (notification?.timeoutId) {
 clearTimeout(notification.timeoutId);
 }
 const filtered = scheduled.filter((n: any) => n.id !== id);
 localStorage.setItem('scheduled_notifications', JSON.stringify(filtered));
 }

 cancelScheduledNotification(id: string): void {
 this.removeScheduledNotification(id);
 }

 onNotification(callback: (notification: Announcement) => void): () => void {
 this.notificationCallbacks.push(callback);
 return () => {
 this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
 };
 }

 async broadcastAnnouncement(
 title: string,
 body: string,
 priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
 expiresInHours = 24
 ): Promise<void> {
 const expires_at = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

 try {
 const { data, error } = await supabase
 .from('announcements')
 .insert({
 title,
 body,
 priority,
 expires_at,
 })
 .select()
 .single();

 if (error) throw error;

 await this.showNotification({
 title,
 body,
 tag: `broadcast-${data.id}`,
 data: { type: 'broadcast', announcementId: data.id },
 requireInteraction: priority === 'high' || priority === 'urgent',
 });
 } catch (error) {
 console.error('Failed to broadcast announcement:', error);
 throw error;
 }
 }

 async broadcastEmergencyAlert(message: string): Promise<void> {
 await this.broadcastAnnouncement(
 'Emergency Alert',
 message,
 'urgent',
 1
 );

 if (this.serviceWorkerRegistration) {
 const options: Record<string, any> = {
 body: message,
 tag: 'emergency',
 requireInteraction: true,
 vibrate: [500, 200, 500, 200, 500],
 silent: false,
 };
 await this.serviceWorkerRegistration.showNotification('Emergency Alert', options);
 }
 }

 async unsubscribe(): Promise<void> {
 if (this.pushSubscription) {
 try {
 await this.pushSubscription.unsubscribe();
 const userId = localStorage.getItem('clerk_user_id');
 if (userId) {
 await supabase
 .from('push_subscriptions')
 .delete()
 .eq('user_id', userId);
 }
 } catch (error) {
 console.error('Failed to unsubscribe:', error);
 }
 this.pushSubscription = null;
 }

 if (this.realtimeChannel) {
 await supabase.removeChannel(this.realtimeChannel);
 this.realtimeChannel = null;
 }
 }

 async testNotification(): Promise<void> {
 await this.showNotification({
 title: 'CampusMate Test',
 body: 'Push notifications are working correctly!',
 tag: 'test',
 });
 }
}

export const pushNotifications = new PushNotificationManager();

export async function initializePushNotifications(vapidKey?: string, userId?: string | null): Promise<boolean> {
 return pushNotifications.initialize(vapidKey, userId);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
 return pushNotifications.requestPermission();
}

export function getNotificationPermission(): NotificationPermission {
 return pushNotifications.getPermission();
}

export async function sendAnnouncement(
 title: string,
 body: string,
 priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
): Promise<void> {
 await pushNotifications.broadcastAnnouncement(title, body, priority);
}

export async function sendEmergencyAlert(message: string): Promise<void> {
 await pushNotifications.broadcastEmergencyAlert(message);
}

export function onAnnouncement(callback: (announcement: Announcement) => void): () => void {
 return pushNotifications.onNotification(callback);
}
