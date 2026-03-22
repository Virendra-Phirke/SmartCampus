import { supabase } from './supabase';

export interface NavigationNode {
 id: string;
 building_id: string;
 floor: number;
 x_position: number;
 y_position: number;
 node_type: 'hallway' | 'stair' | 'elevator' | 'ramp' | 'entrance' | 'room';
 room_id: string | null;
 is_accessible: boolean;
}

export interface NavigationEdge {
 id: string;
 from_node_id: string;
 to_node_id: string;
 weight: number;
 is_accessible: boolean;
}

export interface PathWaypoint {
 node_id: string;
 x: number;
 y: number;
 floor: number;
 node_type: string;
 is_accessible: boolean;
 instruction: string;
 distance_from_prev: number;
}

export interface RouteResult {
 waypoints: PathWaypoint[];
 total_distance: number;
 estimated_time_seconds: number;
 is_accessible: boolean;
 floors_traversed: number[];
}

interface GraphNode {
 id: string;
 x: number;
 y: number;
 floor: number;
 node_type: string;
 room_id: string | null;
 is_accessible: boolean;
 neighbors: Map<string, number>;
}

const EARTH_RADIUS_M = 6371000;
const PIXELS_PER_METER = 10;

function haversineDistance(x1: number, y1: number, x2: number, y2: number): number {
 const dx = x2 - x1;
 const dy = y2 - y1;
 return Math.sqrt(dx * dx + dy * dy);
}

function estimatePixelDistance(node1: GraphNode, node2: GraphNode): number {
 const dx = node2.x - node1.x;
 const dy = node2.y - node1.y;
 return Math.sqrt(dx * dx + dy * dy);
}

function getInstruction(
 fromType: string,
 toType: string,
 isStart: boolean,
 isEnd: boolean,
 floorChange: number
): string {
 if (isStart) {
 if (toType === 'room') return 'Start heading towards your destination';
 if (toType === 'elevator') return 'Head to the elevator';
 if (toType === 'stair') return 'Head to the stairs';
 if (toType === 'ramp') return 'Head to the ramp';
 if (toType === 'entrance') return 'Head to the entrance';
 return 'Start walking';
 }

 if (isEnd) {
 if (fromType === 'elevator') return floorChange > 0 ? 'Exit elevator' : 'Exit elevator';
 if (fromType === 'stair') return 'Arrive at your destination';
 return 'You have arrived at your destination';
 }

 if (floorChange > 0) return `Take the ${toType} up ${floorChange} floor${floorChange > 1 ? 's' : ''}`;
 if (floorChange < 0) return `Take the ${toType} down ${Math.abs(floorChange)} floor${Math.abs(floorChange) > 1 ? 's' : ''}`;

 switch (toType) {
 case 'room': return 'Enter the room';
 case 'elevator': return 'Take the elevator';
 case 'stair': return 'Take the stairs';
 case 'ramp': return 'Use the ramp';
 case 'entrance': return 'Enter through the entrance';
 case 'hallway': return 'Continue through the hallway';
 default: return 'Continue walking';
 }
}

export class PathfindingEngine {
 private graph: Map<string, GraphNode> = new Map();
 private nodes: NavigationNode[] = [];
 private edges: NavigationEdge[] = [];
 private buildingNodes: Map<string, NavigationNode[]> = new Map();
 private initialized = false;

 async initialize(): Promise<void> {
 if (this.initialized) return;

 try {
 const [nodesResult, edgesResult] = await Promise.all([
 supabase.from('navigation_nodes').select('*'),
 supabase.from('navigation_edges').select('*'),
 ]);

 this.nodes = nodesResult.data || [];
 this.edges = edgesResult.data || [];

 this.buildingNodes.clear();
 for (const node of this.nodes) {
 const buildingNodes = this.buildingNodes.get(node.building_id) || [];
 buildingNodes.push(node);
 this.buildingNodes.set(node.building_id, buildingNodes);
 }

 this.buildGraph();
 this.initialized = true;
 } catch (error) {
 console.error('Failed to initialize pathfinding engine:', error);
 this.nodes = [];
 this.edges = [];
 this.initialized = true;
 }
 }

 private buildGraph(): void {
 this.graph.clear();

 for (const node of this.nodes) {
 this.graph.set(node.id, {
 id: node.id,
 x: node.x_position,
 y: node.y_position,
 floor: node.floor,
 node_type: node.node_type,
 room_id: node.room_id,
 is_accessible: node.is_accessible,
 neighbors: new Map(),
 });
 }

 for (const edge of this.edges) {
 const fromNode = this.graph.get(edge.from_node_id);
 const toNode = this.graph.get(edge.to_node_id);

 if (fromNode && toNode) {
 const distance = estimatePixelDistance(fromNode, toNode);
 fromNode.neighbors.set(toNode.id, edge.weight || distance);
 toNode.neighbors.set(fromNode.id, edge.weight || distance);
 }
 }
 }

