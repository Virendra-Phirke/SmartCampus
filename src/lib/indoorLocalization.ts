export interface BeaconSignal {
 beaconId: string;
 name: string;
 major: number;
 minor: number;
 rssi: number;
 txPower: number;
 accuracy: number;
 distance: number;
}

export interface BeaconLocation {
 beaconId: string;
 x: number;
 y: number;
 floor: number;
 buildingId: string;
 roomId?: string | null;
 label: string;
}

export interface WiFiAccessPoint {
 bssid: string;
 ssid: string;
 rssi: number;
 frequency: number;
}

export interface FingerprintMatch {
 locationId: string;
 score: number;
 x: number;
 y: number;
 floor: number;
 buildingId: string;
}

export interface IndoorLocation {
 x: number;
 y: number;
 floor: number;
 buildingId: string;
 confidence: number;
 method: 'ble' | 'wifi' | 'qr' | 'hybrid';
 nearestBeacon?: string;
 nearestBeaconDistance?: number;
 timestamp: number;
}

export interface BLEBeaconConfig {
 id: string;
 uuid: string;
 major: number;
 minor: number;
 name: string;
 x: number;
 y: number;
 floor: number;
 buildingId: string;
 roomId?: string | null;
 txPower: number;
}

const DEFAULT_BEACON_CONFIG: Partial<BLEBeaconConfig> = {
 uuid: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e',
 major: 1,
 minor: 1,
 txPower: -59,
};

class BLELocalizationEngine {
 private beacons: Map<string, BLEBeaconConfig> = new Map();
 private isScanning = false;
 private scanCallback: ((signals: BeaconSignal[]) => void) | null = null;
 private scanIntervalId: number | null = null;
 private deviceId: string | null = null;
 private lastKnownPosition: IndoorLocation | null = null;
 private confidenceThreshold = 0.7;

 constructor() {
 this.deviceId = this.getDeviceId();
 this.loadBeaconConfig();
 }

 private getDeviceId(): string {
 let deviceId = localStorage.getItem('ble_device_id');
 if (!deviceId) {
 deviceId = 'ble_' + Math.random().toString(36).substring(2, 15);
 localStorage.setItem('ble_device_id', deviceId);
 }
 return deviceId;
 }

 async loadBeaconConfig(): Promise<void> {
 try {
 const response = await fetch('/beacon-config.json');
 if (response.ok) {
 const configs = await response.json();
 for (const config of configs) {
 this.beacons.set(config.id, { ...DEFAULT_BEACON_CONFIG, ...config });
 }
 }
 } catch {
 console.log('Using default beacon configuration');
 }

 const savedBeacons = localStorage.getItem('beacon_config');
 if (savedBeacons) {
 try {
 const configs = JSON.parse(savedBeacons);
 for (const config of configs) {
 this.beacons.set(config.id, { ...DEFAULT_BEACON_CONFIG, ...config });
 }
 } catch {
 console.warn('Failed to load saved beacon config');
 }
 }
 }

 saveBeaconConfig(configs: BLEBeaconConfig[]): void {
 for (const config of configs) {
 this.beacons.set(config.id, { ...DEFAULT_BEACON_CONFIG, ...config });
 }
 localStorage.setItem('beacon_config', JSON.stringify(configs));
 }

 isBluetoothSupported(): boolean {
 return 'bluetooth' in navigator;
 }

 isScanningAvailable(): boolean {
 return this.isBluetoothSupported() && typeof (navigator as any).bluetooth.requestLEScan === 'function';
 }

 async startScan(onUpdate: (signals: BeaconSignal[]) => void): Promise<boolean> {
 if (this.isScanning) return true;
 if (!this.isBluetoothSupported()) {
 console.warn('Bluetooth is not supported on this device');
 return false;
 }

 try {
 const scan = await (navigator as any).bluetooth.requestLEScan({
 filters: [{ services: ['0000fe2a-0000-1000-8000-00805f9b34fb'] }],
 options: { keepRepeatedDevices: true },
 });

 this.isScanning = true;
 this.scanCallback = onUpdate;

 const handler = (event: any) => {
 const device = event.device;
 if (!device) return;

 const signal = this.parseBeaconSignal(device, event);
 if (signal) {
 const signals = this.getCurrentSignals();
 if (onUpdate) onUpdate(signals);
 }
 };

 (navigator as any).bluetooth.addEventListener('advertisementreceived', handler);

 this.scanIntervalId = window.setInterval(() => {
 const signals = this.getCurrentSignals();
 if (onUpdate) onUpdate(signals);
 }, 1000);

 return true;
 } catch (error) {
 console.error('Failed to start BLE scan:', error);
 return false;
 }
 }

