import type { RouteResult, PathWaypoint } from './pathfinding';

export interface VoiceSettings {
 enabled: boolean;
 volume: number;
 rate: number;
 pitch: number;
 language: string;
 announceFloors: boolean;
 announceDistances: boolean;
 announceTurns: boolean;
}

const DEFAULT_SETTINGS: VoiceSettings = {
 enabled: true,
 volume: 1.0,
 rate: 1.0,
 pitch: 1.0,
 language: 'en-US',
 announceFloors: true,
 announceDistances: true,
 announceTurns: true,
};

class VoiceNavigationEngine {
 private synth: SpeechSynthesis;
 private settings: VoiceSettings;
 private currentUtterance: SpeechSynthesisUtterance | null = null;
 private isSpeaking = false;
 private route: RouteResult | null = null;
 private currentWaypointIndex = 0;
 private intervalId: number | null = null;
 private onWaypointChange: ((index: number) => void) | null = null;
 private onRouteComplete: (() => void) | null = null;
 private userPosition: { x: number; y: number } | null = null;

 constructor() {
 this.synth = window.speechSynthesis;
 this.settings = { ...DEFAULT_SETTINGS };
 this.loadSettings();
 }

 private loadSettings(): void {
 try {
 const saved = localStorage.getItem('voice_navigation_settings');
 if (saved) {
 this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
 }
 } catch {
 console.warn('Failed to load voice settings');
 }
 }

 saveSettings(settings: Partial<VoiceSettings>): void {
 this.settings = { ...this.settings, ...settings };
 localStorage.setItem('voice_navigation_settings', JSON.stringify(this.settings));
 }

 getSettings(): VoiceSettings {
 return { ...this.settings };
 }

 isSupported(): boolean {
 return 'speechSynthesis' in window;
 }

 private speak(text: string, priority = false): void {
 if (!this.settings.enabled || !this.isSupported()) return;

 if (priority) {
 this.synth.cancel();
 }

 if (this.isSpeaking && !priority) return;

 const utterance = new SpeechSynthesisUtterance(text);
 utterance.volume = this.settings.volume;
 utterance.rate = this.settings.rate;
 utterance.pitch = this.settings.pitch;
 utterance.lang = this.settings.language;

 const voices = this.synth.getVoices();
 const preferredVoice = voices.find(
 v => v.lang.startsWith(this.settings.language.split('-')[0]) && v.name.includes('Google')
 ) || voices.find(
 v => v.lang.startsWith(this.settings.language.split('-')[0])
 );

 if (preferredVoice) {
 utterance.voice = preferredVoice;
 }

 utterance.onstart = () => {
 this.isSpeaking = true;
 };

 utterance.onend = () => {
 this.isSpeaking = false;
 this.currentUtterance = null;
 };

 utterance.onerror = (e) => {
 console.warn('Speech synthesis error:', e);
 this.isSpeaking = false;
 this.currentUtterance = null;
 };

 this.currentUtterance = utterance;
 this.synth.speak(utterance);
 }

 private formatDistance(meters: number): string {
 if (meters < 100) {
 return `${Math.round(meters)} meters`;
 } else if (meters < 1000) {
 return `${Math.round(meters / 10) * 10} meters`;
 } else {
 return `${(meters / 1000).toFixed(1)} kilometers`;
 }
 }

 private formatTime(seconds: number): string {
 if (seconds < 60) {
 return `${Math.round(seconds)} seconds`;
 } else {
 const minutes = Math.round(seconds / 60);
 return `${minutes} minute${minutes > 1 ? 's' : ''}`;
 }
 }

