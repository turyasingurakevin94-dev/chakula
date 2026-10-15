import { campusData } from './campusData';

// Our own map of MUBS Nakawa, from OpenStreetMap, packed into the app by tools/campus-map/build.py.
// Everything is in metres: x east and y south, so it draws straight onto the screen. Routes are
// worked out here on the phone, on the same roads, so there is no map server and no Google.

export type Pt = [number, number];
export type DropKind = 'gate' | 'campus' | 'hostel';
export type DropPoint = { id: string; name: string; kind: DropKind; where: string; at: Pt };
export type CampusData = {
  campus: string;
  green: string;
  buildings: string;
  campusBuildings: string;
  roads: { major: string; minor: string; path: string };
  labels: { text: string; at: Pt; angle: number; size: number; area?: boolean }[];
  // Road graph: node positions, and edges [from, to, km/h, one-way].
  graph: { nodes: Pt[]; edges: [number, number, number, number][] };
  points: DropPoint[];
  kitchens: Record<string, { name: string; at: Pt }>;
};

export const dropPoints = campusData.points;

export function findDropPoint(id: string | undefined) {
  return dropPoints.find((p) => p.id === id);
}

export function kitchenAt(restaurantId: string): Pt {
  return (campusData.kitchens[restaurantId] ?? campusData.kitchens['nakawa-kitchen']!).at;
}

// ---- Routing: Dijkstra on the bundled road graph, fastest by motorbike ----

type Edge = { to: number; m: number; s: number };
let adjacency: Edge[][] | null = null;

function graph() {
  if (adjacency) return adjacency;
  const { nodes, edges } = campusData.graph;
  adjacency = nodes.map(() => []);
  for (const [a, b, kmh, oneway] of edges) {
    const m = dist(nodes[a]!, nodes[b]!);
    const s = m / (kmh / 3.6);
    adjacency[a]!.push({ to: b, m, s });
    if (!oneway) adjacency[b]!.push({ to: a, m, s });
  }
  return adjacency;
}

export function dist(a: Pt, b: Pt) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function nearestNode(p: Pt) {
  const { nodes } = campusData.graph;
  let best = 0;
  let bestD = Infinity;
  nodes.forEach((n, i) => {
    const d = dist(n, p);
    if (d < bestD && graph()[i]!.length > 0) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

export type Route = { points: Pt[]; metres: number; seconds: number };

const routeCache = new Map<string, Route>();
const trees = new Map<number, { time: Float64Array; prev: Int32Array }>();

// Fastest times from one road node to every other, worked out once and reused, so a list of
// drop points costs one search, not one per row.
function tree(s: number) {
  const hit = trees.get(s);
  if (hit) return hit;
  const adj = graph();
  const n = campusData.graph.nodes.length;
  const time = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  time[s] = 0;
  // A plain scan is quick enough for ~1,400 nodes and keeps this dependency-free.
  for (;;) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!done[i] && time[i]! < best) {
        best = time[i]!;
        u = i;
      }
    }
    if (u < 0) break;
    done[u] = 1;
    for (const e of adj[u]!) {
      const nt = best + e.s;
      if (nt < time[e.to]!) {
        time[e.to] = nt;
        prev[e.to] = u;
      }
    }
  }
  const result = { time, prev };
  trees.set(s, result);
  return result;
}

// The fastest way between two spots, starting and ending on the nearest road.
export function route(from: Pt, to: Pt): Route {
  const key = `${from.join(',')}>${to.join(',')}`;
  const hit = routeCache.get(key);
  if (hit) return hit;
  const { nodes } = campusData.graph;
  const t = nearestNode(to);
  const { time, prev } = tree(nearestNode(from));
  const path: Pt[] = [];
  if (time[t] === Infinity) {
    path.push(from, to);
  } else {
    for (let n = t; n !== -1; n = prev[n]!) path.push(nodes[n]!);
    path.reverse();
  }
  const points = [from, ...path, to].filter((p, i, a) => i === 0 || dist(p, a[i - 1]!) > 0.5);
  const metres = length(points);
  const r = { points, metres, seconds: time[t] === Infinity ? metres / 4 : time[t]! + (dist(from, path[0]!) + dist(to, path[path.length - 1]!)) / 3 };
  routeCache.set(key, r);
  return r;
}

export function length(pts: Pt[]) {
  let m = 0;
  for (let i = 1; i < pts.length; i++) m += dist(pts[i - 1]!, pts[i]!);
  return m;
}

