import type { Building, Event, College, AttendanceRecord, AttendanceSession } from './types';

export interface CachedData<T> {
 data: T;
 timestamp: number;
 expiresAt: number;
}

export interface OfflineQueueItem {
 id: string;
 type: 'attendance' | 'event' | 'profile';
 action: 'create' | 'update' | 'delete';
 data: any;
 timestamp: number;
 retries: number;
}

const DB_NAME = 'CampusMateOffline';
const DB_VERSION = 1;

class OfflineStorage {
 private db: IDBDatabase | null = null;
 private initPromise: Promise<void> | null = null;
 private isOnline = navigator.onLine;
 private onlineListeners: ((online: boolean) => void)[] = [];

 constructor() {
 this.initPromise = this.initialize();
 this.setupOnlineListeners();
 }

 private async initialize(): Promise<void> {
 return new Promise((resolve, reject) => {
 const request = indexedDB.open(DB_NAME, DB_VERSION);

 request.onerror = () => {
 console.error('Failed to open IndexedDB:', request.error);
 reject(request.error);
 };

 request.onsuccess = () => {
 this.db = request.result;
 resolve();
 };

 request.onupgradeneeded = (event) => {
 const db = (event.target as IDBOpenDBRequest).result;

 if (!db.objectStoreNames.contains('buildings')) {
 db.createObjectStore('buildings', { keyPath: 'id' });
 }
 if (!db.objectStoreNames.contains('events')) {
 db.createObjectStore('events', { keyPath: 'id' });
 }
 if (!db.objectStoreNames.contains('colleges')) {
 db.createObjectStore('colleges', { keyPath: 'id' });
 }
 if (!db.objectStoreNames.contains('attendance_records')) {
 const store = db.createObjectStore('attendance_records', { keyPath: 'id' });
 store.createIndex('session_id', 'session_id', { unique: false });
 store.createIndex('user_id', 'user_id', { unique: false });
 }
 if (!db.objectStoreNames.contains('attendance_sessions')) {
 db.createObjectStore('attendance_sessions', { keyPath: 'id' });
 }
 if (!db.objectStoreNames.contains('announcements')) {
 db.createObjectStore('announcements', { keyPath: 'id' });
 }
 if (!db.objectStoreNames.contains('user_profile')) {
 db.createObjectStore('user_profile', { keyPath: 'id' });
 }
 if (!db.objectStoreNames.contains('offline_queue')) {
 const store = db.createObjectStore('offline_queue', { keyPath: 'id' });
 store.createIndex('timestamp', 'timestamp', { unique: false });
 }
 if (!db.objectStoreNames.contains('cached_routes')) {
 db.createObjectStore('cached_routes', { keyPath: 'routeKey' });
 }
 if (!db.objectStoreNames.contains('map_tiles')) {
 const store = db.createObjectStore('map_tiles', { keyPath: 'tileKey' });
 store.createIndex('expiresAt', 'expiresAt', { unique: false });
 }
 };
 });
 }

 private setupOnlineListeners(): void {
 window.addEventListener('online', () => {
 this.isOnline = true;
 this.notifyOnlineListeners(true);
 this.processOfflineQueue();
 });

 window.addEventListener('offline', () => {
 this.isOnline = false;
 this.notifyOnlineListeners(false);
 });
 }

 onOnlineChange(callback: (online: boolean) => void): () => void {
 this.onlineListeners.push(callback);
 return () => {
 this.onlineListeners = this.onlineListeners.filter(l => l !== callback);
 };
 }

 private notifyOnlineListeners(online: boolean): void {
 for (const listener of this.onlineListeners) {
 listener(online);
 }
 }

 private async ensureDB(): Promise<IDBDatabase> {
 if (this.db) return this.db;
 await this.initPromise;
 if (!this.db) throw new Error('Database not initialized');
 return this.db;
 }

 async get<T>(storeName: string, key: string): Promise<T | null> {
 const db = await this.ensureDB();
 return new Promise((resolve, reject) => {
 const transaction = db.transaction(storeName, 'readonly');
 const store = transaction.objectStore(storeName);
 const request = store.get(key);

 request.onsuccess = () => {
 const result = request.result as CachedData<T> | undefined;
 if (result) {
 if (result.expiresAt < Date.now()) {
 this.delete(storeName, key);
 resolve(null);
 } else {
 resolve(result.data);
 }
 } else {
 resolve(null);
 }
 };

 request.onerror = () => reject(request.error);
 });
 }