 announceRouteStart(route: RouteResult): void {
 this.route = route;
 this.currentWaypointIndex = 0;

 const messages: string[] = [];

 messages.push('Navigation started');

 if (route.total_distance > 0) {
 messages.push(`Total distance: ${this.formatDistance(route.total_distance)}`);
 }

 if (route.estimated_time_seconds > 0) {
 messages.push(`Estimated time: ${this.formatTime(route.estimated_time_seconds)}`);
 }

 if (route.floors_traversed.length > 1) {
 const floors = route.floors_traversed.join(', ');
 messages.push(`Route spans floors: ${floors}`);
 }

 if (!route.is_accessible) {
 messages.push('Note: This route may include stairs');
 }

 messages.push('Starting navigation');

 this.speak(messages.join('. '), true);
 }

 announceWaypoint(waypoint: PathWaypoint, index: number, total: number): void {
 const messages: string[] = [];

 messages.push(`Step ${index + 1} of ${total}`);

 if (waypoint.instruction) {
 messages.push(waypoint.instruction);
 }

 if (this.settings.announceDistances && waypoint.distance_from_prev > 0) {
 messages.push(`Then walk ${this.formatDistance(waypoint.distance_from_prev * 0.1)}`);
 }

 if (this.settings.announceFloors) {
 const floorText = this.getFloorAnnouncement(waypoint.floor);
 if (floorText) {
 messages.push(floorText);
 }
 }

 this.speak(messages.join('. '), true);
 }

 private getFloorAnnouncement(floor: number): string {
 if (floor === 0 || floor === 1) {
 return 'Ground floor';
 } else if (floor > 0) {
 return `Floor ${floor}`;
 } else {
 return `Basement ${Math.abs(floor)}`;
 }
 }

 announceTurn(direction: 'left' | 'right' | 'around' | 'straight', distance?: number): void {
 if (!this.settings.announceTurns) return;

 let message = '';
 switch (direction) {
 case 'left':
 message = 'Turn left';
 break;
 case 'right':
 message = 'Turn right';
 break;
 case 'around':
 message = 'Turn around';
 break;
 case 'straight':
 message = 'Continue straight';
 break;
 }

 if (distance !== undefined && distance > 0) {
 message += `, then walk ${this.formatDistance(distance)}`;
 }

 this.speak(message, true);
 }

 announceArrival(destination: string): void {
 const messages = [
 'You have arrived at your destination',
 destination,
 ];

 this.speak(messages.join(': '), true);
 }

 announceFloorChange(fromFloor: number, toFloor: number, via: 'elevator' | 'stairs' | 'ramp'): void {
 const floorText = toFloor > fromFloor ? 'up' : 'down';
 const viaText = via === 'elevator' ? 'elevator' : via === 'ramp' ? 'ramp' : 'stairs';

 this.speak(
 `Take the ${viaText} ${floorText} to floor ${Math.abs(toFloor)}`,
 true
 );
 }

 announceRecalculating(): void {
 this.speak('Recalculating route', true);
 }

 announceError(message: string): void {
 this.speak(`Navigation error: ${message}`, true);
 }