 async computeShortestPath(
 sourceNodeId: string,
 targetNodeId: string,
 accessibilityMode = false
 ): Promise<RouteResult | null> {
 await this.initialize();

 const start = this.graph.get(sourceNodeId);
 const end = this.graph.get(targetNodeId);

 if (!start || !end) {
 console.error('Source or target node not found');
 return null;
 }

 if (accessibilityMode && (!start.is_accessible || !end.is_accessible)) {
 console.warn('Accessibility mode: route may not be fully accessible');
 }

 const path = this.dijkstra(start.id, end.id, accessibilityMode);

 if (!path || path.length === 0) {
 return null;
 }

 return this.buildRouteResult(path, accessibilityMode);
 }

 async computeRouteToRoom(
 buildingId: string,
 targetRoomId: string,
 sourceNodeId?: string,
 accessibilityMode = false
 ): Promise<RouteResult | null> {
 await this.initialize();

 const roomNodes = this.nodes.filter(
 n => n.building_id === buildingId && n.room_id === targetRoomId
 );

 if (roomNodes.length === 0) {
 console.warn(`No navigation nodes found for room ${targetRoomId}`);
 return null;
 }

 const targetNodeId = roomNodes[0].id;

 let sourceId = sourceNodeId;
 if (!sourceId) {
 const entranceNodes = this.nodes.filter(
 n => n.building_id === buildingId && n.node_type === 'entrance'
 );
 if (entranceNodes.length > 0) {
 sourceId = entranceNodes[0].id;
 } else {
 const firstNode = this.nodes.find(n => n.building_id === buildingId);
 if (!firstNode) return null;
 sourceId = firstNode.id;
 }
 }

 return this.computeShortestPath(sourceId, targetNodeId, accessibilityMode);
 }

 async computeBuildingToBuildingRoute(
 sourceBuildingId: string,
 targetBuildingId: string,
 accessibilityMode = false
 ): Promise<RouteResult | null> {
 await this.initialize();

 const sourceEntrances = this.nodes.filter(
 n => n.building_id === sourceBuildingId && n.node_type === 'entrance'
 );
 const targetEntrances = this.nodes.filter(
 n => n.building_id === targetBuildingId && n.node_type === 'entrance'
 );

 if (sourceEntrances.length === 0 || targetEntrances.length === 0) {
 console.warn('Could not find entrance nodes for route');
 return null;
 }

 let bestPath: string[] | null = null;
 let bestDistance = Infinity;

 for (const source of sourceEntrances) {
 for (const target of targetEntrances) {
 const path = this.dijkstra(source.id, target.id, accessibilityMode);
 if (path && path.length > 0) {
 const distance = this.calculatePathDistance(path);
 if (distance < bestDistance) {
 bestDistance = distance;
 bestPath = path;
 }
 }
 }
 }

 if (!bestPath) return null;

 return this.buildRouteResult(bestPath, accessibilityMode);
 }

 private dijkstra(startId: string, endId: string, accessibilityMode = false): string[] | null {
 const distances = new Map<string, number>();
 const previous = new Map<string, string | null>();
 const unvisited = new Set<string>();

 for (const nodeId of this.graph.keys()) {
 distances.set(nodeId, Infinity);
 unvisited.add(nodeId);
 }

 distances.set(startId, 0);
 previous.set(startId, null);

 while (unvisited.size > 0) {
 let current: string | null = null;
 let minDist = Infinity;

 for (const nodeId of unvisited) {
 const dist = distances.get(nodeId) ?? Infinity;
 if (dist < minDist) {
 minDist = dist;
 current = nodeId;
 }
 }

 if (current === null || current === endId) break;

 unvisited.delete(current);

 const currentNode = this.graph.get(current);
 if (!currentNode) continue;

 for (const [neighborId, weight] of currentNode.neighbors) {
 if (!unvisited.has(neighborId)) continue;

 const neighborNode = this.graph.get(neighborId);
 if (!neighborNode) continue;

 if (accessibilityMode && !neighborNode.is_accessible) continue;

 const edge = this.edges.find(
 e => (e.from_node_id === current && e.to_node_id === neighborId) ||
 (e.from_node_id === neighborId && e.to_node_id === current)
 );

 if (accessibilityMode && edge && !edge.is_accessible) continue;

 let adjustedWeight = weight;
 if (currentNode.node_type === 'stair') adjustedWeight *= 2;
 if (neighborNode.node_type === 'elevator' || neighborNode.node_type === 'ramp') {
 adjustedWeight *= 1.5;
 }

 const alt = (distances.get(current) ?? Infinity) + adjustedWeight;
 const neighborDist = distances.get(neighborId) ?? Infinity;

 if (alt < neighborDist) {
 distances.set(neighborId, alt);
 previous.set(neighborId, current);
 }
 }
 }

 const path: string[] = [];
 let current: string | null = endId;

 while (current !== null) {
 path.unshift(current);
 current = previous.get(current) ?? null;
 }

 return (distances.get(endId) ?? Infinity) === Infinity ? null : path;
 }