 stopScan(): void {
 if (!this.isScanning) return;

 try {
 (navigator as any).bluetooth.cancelRequests();
 } catch {}

 if (this.scanIntervalId !== null) {
 clearInterval(this.scanIntervalId);
 this.scanIntervalId = null;
 }

 this.isScanning = false;
 this.scanCallback = null;
 }

 private parseBeaconSignal(device: any, event: any): BeaconSignal | null {
 const rssi = event.rssi;
 if (!rssi || rssi === 127) return null;

 const txPower = device.txPower ?? DEFAULT_BEACON_CONFIG.txPower ?? -59;
 const accuracy = this.calculateAccuracy(rssi, txPower);

 const beaconId = device.id || device.deviceId;
 const beaconConfig = this.findMatchingBeacon(beaconId);

 return {
 beaconId: beaconId,
 name: device.name || 'Unknown Beacon',
 major: device.major || beaconConfig?.major || 1,
 minor: device.minor || beaconConfig?.minor || 1,
 rssi: rssi,
 txPower: txPower,
 accuracy: accuracy,
 distance: this.calculateDistance(rssi, txPower),
 };
 }

 private calculateAccuracy(rssi: number, txPower: number): number {
 if (rssi === 0) return -1;
 const ratio = rssi / txPower;
 if (ratio < 1.0) {
 return Math.pow(ratio, 10);
 } else {
 return 0.89976 * Math.pow(ratio, 7.7095) + 0.111;
 }
 }

 private calculateDistance(rssi: number, txPower: number): number {
 if (rssi === 0) return -1;
 const accuracy = this.calculateAccuracy(rssi, txPower);
 return accuracy * 10;
 }

 private findMatchingBeacon(deviceId: string): BLEBeaconConfig | undefined {
 for (const [, config] of this.beacons) {
 if (config.id === deviceId) return config;
 }
 return undefined;
 }

 private getCurrentSignals(): BeaconSignal[] {
 return [];
 }

 triangulatePosition(signals: BeaconSignal[]): IndoorLocation | null {
 if (signals.length < 3) {
 if (signals.length === 1) {
 const signal = signals[0];
 const beaconConfig = this.findMatchingBeacon(signal.beaconId);
 if (beaconConfig) {
 return {
 x: beaconConfig.x,
 y: beaconConfig.y,
 floor: beaconConfig.floor,
 buildingId: beaconConfig.buildingId,
 confidence: 0.5,
 method: 'ble',
 nearestBeacon: signal.beaconId,
 nearestBeaconDistance: signal.distance,
 timestamp: Date.now(),
 };
 }
 }
 return null;
 }

 const validSignals = signals
 .filter(s => s.distance > 0 && s.distance < 50)
 .sort((a, b) => a.distance - b.distance)
 .slice(0, 5);

 if (validSignals.length < 3) return null;

 let totalWeight = 0;
 let weightedX = 0;
 let weightedY = 0;
 let totalFloor = 0;
 let buildingId = '';
 let minDistance = Infinity;

 for (const signal of validSignals) {
 const beaconConfig = this.findMatchingBeacon(signal.beaconId);
 if (!beaconConfig) continue;

 const weight = 1 / (signal.distance + 0.1);
 weightedX += beaconConfig.x * weight;
 weightedY += beaconConfig.y * weight;
 totalFloor += beaconConfig.floor * weight;
 totalWeight += weight;
 buildingId = beaconConfig.buildingId;

 if (signal.distance < minDistance) {
 minDistance = signal.distance;
 }
 }

 if (totalWeight === 0) return null;

 const confidence = Math.max(0, 1 - (minDistance / 20));

 return {
 x: weightedX / totalWeight,
 y: weightedY / totalWeight,
 floor: Math.round(totalFloor / totalWeight),
 buildingId: buildingId,
 confidence: Math.min(1, confidence),
 method: 'ble',
 nearestBeacon: validSignals[0]?.beaconId,
 nearestBeaconDistance: validSignals[0]?.distance,
 timestamp: Date.now(),
 };
 }

