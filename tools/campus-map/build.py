"""Packs the OpenStreetMap extract around MUBS Nakawa into campusData.ts for the student and rider apps.

The apps draw this themselves (react-native-svg) and route on the road graph on the phone, so there is
no map server and no Google. Map data (c) OpenStreetMap contributors, ODbL.

  curl -o /tmp/mubs.osm "https://api.openstreetmap.org/api/0.6/map?bbox=32.6095,0.3215,32.6265,0.3355"
  python3 tools/campus-map/build.py /tmp/mubs.osm
"""
import json, math, os, sys, xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
# Local metres: x east, y south (like the screen), from this origin.
LAT0, LON0 = 0.3275, 32.6165
MY = 110574.0
MX = 111320.0 * math.cos(math.radians(LAT0))
# What the apps carry: campus, the Kiswa hostels and the Jinja Road side.
BOX = (0.3212, 32.6105, 0.3345, 32.6225)


def xy(ll):
    return (round((ll[1] - LON0) * MX), round(-(ll[0] - LAT0) * MY))


def inbox(ll, pad=0.0):
    return BOX[0] - pad <= ll[0] <= BOX[2] + pad and BOX[1] - pad <= ll[1] <= BOX[3] + pad


root = ET.parse(sys.argv[1]).getroot()
nodes, ways = {}, []
for el in root:
    if el.tag == 'node':
        nodes[el.get('id')] = (float(el.get('lat')), float(el.get('lon')))
    elif el.tag == 'way':
        t = {x.get('k'): x.get('v') for x in el.findall('tag')}
        ways.append((el.get('id'), [n.get('ref') for n in el.findall('nd')], t))

points = json.load(open(os.path.join(HERE, 'drop-points.json')))
CAMPUS_ID = '317923869'
campus_ll = next([nodes[r] for r in refs] for i, refs, t in ways if i == CAMPUS_ID)