 async set<T>(storeName: string, key: string, data: T, ttlMs = 3600000): Promise<void> {
 const db = await this.ensureDB();
 const cached: CachedData<T> = {
 data,
 timestamp: Date.now(),
 expiresAt: Date.now() + ttlMs,
 };

 return new Promise((resolve, reject) => {
 const transaction = db.transaction(storeName, 'readwrite');
 const store = transaction.objectStore(storeName);
 const request = store.put(cached);

 request.onerror = () => reject(request.error);
 transaction.oncomplete = () => resolve();
 });
 }

 async delete(storeName: string, key: string): Promise<void> {
 const db = await this.ensureDB();
 return new Promise((resolve, reject) => {
 const transaction = db.transaction(storeName, 'readwrite');
 const store = transaction.objectStore(storeName);
 const request = store.delete(key);

 request.onerror = () => reject(request.error);
 transaction.oncomplete = () => resolve();
 });
 }

 async getAll<T>(storeName: string): Promise<T[]> {
 const db = await this.ensureDB();
 return new Promise((resolve, reject) => {
 const transaction = db.transaction(storeName, 'readonly');
 const store = transaction.objectStore(storeName);
 const request = store.getAll();

 request.onsuccess = () => {
 const results = request.result as CachedData<T>[];
 const now = Date.now();
 const valid = results
 .filter(r => r.expiresAt >= now)
 .map(r => r.data);
 resolve(valid);
 };

 request.onerror = () => reject(request.error);
 });
 }

 async clearStore(storeName: string): Promise<void> {
 const db = await this.ensureDB();
 return new Promise((resolve, reject) => {
 const transaction = db.transaction(storeName, 'readwrite');
 const store = transaction.objectStore(storeName);
 const request = store.clear();

 request.onerror = () => reject(request.error);
 transaction.oncomplete = () => resolve();
 });
 }

 async clearExpired(): Promise<void> {
 const db = await this.ensureDB();
 const stores = ['buildings', 'events', 'colleges', 'announcements', 'map_tiles'];

 for (const storeName of stores) {
 const transaction = db.transaction(storeName, 'readwrite');
 const store = transaction.objectStore(storeName);
 const request = store.getAll();

 request.onsuccess = () => {
 const now = Date.now();
 for (const item of request.result) {
 if (item.expiresAt < now) {
 store.delete(item.id || item.tileKey || item.routeKey);
 }
 }
 };
 }
 }

 async cacheBuildings(buildings: Building[]): Promise<void> {
 for (const building of buildings) {
 await this.set('buildings', building.id, building, 24 * 3600000);
 }
 }

 async getCachedBuildings(): Promise<Building[]> {
 return this.getAll<Building>('buildings');
 }

 async cacheEvents(events: Event[]): Promise<void> {
 for (const event of events) {
 await this.set('events', event.id, event, 3600000);
 }
 }

 async getCachedEvents(): Promise<Event[]> {
 return this.getAll<Event>('events');
 }

 async cacheColleges(colleges: College[]): Promise<void> {
 for (const college of colleges) {
 await this.set('colleges', college.id, college, 7 * 24 * 3600000);
 }
 }

 async getCachedColleges(): Promise<College[]> {
 return this.getAll<College>('colleges');
 }

 async cacheAttendanceRecord(record: AttendanceRecord): Promise<void> {
 await this.set(`attendance_records`, record.id, record, 7 * 24 * 3600000);
 }

 async getCachedAttendanceRecords(): Promise<AttendanceRecord[]> {
 return this.getAll<AttendanceRecord>('attendance_records');
 }

 async queueOfflineAction(
 type: OfflineQueueItem['type'],
 action: OfflineQueueItem['action'],
 data: any
 ): Promise<void> {
 const item: OfflineQueueItem = {
 id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
 type,
 action,
 data,
 timestamp: Date.now(),
 retries: 0,
 };

 const db = await this.ensureDB();
 return new Promise((resolve, reject) => {
 const transaction = db.transaction('offline_queue', 'readwrite');
 const store = transaction.objectStore('offline_queue');
 const request = store.put(item);

 request.onerror = () => reject(request.error);
 transaction.oncomplete = () => resolve();
 });
 }

 async getOfflineQueue(): Promise<OfflineQueueItem[]> {
 const db = await this.ensureDB();
 return new Promise((resolve, reject) => {
 const transaction = db.transaction('offline_queue', 'readonly');
 const store = transaction.objectStore('offline_queue');
 const request = store.getAll();

 request.onsuccess = () => resolve(request.result);
 request.onerror = () => reject(request.error);
 });
 }

 async removeFromQueue(id: string): Promise<void> {
 await this.delete('offline_queue', id);
 }