 getBeaconLocations(buildingId?: string): BeaconLocation[] {
 const locations: BeaconLocation[] = [];
 for (const [id, config] of this.beacons) {
 if (buildingId && config.buildingId !== buildingId) continue;
 locations.push({
 beaconId: id,
 x: config.x,
 y: config.y,
 floor: config.floor,
 buildingId: config.buildingId,
 roomId: config.roomId,
 label: config.name,
 });
 }
 return locations;
 }

 addVirtualBeacon(config: BLEBeaconConfig): void {
 this.beacons.set(config.id, { ...DEFAULT_BEACON_CONFIG, ...config });
 const configs = Array.from(this.beacons.values());
 localStorage.setItem('beacon_config', JSON.stringify(configs));
 }

 removeVirtualBeacon(beaconId: string): void {
 this.beacons.delete(beaconId);
 const configs = Array.from(this.beacons.values());
 localStorage.setItem('beacon_config', JSON.stringify(configs));
 }

 setConfidenceThreshold(threshold: number): void {
 this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
 }

 getConfidenceThreshold(): number {
 return this.confidenceThreshold;
 }
}

class WiFiLocalizationEngine {
 private fingerprints: Map<string, FingerprintMatch[]> = new Map();
 private lastScanResults: WiFiAccessPoint[] = [];
 private isScanning = false;

 constructor() {
 this.loadFingerprints();
 }

 private loadFingerprints(): void {
 try {
 const saved = localStorage.getItem('wifi_fingerprints');
 if (saved) {
 const data = JSON.parse(saved);
 for (const [locationId, prints] of Object.entries(data)) {
 this.fingerprints.set(locationId, prints as FingerprintMatch[]);
 }
 }
 } catch {
 console.warn('Failed to load WiFi fingerprints');
 }
 }

 saveFingerprints(locationId: string, fingerprints: FingerprintMatch[]): void {
 this.fingerprints.set(locationId, fingerprints);
 const data: Record<string, FingerprintMatch[]> = {};
 for (const [id, prints] of this.fingerprints) {
 data[id] = prints;
 }
 localStorage.setItem('wifi_fingerprints', JSON.stringify(data));
 }

 isWiFiSupported(): boolean {
 return 'networks' in navigator;
 }

 async scanWiFiNetworks(): Promise<WiFiAccessPoint[]> {
 if (!this.isWiFiSupported()) {
 console.warn('WiFi scanning is not supported on this device');
 return this.lastScanResults;
 }

 try {
 const networks = await (navigator as any).networks.getNetworkInformation();
 const accessPoints: WiFiAccessPoint[] = networks
 .filter((n: any) => n.type === 'wifi')
 .map((n: any) => ({
 bssid: n.bssid,
 ssid: n.ssid,
 rssi: n.signalStrength,
 frequency: n.frequency,
 }));

 this.lastScanResults = accessPoints;
 return accessPoints;
 } catch (error) {
 console.error('Failed to scan WiFi networks:', error);
 return this.lastScanResults;
 }
 }

 matchLocation(accessPoints: WiFiAccessPoint[]): FingerprintMatch | null {
 if (accessPoints.length === 0) return null;

 let bestMatch: FingerprintMatch | null = null;
 let bestScore = -Infinity;

 for (const [locationId, fingerprints] of this.fingerprints) {
 for (const fp of fingerprints) {
 const score = this.calculateMatchScore(accessPoints, fp);
 if (score > bestScore) {
 bestScore = score;
 bestMatch = fp;
 }
 }
 }

 return bestMatch;
 }

