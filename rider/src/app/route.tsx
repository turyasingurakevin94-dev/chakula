import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Body, Bold, Icon, Label } from '../components/ui';
import { KITCHEN, useRider, type Point, type Stop } from '../lib/rider';
import { colors, fonts, money } from '../lib/theme';

// The sample ride "arrives" by itself after this long, as GPS would. Tapping the stop arrives at once.
const ARRIVE_MS = 9000;

const turnPaths = {
  right: 'M7 20V10h10M13 6l4 4-4 4',
  left: 'M17 20V10H7M11 6l-4 4 4 4',
  straight: 'M12 20V5M7 10l5-5 5 5',
};

// Riding mode: big text, voice turns, the stop and minutes left. The handover opens on arrival.
export default function RouteScreen() {
  const { run, stop, stopIndex, stage, arrive, backToRoute, voice, setVoice, notify } = useRider();
  const insets = useSafeAreaInsets();

  // Back from the handover by gesture or the Android back button still means riding again.
  useFocusEffect(
    useCallback(() => {
      if (stage === 'handover') backToRoute();
    }, [stage, backToRoute]),
  );

  const arrived = () => {
    arrive();
    router.push('/drop');
  };

  useEffect(() => {
    if (stage !== 'riding') return;
    const t = setTimeout(arrived, ARRIVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, stopIndex]);

  if (!run || !stop) return <Redirect href="/" />;

  const next = run.stops[stopIndex + 1];
  const watching = run.stops.slice(stopIndex).map((x) => x.first);
  const names = watching.length > 1 ? `${watching.slice(0, -1).join(', ')} and ${watching[watching.length - 1]}` : watching[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.mapGround }}>
      <Map stops={run.stops} current={stopIndex} />

      <View style={[s.turn, { top: insets.top + 16 }]} accessibilityRole="header">
        <View style={s.turnIcon}>
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={colors.forest} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <Path d={turnPaths[stop.turn.icon]} />
          </Svg>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 36, color: colors.cream }}>{stop.turn.distance}</Text>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.onForest }}>{stop.turn.text}</Text>
        </View>
      </View>

      <View style={[s.chips, { top: insets.top + 132 }]}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: voice }} onPress={() => setVoice(!voice)} style={s.chip}>
          <Icon name={voice ? 'volume-2' : 'volume-x'} size={16} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.forest }}>{voice ? 'Voice on' : 'Voice off'}</Text>
        </Pressable>
        <View style={s.chip}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange }} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.body }}>{names} see{watching.length > 1 ? '' : 's'} you</Text>
        </View>
      </View>

      <View style={[s.sheet, { paddingBottom: 28 + insets.bottom }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`I'm at ${stop.place}`} onPress={arrived} style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Label>
              Stop {stopIndex + 1} of {run.stops.length} · bag {stop.bag}
            </Label>
            <Text style={{ fontFamily: fonts.displayMedium, fontSize: 30, lineHeight: 32, color: colors.forest }}>{stop.place}</Text>
            <Body style={{ color: colors.body }}>
              {stop.student}
              {stop.note ? ` · "${stop.note}"` : ''}
            </Body>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 46, lineHeight: 48, color: colors.forest }}>{stop.minutes}</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, color: colors.muted }}>MIN</Text>
          </View>
        </Pressable>
        <View style={s.progress}>
          <View style={[s.progressFill, { width: `${Math.round(stop.progress * 100)}%` }]} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Call ${stop.first}`} onPress={() => notify(`Calling ${stop.first} through Chakula`)} style={s.call}>
            <Icon name="phone" size={22} />
          </Pressable>
          <View style={s.next}>
            <View style={s.nextNum}>
              {next ? <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.forest }}>{stopIndex + 2}</Text> : <Icon name="home" size={12} />}
            </View>
            <View style={{ flex: 1 }}>
              <Bold size={14} color={colors.forest} style={{ fontFamily: fonts.bold }}>
                {next ? `Then ${next.place}` : `Then back to ${KITCHEN}`}
              </Bold>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{next ? `${next.cash ? 'Cash' : 'Paid'} · about ${next.eta}` : `Run done · pays UGX ${money(run.pays)}`}</Text>
            </View>
          </View>
        </View>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' }}>Riding mode: big text, voice turns. The handover opens by itself when you arrive.</Text>
      </View>
    </View>
  );
}

const line = (pts: Point[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');

// The stylised campus map from the canvas: the rider's leg solid, later legs dotted, done legs faded.
function Map({ stops, current }: { stops: Stop[]; current: number }) {
  const stop = stops[current];
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" accessibilityLabel={`Map: riding to ${stop.place}`}>
      <Rect width={390} height={844} fill={colors.mapGround} />
      <Rect x={20} y={420} width={110} height={90} rx={10} fill={colors.mapBlock} />
      <Rect x={230} y={200} width={140} height={110} rx={10} fill={colors.mapGreen} />
      <Rect x={30} y={200} width={100} height={80} rx={8} fill={colors.mapBlock} />
      <Rect x={170} y={350} width={70} height={60} rx={8} fill={colors.mapBlock} />
      <Rect x={270} y={380} width={90} height={80} rx={8} fill={colors.mapBlock} />
      <Rect x={20} y={560} width={120} height={70} rx={8} fill={colors.mapGreen} />
      <Path d="M0 330H390M150 160V844M0 540H390M260 330V700" stroke="#FFFFFF" strokeWidth={18} fill="none" />
      {stops.map((x, i) =>
        i < current ? (
          <Path key={`leg${i}`} d={line(x.leg)} stroke={colors.forest} strokeOpacity={0.25} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : i > current ? (
          <Path key={`leg${i}`} d={line(x.leg)} stroke={colors.forest} strokeOpacity={0.5} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 10" />
        ) : null,
      )}
      <Path d={line(stop.leg)} stroke={colors.forest} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={stop.rider[0]} cy={stop.rider[1]} r={22} fill={colors.orange} fillOpacity={0.22} />
      <Circle cx={stop.rider[0]} cy={stop.rider[1]} r={11} fill={colors.orange} stroke="#FFFFFF" strokeWidth={3} />
      {stops.map((x, i) => {
        const [cx, cy] = x.leg[x.leg.length - 1];
        const on = i === current;
        const done = i < current;
        return (
          <Circle key={`pin${i}`} cx={cx} cy={cy} r={on ? 18 : 16} fill={on ? colors.forest : done ? colors.barDone : '#FFFFFF'} stroke={colors.forest} strokeWidth={on || done ? 0 : 2.5} />
        );
      })}
      {stops.map((x, i) => {
        const [cx, cy] = x.leg[x.leg.length - 1];
        const on = i === current;
        return (
          <SvgText key={`num${i}`} x={cx} y={cy + (on ? 6 : 5)} textAnchor="middle" fontFamily={fonts.bold} fontSize={on ? 16 : 15} fontWeight="700" fill={on ? colors.cream : colors.forest}>
            {i < current ? '✓' : String(i + 1)}
          </SvgText>
        );
      })}
      {stops.map((x, i) => (
        <SvgText key={`label${i}`} x={x.label.at[0]} y={x.label.at[1]} textAnchor={x.label.anchor} fontFamily={fonts.bold} fontSize={13} fontWeight="700" fill={colors.forest} opacity={i < current ? 0.5 : 1}>
          {shortName(x.place)}
        </SvgText>
      ))}
    </Svg>
  );
}

// "Block B, room 214" -> "Block B"; "Library entrance" -> "Library".
function shortName(place: string) {
  if (place.startsWith('Library')) return 'Library';
  return place.split(',')[0];
}

const s = StyleSheet.create({
  turn: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 24,
    backgroundColor: colors.forest,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: colors.forest,
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  turnIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  chips: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 22,
    paddingHorizontal: 20,
    gap: 16,
    shadowColor: colors.forest,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3, backgroundColor: colors.forest },
  call: { width: 56, height: 56, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  next: { flex: 1, height: 56, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  nextNum: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
});