 startTurnByTurnNavigation(
 route: RouteResult,
 getUserPosition: () => { x: number; y: number } | null,
 waypointReachedThreshold = 15
 ): void {
 this.stopNavigation();
 this.route = route;
 this.currentWaypointIndex = 0;
 this.userPosition = null;
 this.onWaypointChange = null;
 this.onRouteComplete = null;

 if (route.waypoints.length === 0) return;

 this.announceRouteStart(route);

 if (route.waypoints.length > 1) {
 setTimeout(() => {
 this.announceWaypoint(route.waypoints[1], 1, route.waypoints.length);
 }, 3000);
 }

 this.intervalId = window.setInterval(() => {
 const pos = getUserPosition();
 if (!pos || !this.route) return;

 this.userPosition = pos;

 for (let i = this.currentWaypointIndex + 1; i < this.route.waypoints.length; i++) {
 const waypoint = this.route.waypoints[i];
 const dx = waypoint.x - pos.x;
 const dy = waypoint.y - pos.y;
 const distance = Math.sqrt(dx * dx + dy * dy);

 if (distance < waypointReachedThreshold) {
 this.currentWaypointIndex = i;

 if (this.onWaypointChange) {
 this.onWaypointChange(i);
 }

 if (i === this.route.waypoints.length - 1) {
 this.announceArrival(waypoint.node_type);
 this.stopNavigation();
 if (this.onRouteComplete) {
 this.onRouteComplete();
 }
 return;
 }

 const nextWaypoint = this.route.waypoints[i + 1];
 const nextNextWaypoint = i + 2 < this.route.waypoints.length ? this.route.waypoints[i + 2] : null;

 const floorChange = nextWaypoint.floor - waypoint.floor;
 if (floorChange !== 0) {
 const via = waypoint.node_type === 'elevator' ? 'elevator' :
 waypoint.node_type === 'ramp' ? 'ramp' : 'stairs';
 this.announceFloorChange(waypoint.floor, nextWaypoint.floor, via);
 } else if (nextNextWaypoint) {
 const angle1 = Math.atan2(
 nextWaypoint.y - waypoint.y,
 nextWaypoint.x - waypoint.x
 );
 const angle2 = Math.atan2(
 nextNextWaypoint.y - nextWaypoint.y,
 nextNextWaypoint.x - nextWaypoint.x
 );
 const turnAngle = Math.abs(angle2 - angle1) * (180 / Math.PI);

 if (turnAngle > 30) {
 const direction = turnAngle > 150 ? 'around' :
 angle2 > angle1 ? 'right' : 'left';
 this.announceTurn(direction);
 }
 }

 this.announceWaypoint(nextWaypoint, i + 1, this.route.waypoints.length);
 break;
 }
 }
 }, 1000);
 }

 stopNavigation(): void {
 if (this.intervalId !== null) {
 clearInterval(this.intervalId);
 this.intervalId = null;
 }

 this.synth.cancel();
 this.isSpeaking = false;
 this.currentUtterance = null;
 this.route = null;
 this.currentWaypointIndex = 0;
 this.userPosition = null;
 }

 pause(): void {
 this.synth.pause();
 }

 resume(): void {
 this.synth.resume();
 }

 speakCustomText(text: string): void {
 this.speak(text, true);
 }

 getCurrentWaypointIndex(): number {
 return this.currentWaypointIndex;
 }

 setOnWaypointChange(callback: (index: number) => void): void {
 this.onWaypointChange = callback;
 }

 setOnRouteComplete(callback: () => void): void {
 this.onRouteComplete = callback;
 }

 isNavigating(): boolean {
 return this.intervalId !== null;
 }

 getVoices(): SpeechSynthesisVoice[] {
 return this.synth.getVoices();
 }

 preloadVoices(): Promise<SpeechSynthesisVoice[]> {
 return new Promise((resolve) => {
 const voices = this.synth.getVoices();
 if (voices.length > 0) {
 resolve(voices);
 return;
 }

 this.synth.onvoiceschanged = () => {
 resolve(this.synth.getVoices());
 };

 setTimeout(() => {
 resolve(this.synth.getVoices());
 }, 1000);
 });
 }

 testVoice(): void {
 this.speak(
 'Voice navigation is working. Hello! This is your campus navigation assistant.',
 true
 );
 }
}

export const voiceNavigation = new VoiceNavigationEngine();

export function enableVoiceAssistance(): void {
 voiceNavigation.saveSettings({ enabled: true });
}

export function disableVoiceAssistance(): void {
 voiceNavigation.saveSettings({ enabled: false });
}

export function isVoiceAssistanceEnabled(): boolean {
 return voiceNavigation.getSettings().enabled;
}

export function announceTurn(direction: 'left' | 'right' | 'around' | 'straight', distance?: number): void {
 voiceNavigation.announceTurn(direction, distance);
}

export function announceArrival(destination: string): void {
 voiceNavigation.announceArrival(destination);
}

export function speakCustomText(text: string): void {
 voiceNavigation.speakCustomText(text);
}