 private calculateMatchScore(accessPoints: WiFiAccessPoint[], fingerprint: FingerprintMatch): number {
 let score = 0;
 let matchedAPs = 0;

 for (const ap of accessPoints) {
 const expectedRssi = ap.rssi;
 const diff = Math.abs(ap.rssi - expectedRssi);

 if (diff < 10) {
 score += 10 - diff;
 matchedAPs++;
 }
 }

 if (matchedAPs === 0) return -1000;

 return score / Math.max(1, matchedAPs);
 }

 recordFingerprint(
 x: number,
 y: number,
 floor: number,
 buildingId: string,
 locationId: string
 ): void {
 const fingerprints = this.fingerprints.get(locationId) || [];
 fingerprints.push({
 locationId,
 score: 0,
 x,
 y,
 floor,
 buildingId,
 });
 this.fingerprints.set(locationId, fingerprints);
 this.saveFingerprints(locationId, fingerprints);
 }

 clearFingerprints(): void {
 this.fingerprints.clear();
 localStorage.removeItem('wifi_fingerprints');
 }
}

class IndoorLocalizationManager {
 private ble: BLELocalizationEngine;
 private wifi: WiFiLocalizationEngine;
 private qrDecoder: QRCodeDecoder | null = null;
 private currentLocation: IndoorLocation | null = null;
 private locationUpdateCallbacks: ((location: IndoorLocation) => void)[] = [];
 private updateIntervalId: number | null = null;

 constructor() {
 this.ble = new BLELocalizationEngine();
 this.wifi = new WiFiLocalizationEngine();
 }

 async initialize(): Promise<void> {
 await this.ble.loadBeaconConfig();
 this.wifi = new WiFiLocalizationEngine();

 this.wifi.scanWiFiNetworks().catch(() => {});
 }

 async startContinuousLocalization(
 onUpdate: (location: IndoorLocation) => void,
 intervalMs = 5000
 ): Promise<void> {
 this.locationUpdateCallbacks.push(onUpdate);

 if (this.updateIntervalId !== null) return;

 this.updateIntervalId = window.setInterval(async () => {
 const location = await this.getCurrentLocation();
 if (location) {
 this.currentLocation = location;
 for (const callback of this.locationUpdateCallbacks) {
 callback(location);
 }
 }
 }, intervalMs);

 const initialLocation = await this.getCurrentLocation();
 if (initialLocation) {
 this.currentLocation = initialLocation;
 onUpdate(initialLocation);
 }
 }

 stopContinuousLocalization(): void {
 if (this.updateIntervalId !== null) {
 clearInterval(this.updateIntervalId);
 this.updateIntervalId = null;
 }
 this.locationUpdateCallbacks = [];
 }

 async getCurrentLocation(): Promise<IndoorLocation | null> {
 const bleSupported = this.ble.isBluetoothSupported();
 const wifiSupported = this.wifi.isWiFiSupported();

 if (!bleSupported && !wifiSupported) {
 return null;
 }

 let location: IndoorLocation | null = null;

 if (bleSupported) {
 location = await this.getBLELocation();
 }

 if (!location && wifiSupported) {
 const wifiAPs = await this.wifi.scanWiFiNetworks();
 const match = this.wifi.matchLocation(wifiAPs);
 if (match) {
 location = {
 x: match.x,
 y: match.y,
 floor: match.floor,
 buildingId: match.buildingId,
 confidence: match.score / 10,
 method: 'wifi',
 timestamp: Date.now(),
 };
 }
 }

 return location;
 }

 private async getBLELocation(): Promise<IndoorLocation | null> {
 return new Promise((resolve) => {
 if (!this.ble.isScanningAvailable()) {
 const cachedSignals = this.getCachedBLESignals();
 if (cachedSignals.length >= 3) {
 resolve(this.ble.triangulatePosition(cachedSignals));
 return;
 }
 resolve(null);
 return;
 }

 let timeoutId: number | null = null;
 const signals: BeaconSignal[] = [];

 this.ble.startScan((newSignals) => {
 signals.push(...newSignals);
 });

 timeoutId = window.setTimeout(() => {
 this.ble.stopScan();
 const location = this.ble.triangulatePosition(signals);
 resolve(location);
 }, 3000);
 });
 }

 private getCachedBLESignals(): BeaconSignal[] {
 return [];
 }