 private aStar(startId: string, endId: string, accessibilityMode = false): string[] | null {
 const startNode = this.graph.get(startId);
 const endNode = this.graph.get(endId);

 if (!startNode || !endNode) return null;

 const openSet = new Set<string>([startId]);
 const cameFrom = new Map<string, string | null>();
 const gScore = new Map<string, number>();
 const fScore = new Map<string, number>();

 for (const nodeId of this.graph.keys()) {
 gScore.set(nodeId, Infinity);
 fScore.set(nodeId, Infinity);
 }

 gScore.set(startId, 0);
 fScore.set(startId, haversineDistance(startNode.x, startNode.y, endNode.x, endNode.y));

 while (openSet.size > 0) {
 let current: string | null = null;
 let minF = Infinity;

 for (const nodeId of openSet) {
 const f = fScore.get(nodeId) ?? Infinity;
 if (f < minF) {
 minF = f;
 current = nodeId;
 }
 }

 if (current === endId) {
 const path: string[] = [];
 let node: string | null = endId;
 while (node !== null) {
 path.unshift(node);
 node = cameFrom.get(node) ?? null;
 }
 return path;
 }

 openSet.delete(current!);
 const currentGraphNode = this.graph.get(current!);
 if (!currentGraphNode) continue;

 for (const [neighborId, weight] of currentGraphNode.neighbors) {
 if (!openSet.has(neighborId)) continue;

 const neighborNode = this.graph.get(neighborId);
 if (!neighborNode) continue;

 if (accessibilityMode && (!neighborNode.is_accessible || !currentGraphNode.is_accessible)) {
 continue;
 }

 const tentativeG = (gScore.get(current!) ?? Infinity) + weight;
 const neighborG = gScore.get(neighborId) ?? Infinity;

 if (tentativeG < neighborG) {
 cameFrom.set(neighborId, current);
 gScore.set(neighborId, tentativeG);
 const h = haversineDistance(neighborNode.x, neighborNode.y, endNode.x, endNode.y);
 fScore.set(neighborId, tentativeG + h);
 openSet.add(neighborId);
 }
 }
 }

 return null;
 }

 private calculatePathDistance(path: string[]): number {
 let total = 0;
 for (let i = 1; i < path.length; i++) {
 const fromNode = this.graph.get(path[i - 1]);
 const toNode = this.graph.get(path[i]);
 if (fromNode && toNode) {
 total += estimatePixelDistance(fromNode, toNode);
 }
 }
 return total;
 }

 private buildRouteResult(path: string[], accessibilityMode: boolean): RouteResult {
 const waypoints: PathWaypoint[] = [];
 let totalDistance = 0;
 const floorsTraversed = new Set<number>();
 let lastFloor = 0;
 let lastNode: GraphNode | null = null;

 for (let i = 0; i < path.length; i++) {
 const node = this.graph.get(path[i]);
 if (!node) continue;

 floorsTraversed.add(node.floor);

 let distanceFromPrev = 0;
 if (lastNode) {
 distanceFromPrev = estimatePixelDistance(lastNode, node);
 totalDistance += distanceFromPrev;
 }

 const floorChange = i === 0 ? 0 : node.floor - lastFloor;

 const isStart = i === 0;
 const isEnd = i === path.length - 1;
 const nextNode = i < path.length - 1 ? this.graph.get(path[i + 1]) : null;

 let instruction = '';
 if (isStart) {
 instruction = getInstruction(node.node_type, nextNode?.node_type || 'room', true, false, 0);
 } else if (isEnd) {
 instruction = getInstruction(lastNode?.node_type || 'hallway', node.node_type, false, true, 0);
 } else {
 instruction = getInstruction(lastNode?.node_type || 'hallway', node.node_type, false, false, floorChange);
 }

 if (i > 0 && i < path.length - 1) {
 const prevNode = this.graph.get(path[i - 1]);
 const currNode = node;
 const nextGraphNode = nextNode;

 if (prevNode && currNode && nextGraphNode) {
 const angle1 = Math.atan2(currNode.y - prevNode.y, currNode.x - prevNode.x);
 const angle2 = Math.atan2(nextGraphNode.y - currNode.y, nextGraphNode.x - currNode.x);
 const turnAngle = Math.abs(angle2 - angle1) * (180 / Math.PI);

 if (turnAngle > 30 && turnAngle < 150) {
 if (turnAngle > 90) {
 instruction = 'Turn around and continue';
 } else if (angle2 > angle1) {
 instruction = 'Turn right';
 } else {
 instruction = 'Turn left';
 }
 }
 }
 }

 waypoints.push({
 node_id: node.id,
 x: node.x,
 y: node.y,
 floor: node.floor,
 node_type: node.node_type,
 is_accessible: node.is_accessible,
 instruction,
 distance_from_prev: Math.round(distanceFromPrev),
 });

 lastFloor = node.floor;
 lastNode = node;
 }

 const metersPerPixel = 0.1;
 const totalDistanceMeters = totalDistance * metersPerPixel;
 const walkingSpeedMps = 1.4;
 const estimatedTimeSeconds = Math.round(totalDistanceMeters / walkingSpeedMps);

 return {
 waypoints,
 total_distance: Math.round(totalDistanceMeters),
 estimated_time_seconds: estimatedTimeSeconds,
 is_accessible: accessibilityMode ? waypoints.every(w => w.is_accessible) : true,
 floors_traversed: Array.from(floorsTraversed).sort((a, b) => a - b),
 };
 }