// The point a fraction of the way along a line, and the line split there.
export function along(pts: Pt[], fraction: number): { at: Pt; done: Pt[]; ahead: Pt[] } {
  const goal = length(pts) * Math.max(0, Math.min(1, fraction));
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const d = dist(a, b);
    if (acc + d >= goal) {
      const f = d ? (goal - acc) / d : 0;
      const at: Pt = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      return { at, done: [...pts.slice(0, i), at], ahead: [at, ...pts.slice(i)] };
    }
    acc += d;
  }
  const end = pts[pts.length - 1]!;
  return { at: end, done: pts, ahead: [end] };
}

// Compass-style bearing on the screen: 0 = up (north), 90 = right (east).
export function bearing(a: Pt, b: Pt) {
  return (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI;
}

// Which way the road goes over the next few metres.
export function headingAhead(ahead: Pt[], metres = 30) {
  if (ahead.length < 2) return 0;
  const target = along(ahead, Math.min(1, metres / Math.max(1, length(ahead)))).at;
  return bearing(ahead[0]!, dist(target, ahead[0]!) > 1 ? target : ahead[1]!);
}

export type Turn = { metres: number; icon: 'left' | 'right' | 'straight'; text: string };

// The next real turn on the road ahead, for riding mode and the voice.
export function nextTurn(ahead: Pt[], destination: string): Turn {
  let acc = 0;
  for (let i = 1; i < ahead.length - 1; i++) {
    acc += dist(ahead[i - 1]!, ahead[i]!);
    if (dist(ahead[i]!, ahead[i + 1]!) < 4) continue;
    const before = bearing(ahead[Math.max(0, i - 1)]!, ahead[i]!);
    const after = bearing(ahead[i]!, ahead[i + 1]!);
    const change = ((after - before + 540) % 360) - 180;
    if (Math.abs(change) > 35) {
      const icon = change > 0 ? 'right' : 'left';
      return { metres: roundMetres(acc), icon, text: `${Math.abs(change) > 120 ? 'Sharp' : 'Turn'} ${icon}` };
    }
  }
  return { metres: roundMetres(length(ahead)), icon: 'straight', text: `Straight on to ${destination}` };
}

function roundMetres(m: number) {
  return m < 100 ? Math.max(10, Math.round(m / 10) * 10) : Math.round(m / 50) * 50;
}

// Riding minutes for a stretch, never less than one.
export function minutesFor(seconds: number) {
  return Math.max(1, Math.round(seconds / 60));
}

// ---- Views: where the map looks, in metres, and how big ----

export type MapView = { center: Pt; scale: number; rotate: number };

// Fits spots into the screen, leaving room for cards: pad = [top, right, bottom, left] in px.
export function fitView(spots: Pt[], width: number, height: number, pad: [number, number, number, number] = [24, 24, 24, 24], maxScale = 1.4): MapView {
  const xs = spots.map((p) => p[0]);
  const ys = spots.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const w = Math.max(1, width - pad[1] - pad[3]);
  const h = Math.max(1, height - pad[0] - pad[2]);
  const scale = Math.min(maxScale, w / Math.max(1, maxX - minX), h / Math.max(1, maxY - minY));
  // Shift the centre so the spots sit in the middle of the padded box, not of the screen.
  const cx = (minX + maxX) / 2 - (pad[3] - pad[1]) / 2 / scale;
  const cy = (minY + maxY) / 2 - (pad[0] - pad[2]) / 2 / scale;
  return { center: [cx, cy], scale, rotate: 0 };
}

// Heading-up view that keeps the rider at (width/2, anchorY) with the road ahead going up.
export function followView(at: Pt, heading: number, width: number, height: number, anchorY: number, scale = 1.6): MapView {
  const rotate = -heading;
  const off = (anchorY - height / 2) / scale;
  const r = (heading * Math.PI) / 180;
  // Move the centre forward along the heading so the rider sits low on the screen.
  const center: Pt = [at[0] + Math.sin(r) * off, at[1] - Math.cos(r) * off];
  return { center, scale, rotate };
}

// Metres to screen pixels for a view.
export function project(view: MapView, width: number, height: number, p: Pt): Pt {
  const r = (view.rotate * Math.PI) / 180;
  const dx = (p[0] - view.center[0]) * view.scale;
  const dy = (p[1] - view.center[1]) * view.scale;
  return [width / 2 + dx * Math.cos(r) - dy * Math.sin(r), height / 2 + dx * Math.sin(r) + dy * Math.cos(r)];
}

export const mapData = campusData;