 async processOfflineQueue(): Promise<void> {
 if (!this.isOnline) return;

 const queue = await this.getOfflineQueue();
 if (queue.length === 0) return;

 console.log(`Processing ${queue.length} offline actions`);

 for (const item of queue.sort((a, b) => a.timestamp - b.timestamp)) {
 try {
 await this.processQueueItem(item);
 await this.removeFromQueue(item.id);
 } catch (error) {
 console.error(`Failed to process offline action ${item.id}:`, error);
 item.retries++;
 if (item.retries >= 3) {
 await this.removeFromQueue(item.id);
 console.warn(`Dropped offline action after 3 retries: ${item.id}`);
 }
 }
 }
 }

 private async processQueueItem(item: OfflineQueueItem): Promise<void> {
 const { supabase } = await import('./supabase');

 switch (item.type) {
 case 'attendance':
 if (item.action === 'create') {
 await supabase.from('attendance_records').insert(item.data);
 }
 break;
 case 'event':
 if (item.action === 'create') {
 await supabase.from('events').insert(item.data);
 } else if (item.action === 'update') {
 await supabase.from('events').update(item.data).eq('id', item.data.id);
 } else if (item.action === 'delete') {
 await supabase.from('events').delete().eq('id', item.data.id);
 }
 break;
 case 'profile':
 if (item.action === 'update') {
 await supabase
 .from('user_profiles')
 .update(item.data)
 .eq('clerk_user_id', item.data.clerk_user_id);
 }
 break;
 }
 }

 async cacheRoute(routeKey: string, routeData: any): Promise<void> {
 await this.set('cached_routes', routeKey, routeData, 24 * 3600000);
 }

 async getCachedRoute(routeKey: string): Promise<any | null> {
 return this.get('cached_routes', routeKey);
 }

 async cacheMapTile(tileKey: string, tileData: Blob, ttlMs = 7 * 24 * 3600000): Promise<void> {
 const db = await this.ensureDB();
 const cached: CachedData<Blob> = {
 data: tileData,
 timestamp: Date.now(),
 expiresAt: Date.now() + ttlMs,
 };

 return new Promise((resolve, reject) => {
 const transaction = db.transaction('map_tiles', 'readwrite');
 const store = transaction.objectStore('map_tiles');
 const request = store.put(cached);

 request.onerror = () => reject(request.error);
 transaction.oncomplete = () => resolve();
 });
 }

 async getCachedMapTile(tileKey: string): Promise<Blob | null> {
 const db = await this.ensureDB();
 return new Promise((resolve, reject) => {
 const transaction = db.transaction('map_tiles', 'readonly');
 const store = transaction.objectStore('map_tiles');
 const request = store.get(tileKey);

 request.onsuccess = () => {
 const result = request.result as CachedData<Blob> | undefined;
 if (result && result.expiresAt >= Date.now()) {
 resolve(result.data);
 } else {
 resolve(null);
 }
 };

 request.onerror = () => reject(request.error);
 });
 }

 isNetworkOnline(): boolean {
 return this.isOnline;
 }

 async getStorageUsage(): Promise<{ used: number; quota: number }> {
 if (navigator.storage && navigator.storage.estimate) {
 const estimate = await navigator.storage.estimate();
 return {
 used: estimate.usage || 0,
 quota: estimate.quota || 0,
 };
 }
 return { used: 0, quota: 0 };
 }

 async clearAll(): Promise<void> {
 const stores = [
 'buildings', 'events', 'colleges', 'attendance_records',
 'attendance_sessions', 'announcements', 'user_profile',
 'offline_queue', 'cached_routes', 'map_tiles'
 ];

 for (const storeName of stores) {
 await this.clearStore(storeName);
 }
 }
}

export const offlineStorage = new OfflineStorage();

export function isOnline(): boolean {
 return offlineStorage.isNetworkOnline();
}

export async function cacheForOffline<T>(
 key: string,
 fetcher: () => Promise<T>,
 ttlMs = 3600000
): Promise<T> {
 try {
 if (isOnline()) {
 const data = await fetcher();
 await offlineStorage.set(key, key, data, ttlMs);
 return data;
 } else {
 const cached = await offlineStorage.get<T>(key, key);
 if (cached) return cached;
 throw new Error('No cached data available');
 }
 } catch {
 const cached = await offlineStorage.get<T>(key, key);
 if (cached) return cached;
 throw new Error('No cached data available and network is offline');
 }
}

export async function queueAttendanceOffline(record: AttendanceRecord): Promise<void> {
 await offlineStorage.cacheAttendanceRecord(record);
 await offlineStorage.queueOfflineAction('attendance', 'create', record);
}

export async function processOfflineQueue(): Promise<void> {
 await offlineStorage.processOfflineQueue();
}

export function onOnlineChange(callback: (online: boolean) => void): () => void {
 return offlineStorage.onOnlineChange(callback);
}
