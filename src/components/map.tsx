import { memo } from 'react';
import { Linking, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { mapData, project, type MapView, type Pt } from '../lib/campus';
import { colors, fonts } from '../lib/theme';

// Our own campus map, drawn from the OpenStreetMap data packed into the app. No map SDK, no server.

const ink = {
  ground: '#F3ECE0',
  campus: '#FBF6EE',
  campusEdge: '#CFC2AC',
  building: '#E4D9C7',
  campusBuilding: '#DCCFB9',
  green: '#D9E5D0',
  casing: '#E2D5C1',
  road: '#FFFFFF',
  path: '#C9B99F',
  label: '#7A776E',
  done: '#BDB3A3',
};

export type MapLine = { points: Pt[]; color?: string; width?: number; dashed?: boolean };
export type MapPin = { id: string; at: Pt; label?: string; tone?: 'forest' | 'kitchen' | 'muted'; big?: boolean; selected?: boolean };

type Props = {
  width: number;
  height: number;
  view: MapView;
  lines?: MapLine[];
  pins?: MapPin[];
  rider?: { at: Pt; heading: number };
  onPinPress?: (id: string) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

export function CampusMap({ width, height, view, lines = [], pins = [], rider, onPinPress, accessibilityLabel, style }: Props) {
  const at = (p: Pt) => project(view, width, height, p);
  const line = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${at(p)[0].toFixed(1)} ${at(p)[1].toFixed(1)}`).join('');
  return (
    <View style={[{ width, height, backgroundColor: ink.ground, overflow: 'hidden' }, style]}>
      <Svg width={width} height={height} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
        <Base width={width} height={height} cx={view.center[0]} cy={view.center[1]} scale={view.scale} rotate={view.rotate} />
        {lines.map((l, i) => (
          <G key={`l${i}`}>
            <Path d={line(l.points)} stroke="#FFFFFF" strokeWidth={(l.width ?? 6) + 5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={line(l.points)} stroke={l.color ?? colors.forest} strokeWidth={l.width ?? 6} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={l.dashed ? '2 9' : undefined} />
          </G>
        ))}
        {[...pins].sort((a, b) => Number(!!a.selected) - Number(!!b.selected)).map((p) => {
          const [x, y] = at(p.at);
          const r = p.big || p.selected ? 15 : 11;
          const fill = p.tone === 'kitchen' ? colors.orange : p.tone === 'muted' ? '#A69C8C' : colors.forest;
          const d = `M${x} ${y}C${x - 4} ${y - 7} ${x - r} ${y - r} ${x - r} ${y - r - 6}A${r} ${r} 0 1 1 ${x + r} ${y - r - 6}C${x + r} ${y - r} ${x + 4} ${y - 7} ${x} ${y}Z`;
          return (
            <G key={p.id} onPress={onPinPress ? () => onPinPress(p.id) : undefined}>
              {p.selected ? <Circle cx={x} cy={y - r - 6} r={r + 12} fill={colors.forest} fillOpacity={0.14} /> : null}
              {/* A larger invisible target, so a small pin is still easy to tap. */}
              {onPinPress ? <Circle cx={x} cy={y - r - 6} r={22} fill="#FFFFFF" fillOpacity={0.01} /> : null}
              <Path d={d} fill={fill} stroke="#FFFFFF" strokeWidth={2.5} />
              {p.label ? (
                <SvgText x={x} y={y - r - 6 + (r > 11 ? 4.7 : 3.8)} textAnchor="middle" fontFamily={fonts.bold} fontSize={r > 11 ? 13 : 10.5} fontWeight="700" fill={p.tone === 'kitchen' ? colors.ink : colors.cream}>
                  {p.label}
                </SvgText>
              ) : null}
            </G>
          );
        })}
        {rider ? <Rider at={at(rider.at)} angle={rider.heading + view.rotate} /> : null}
      </Svg>
      {/* The map data is OpenStreetMap's, under the ODbL: credit it and link to the licence. */}
      <Pressable accessibilityRole="link" accessibilityLabel="Map data © OpenStreetMap contributors, open licence" hitSlop={8} onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')} style={{ position: 'absolute', right: 6, bottom: 4, backgroundColor: 'rgba(255,248,240,0.85)', paddingHorizontal: 5, borderRadius: 4 }}>
        <Text style={{ fontFamily: fonts.regular, fontSize: 9, color: colors.muted, textDecorationLine: 'underline' }}>© OpenStreetMap contributors</Text>
      </Pressable>
    </View>
  );
}

function Rider({ at: [x, y], angle }: { at: Pt; angle: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={26} fill={colors.orange} fillOpacity={0.2} />
      <Circle cx={x} cy={y} r={14} fill={colors.orange} stroke="#FFFFFF" strokeWidth={3.5} />
      <Path d={arrow(x, y, angle)} fill={colors.ink} />
    </G>
  );
}

// The rider's arrow, turned to face the way they're riding.
function arrow(x: number, y: number, angle: number) {
  const r = (angle * Math.PI) / 180;
  const pts: Pt[] = [[0, -7], [6, 5], [0, 2], [-6, 5]];
  return pts.map(([px, py], i) => `${i ? 'L' : 'M'}${(x + px * Math.cos(r) - py * Math.sin(r)).toFixed(1)} ${(y + px * Math.sin(r) + py * Math.cos(r)).toFixed(1)}`).join('') + 'Z';
}

// The ground, campus, buildings and roads. Redrawn only when the view moves.
const Base = memo(function Base({ width, height, cx, cy, scale, rotate }: { width: number; height: number; cx: number; cy: number; scale: number; rotate: number }) {
  // Road widths were tuned at about 0.84 px a metre; keep them readable when zoomed in or out.
  const k = Math.max(0.55, Math.min(1.5, scale / 0.84)) / scale;
  const transform = `translate(${width / 2} ${height / 2}) rotate(${rotate}) scale(${scale}) translate(${-cx} ${-cy})`;
  return (
    <>
      <G transform={transform}>
        <Path d={mapData.campus} fill={ink.campus} stroke={ink.campusEdge} strokeWidth={1.5 / scale} strokeDasharray={`${5 / scale} ${4 / scale}`} />
        <Path d={mapData.green} fill={ink.green} />
        <Path d={mapData.buildings} fill={ink.building} />
        <Path d={mapData.campusBuildings} fill={ink.campusBuilding} />
        <Path d={mapData.roads.path} stroke={ink.path} strokeWidth={1.6 / scale} strokeDasharray={`${3 / scale} ${3 / scale}`} fill="none" />
        <Path d={mapData.roads.minor} stroke={ink.casing} strokeWidth={7.5 * k} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={mapData.roads.major} stroke={ink.casing} strokeWidth={13.5 * k} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={mapData.roads.minor} stroke={ink.road} strokeWidth={5 * k} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={mapData.roads.major} stroke={ink.road} strokeWidth={11 * k} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </G>
      {mapData.labels.map((l) => {
        const [x, y] = project({ center: [cx, cy], scale, rotate }, width, height, l.at);
        if (x < -80 || x > width + 80 || y < -20 || y > height + 20) return null;
        // Road names follow the map turning; keep them the right way up.
        let angle = l.area ? 0 : l.angle + rotate;
        angle = ((angle + 540) % 360) - 180;
        if (angle > 90) angle -= 180;
        if (angle < -90) angle += 180;
        const props = { x, y, transform: angle ? `rotate(${angle} ${x} ${y})` : undefined, textAnchor: 'middle' as const, fontFamily: fonts.bold, fontSize: l.size, fontWeight: '700' as const, letterSpacing: l.area ? 2.4 : 0.5 };
        // A halo first, then the text, so names stay readable over roads.
        return (
          <G key={l.text}>
            <SvgText {...props} fill={ink.ground} stroke={ink.ground} strokeWidth={3} strokeLinejoin="round">
              {l.text}
            </SvgText>
            <SvgText {...props} fill={ink.label}>
              {l.text}
            </SvgText>
          </G>
        );
      })}
    </>
  );
});

export const mapInk = ink;