 decodeQRCode(qrData: string): IndoorLocation | null {
 try {
 const prefix = 'CMA_LOC:';
 if (!qrData.startsWith(prefix)) {
 const legacyPrefix = 'CAMPUS_';
 if (qrData.startsWith(legacyPrefix)) {
 const locationId = qrData.replace(legacyPrefix, '').toLowerCase().replace(/_/g, '-');
 return this.getLocationFromId(locationId);
 }
 return null;
 }

 const data = qrData.substring(prefix.length);
 const parts = data.split('|');

 if (parts.length < 4) return null;

 return {
 x: parseFloat(parts[0]),
 y: parseFloat(parts[1]),
 floor: parseInt(parts[2]),
 buildingId: parts[3],
 confidence: 1.0,
 method: 'qr',
 timestamp: Date.now(),
 };
 } catch {
 return null;
 }
 }

 private getLocationFromId(locationId: string): IndoorLocation | null {
 const beacons = this.ble.getBeaconLocations();
 const matchingBeacon = beacons.find(b => b.beaconId.includes(locationId));

 if (matchingBeacon) {
 return {
 x: matchingBeacon.x,
 y: matchingBeacon.y,
 floor: matchingBeacon.floor,
 buildingId: matchingBeacon.buildingId,
 confidence: 1.0,
 method: 'qr',
 nearestBeacon: matchingBeacon.beaconId,
 timestamp: Date.now(),
 };
 }

 return null;
 }

 generateLocationQR(buildingId: string, x: number, y: number, floor: number): string {
 return `CMA_LOC:${x.toFixed(2)}|${y.toFixed(2)}|${floor}|${buildingId}`;
 }

 getCurrentPosition(): IndoorLocation | null {
 return this.currentLocation;
 }

 getBLEEngine(): BLELocalizationEngine {
 return this.ble;
 }

 getWiFiEngine(): WiFiLocalizationEngine {
 return this.wifi;
 }

 isBLEAvailable(): boolean {
 return this.ble.isBluetoothSupported();
 }

 isWiFiAvailable(): boolean {
 return this.wifi.isWiFiSupported();
 }
}

class QRCodeDecoder {
 decode(qrData: string): { type: string; data: any } | null {
 try {
 if (qrData.startsWith('{') || qrData.startsWith('CMA')) {
 if (qrData.startsWith('CMA|')) {
 const parts = qrData.split('|');
 return {
 type: 'attendance',
 data: {
 sessionId: parts[1],
 name: parts.length > 2 ? decodeURIComponent(parts[2]) : '',
 description: parts.length > 3 ? decodeURIComponent(parts[3]) : '',
 },
 };
 }

 if (qrData.startsWith('CMA_LOC:')) {
 const data = qrData.substring(8);
 const parts = data.split('|');
 return {
 type: 'location',
 data: {
 x: parseFloat(parts[0]),
 y: parseFloat(parts[1]),
 floor: parseInt(parts[2]),
 buildingId: parts[3],
 },
 };
 }

 return {
 type: 'json',
 data: JSON.parse(qrData),
 };
 }

 return {
 type: 'text',
 data: qrData,
 };
 } catch {
 return null;
 }
 }
}

export const indoorLocalization = new IndoorLocalizationManager();

export const bleLocalization = indoorLocalization.getBLEEngine();
export const wifiLocalization = indoorLocalization.getWiFiEngine();

export function isIndoorLocalizationAvailable(): boolean {
 return indoorLocalization.isBLEAvailable() || indoorLocalization.isWiFiAvailable();
}

export function decodeLocationQR(qrData: string): IndoorLocation | null {
 return indoorLocalization.decodeQRCode(qrData);
}

export function generateLocationQR(buildingId: string, x: number, y: number, floor: number): string {
 return indoorLocalization.generateLocationQR(buildingId, x, y, floor);
}

export function startIndoorLocalization(
 onUpdate: (location: IndoorLocation) => void,
 intervalMs = 5000
): Promise<void> {
 return indoorLocalization.startContinuousLocalization(onUpdate, intervalMs);
}

export function stopIndoorLocalization(): void {
 indoorLocalization.stopContinuousLocalization();
}