def inside(ll, poly):
    x, y = ll[1], ll[0]; c = False
    for i in range(len(poly) - 1):
        y1, x1 = poly[i]; y2, x2 = poly[i + 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def area_m2(pts):
    a = 0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


def simplify(pts, tol=1.5):
    """Douglas-Peucker in metres."""
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1e-9
    i, dmax = 0, 0
    for k in range(1, len(pts) - 1):
        d = abs(dy * pts[k][0] - dx * pts[k][1] + x2 * y1 - y2 * x1) / L
        if d > dmax:
            i, dmax = k, d
    if dmax <= tol:
        return [pts[0], pts[-1]]
    return simplify(pts[:i + 1], tol)[:-1] + simplify(pts[i:], tol)


def d_poly(pts):
    return 'M' + 'L'.join(f'{x} {y}' for x, y in pts) + 'Z'


def d_line(pts):
    return 'M' + 'L'.join(f'{x} {y}' for x, y in pts)


green, bld, bld_campus = [], [], []
roads = {'major': [], 'minor': [], 'path': []}
MAJOR = {'trunk', 'trunk_link', 'secondary', 'tertiary'}
MINOR = {'residential', 'unclassified', 'service', 'living_street'}
PATHS = {'path', 'footway', 'steps', 'pedestrian', 'track'}
for wid, refs, t in ways:
    ll = [nodes[r] for r in refs if r in nodes]
    if len(ll) < 2 or not any(inbox(p) for p in ll):
        continue
    pts = [xy(p) for p in ll]
    if 'building' in t and len(pts) > 3:
        if area_m2(pts) < 30:
            continue
        cy = sum(p[0] for p in ll) / len(ll); cx = sum(p[1] for p in ll) / len(ll)
        (bld_campus if inside((cy, cx), campus_ll) else bld).append(d_poly(simplify(pts[:-1], 1.0)))
    elif t.get('leisure') in ('pitch', 'park', 'garden') or t.get('landuse') in ('grass', 'forest', 'recreation_ground') or t.get('natural') in ('wood', 'scrub', 'grassland'):
        green.append(d_poly(simplify(pts[:-1], 1.5)))
    hw = t.get('highway')
    if hw in MAJOR:
        roads['major'].append(d_line(simplify(pts)))
    elif hw in MINOR:
        roads['minor'].append(d_line(simplify(pts)))
    elif hw in PATHS:
        roads['path'].append(d_line(simplify(pts)))

# Road graph for routing on the phone: roads, lanes and tracks. Footways and pedestrian areas only
# when motorbikes are explicitly allowed on them, so riding mode never sends a bike down a footpath.
SPEED = {'trunk': 22, 'trunk_link': 18, 'secondary': 22, 'tertiary': 20, 'residential': 18, 'unclassified': 16, 'living_street': 12,
         'service': 14, 'path': 8, 'footway': 7, 'track': 10, 'pedestrian': 7}
FOOT_ONLY = {'footway', 'pedestrian'}
ALLOWED = {'yes', 'permissive', 'designated', 'destination'}
BLOCKED = {'no', 'private'}


def rideable(t):
    hw = t.get('highway')
    bike = t.get('motorcycle') or t.get('motor_vehicle') or t.get('vehicle')
    if bike in BLOCKED or t.get('access') in BLOCKED and bike not in ALLOWED:
        return False
    return hw not in FOOT_ONLY or bike in ALLOWED
gid, gpts, edges = {}, [], []


def gnode(r):
    if r not in gid:
        gid[r] = len(gpts); gpts.append(xy(nodes[r]))
    return gid[r]


for wid, refs, t in ways:
    hw = t.get('highway')
    if hw not in SPEED or not rideable(t):
        continue
    refs = [r for r in refs if r in nodes and inbox(nodes[r], 0.001)]
    oneway = 1 if t.get('oneway') == 'yes' else 0
    for a, b in zip(refs, refs[1:]):
        edges.append([gnode(a), gnode(b), SPEED[hw], oneway])

# Drop the nodes that only shape a road: keep junctions and ends, merge the rest into polylines later in the app?
# Kept simple: the app routes node to node; a few thousand nodes are quick for Dijkstra.

kitchens = json.load(open(os.path.join(HERE, 'kitchens.json')))
out_points = []
for p in points:
    x, y = xy((p['lat'], p['lon']))
    out_points.append({'id': p['id'], 'name': p['name'], 'kind': p['kind'], 'where': p['where'], 'at': [x, y]})
out_kitchens = {k: {'name': v['name'], 'at': list(xy(v['ll']))} for k, v in kitchens.items()}

labels = [
    {'text': 'JINJA ROAD', 'at': list(xy((0.33165, 32.6150))), 'angle': -38, 'size': 11},
    {'text': 'NEW PORT BELL ROAD', 'at': list(xy((0.32505, 32.6181))), 'angle': -38, 'size': 10},
    {'text': 'MUBS', 'at': list(xy((0.32835, 32.6162))), 'angle': 0, 'size': 13, 'area': True},
    {'text': 'KISWA', 'at': list(xy((0.32290, 32.6174))), 'angle': 0, 'size': 13, 'area': True},
    {'text': 'NAKAWA', 'at': list(xy((0.33130, 32.6133))), 'angle': 0, 'size': 13, 'area': True},
]

data = {
    'campus': d_poly(simplify([xy(p) for p in campus_ll][:-1], 1.0)),
    'green': ''.join(green),
    'buildings': ''.join(bld),
    'campusBuildings': ''.join(bld_campus),
    'roads': {k: ''.join(v) for k, v in roads.items()},
    'labels': labels,
    'graph': {'nodes': gpts, 'edges': edges},
    'points': out_points,
    'kitchens': out_kitchens,
}

ts = ('// Generated by tools/campus-map/build.py from OpenStreetMap. Do not edit by hand.\n'
      '// Map data (c) OpenStreetMap contributors, ODbL. Units: metres, x east and y south of MUBS.\n'
      'import type { CampusData } from \'./campus\';\n\n'
      'export const campusData: CampusData = ' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n')
for app in ('src', 'rider/src'):
    path = os.path.join(ROOT, app, 'lib', 'campusData.ts')
    open(path, 'w').write(ts)
    print(path, len(ts) // 1024, 'KB', len(gpts), 'nodes', len(edges), 'edges', len(bld) + len(bld_campus), 'buildings')