 getNodesNearLocation(buildingId: string, x: number, y: number, radius: number = 50): NavigationNode[] {
 return this.nodes.filter(
 n => n.building_id === buildingId &&
 Math.abs(n.x_position - x) <= radius &&
 Math.abs(n.y_position - y) <= radius
 );
 }

 getAccessibleRoute(sourceNodeId: string, targetNodeId: string): Promise<RouteResult | null> {
 return this.computeShortestPath(sourceNodeId, targetNodeId, true);
 }

 async getRouteDirections(route: RouteResult): Promise<string[]> {
 const directions: string[] = [];

 for (let i = 0; i < route.waypoints.length; i++) {
 const waypoint = route.waypoints[i];

 if (i === 0) {
 directions.push(`Start: ${waypoint.instruction}`);
 if (waypoint.distance_from_prev > 0) {
 directions.push(`Walk ${Math.round(waypoint.distance_from_prev * 0.1)} meters`);
 }
 continue;
 }

 if (waypoint.floor !== route.waypoints[i - 1].floor) {
 const prevWp = route.waypoints[i - 1];
 const floorDiff = waypoint.floor - prevWp.floor;

 if (floorDiff > 0) {
 directions.push(`Take the ${prevWp.node_type === 'elevator' ? 'elevator' : 'stairs'} up ${floorDiff} floor${floorDiff > 1 ? 's' : ''}`);
 } else {
 directions.push(`Take the ${prevWp.node_type === 'elevator' ? 'elevator' : 'stairs'} down ${Math.abs(floorDiff)} floor${Math.abs(floorDiff) > 1 ? 's' : ''}`);
 }
 } else {
 const prevWp = route.waypoints[i - 1];
 if (prevWp.distance_from_prev > 0) {
 directions.push(`Walk ${Math.round(prevWp.distance_from_prev * 0.1)} meters`);
 }
 directions.push(waypoint.instruction);
 }
 }

 directions.push(`Arrival! Total distance: ${route.total_distance} meters`);
 directions.push(`Estimated time: ${Math.round(route.estimated_time_seconds / 60)} minutes`);

 return directions;
 }

 invalidateCache(): void {
 this.initialized = false;
 this.graph.clear();
 this.nodes = [];
 this.edges = [];
 }
}

export const pathfindingEngine = new PathfindingEngine();

export async function computeShortestPath(
 sourceNodeId: string,
 targetNodeId: string,
 accessibilityMode = false
): Promise<RouteResult | null> {
 return pathfindingEngine.computeShortestPath(sourceNodeId, targetNodeId, accessibilityMode);
}

export async function computeRouteToRoom(
 buildingId: string,
 roomId: string,
 sourceNodeId?: string,
 accessibilityMode = false
): Promise<RouteResult | null> {
 return pathfindingEngine.computeRouteToRoom(buildingId, roomId, sourceNodeId, accessibilityMode);
}

export async function computeBuildingToBuildingRoute(
 sourceBuildingId: string,
 targetBuildingId: string,
 accessibilityMode = false
): Promise<RouteResult | null> {
 return pathfindingEngine.computeBuildingToBuildingRoute(sourceBuildingId, targetBuildingId, accessibilityMode);
}

export async function getAccessibleRoute(
 sourceNodeId: string,
 targetNodeId: string
): Promise<RouteResult | null> {
 return pathfindingEngine.getAccessibleRoute(sourceNodeId, targetNodeId);
}

export function getNavigationNodesForBuilding(buildingId: string): NavigationNode[] {
 return pathfindingEngine['nodes'].filter(n => n.building_id === buildingId);
}

export async function initializePathfinding(): Promise<void> {
 await pathfindingEngine.initialize();
}
