import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CampusMap, mapInk, type MapLine, type MapPin } from '../components/map';
import { Body, Bold, Icon, Label } from '../components/ui';
import { along, findDropPoint, fitView, followView, headingAhead, kitchenAt, minutesFor, nextTurn, route, type Route } from '../lib/campus';
import { KITCHEN, useRider, type Stop } from '../lib/rider';
import { onServer } from '../lib/server';
import { colors, fonts, money } from '../lib/theme';

// The sample ride "arrives" by itself after this long, as GPS would. Tapping the stop arrives at once.
const ARRIVE_MS = 9000;
// Sample: a student who edits their note does it this long into the ride.
const NOTE_MS = 3000;

const turnPaths = {
  right: 'M7 20V10h10M13 6l4 4-4 4',
  left: 'M17 20V10H7M11 6l-4 4 4 4',
  straight: 'M12 20V5M7 10l5-5 5 5',
};

// Riding mode: big text, voice turns, the stop and minutes left. The handover opens on arrival.
export default function RouteScreen() {
  const { run, stop, stopIndex, stage, arrive, backToRoute, voice, setVoice, notify, changeNote } = useRider();
  const insets = useSafeAreaInsets();
  // Only things that change the drop interrupt riding mode: a new note from the student.
  const [heard, setHeard] = useState<{ bag: string; first: string; note: string } | null>(null);
  const { width, height } = useWindowDimensions();
  // How far along this leg the sample ride is, 0 to 1. GPS replaces this once the backend exists.
  const [ride, setRide] = useState({ stop: -1, moved: 0 });
  const moved = ride.stop === stopIndex && stage === 'riding' ? ride.moved : 0;
  const [overview, setOverview] = useState(false);
  const legs = useMemo(() => (run ? legsFor(run.stops) : []), [run]);

  useEffect(() => {
    if (stage !== 'riding') return;
    const started = Date.now();
    const t = setInterval(() => setRide({ stop: stopIndex, moved: Math.min(1, (Date.now() - started) / ARRIVE_MS) }), 400);
    return () => clearInterval(t);
  }, [stage, stopIndex]);

  useEffect(() => {
    if (stage !== 'riding' || !stop?.newNote || stop.note === stop.newNote) return;
    const { bag, first, newNote } = stop;
    const t = setTimeout(() => {
      changeNote(bag, newNote);
      setHeard({ bag, first, note: newNote });
    }, NOTE_MS);
    return () => clearTimeout(t);
  }, [stage, stop, changeNote]);

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

  // On the server, arriving tells the student, so it waits for the rider's tap.
  useEffect(() => {
    if (stage !== 'riding' || onServer) return;
    const t = setTimeout(arrived, ARRIVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, stopIndex]);

  if (!run || !stop) return <Redirect href="/" />;

  const leg = legs[stopIndex]!;
  const here = along(leg.points, moved);
  const turn = nextTurn(here.ahead, shortName(stop.place));
  const minutes = minutesFor(leg.seconds * (1 - moved));

  const next = run.stops[stopIndex + 1];
  const watching = run.stops.slice(stopIndex).map((x) => x.first);
  const names = watching.length > 1 ? `${watching.slice(0, -1).join(', ')} and ${watching[watching.length - 1]}` : watching[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.mapGround }}>
      <RunMap stops={run.stops} legs={legs} current={stopIndex} at={here} overview={overview} width={width} height={height} anchorY={height - 400} />

      <View style={[s.turn, { top: insets.top + 16 }]} accessibilityRole="header">
        <View style={s.turnIcon}>
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={colors.forest} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <Path d={turnPaths[turn.icon]} />
          </Svg>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 36, color: colors.cream }}>{turn.metres} m</Text>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.onForest }}>{turn.text}</Text>
        </View>
      </View>

      {heard && heard.bag === stop.bag ? (
        <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[s.noteBanner, { top: insets.top + 132 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="message-circle" size={16} color={colors.chipText} />
            <Label style={{ color: colors.chipText }}>New note from {heard.first}</Label>
          </View>
          <Text style={{ fontFamily: fonts.displayItalic, fontSize: 22, lineHeight: 28, color: colors.forest }}>&ldquo;{heard.note}&rdquo;</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityRole="button" onPress={() => setHeard(null)} style={[s.noteButton, { backgroundColor: colors.forest }]}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.cream }}>Got it</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setHeard(null);
                notify(`Calling ${heard.first} through Chakula`);
              }}
              style={[s.noteButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }]}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>Call {heard.first}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={[s.chips, { top: insets.top + 132 }, heard?.bag === stop.bag && { opacity: 0 }]} pointerEvents={heard?.bag === stop.bag ? 'none' : 'auto'}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: voice }} onPress={() => setVoice(!voice)} style={s.chip}>
          <Icon name={voice ? 'volume-2' : 'volume-x'} size={16} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.forest }}>{voice ? 'Voice on' : 'Voice off'}</Text>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: overview }} accessibilityLabel="Show the whole run" onPress={() => setOverview(!overview)} style={s.chip}>
          <Icon name="map" size={16} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.forest }}>{overview ? 'Follow me' : 'Whole run'}</Text>
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
            <Text style={{ fontFamily: fonts.display, fontSize: 46, lineHeight: 48, color: colors.forest }}>{minutes}</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, color: colors.muted }}>MIN</Text>
          </View>
        </Pressable>
        <View style={s.progress}>
          <View style={[s.progressFill, { width: `${Math.round(moved * 100)}%` }]} />
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
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' }}>{onServer ? 'Riding mode: big text, voice turns. Tap the stop when you arrive.' : 'Riding mode: big text, voice turns. The handover opens by itself when you arrive.'}</Text>
      </View>
    </View>
  );
}

// Kitchen names in the sample data, to their spot on the map.
const kitchenIds: Record<string, string> = { 'Nakawa Kitchen': 'nakawa-kitchen', 'Rolex Corner': 'rolex-corner' };

// The road for each stop: from the kitchen to the first drop, then drop to drop.
function legsFor(stops: Stop[]): Route[] {
  return stops.map((x, i) => {
    const from = i === 0 ? kitchenAt(x.kitchenId ?? kitchenIds[x.kitchen ?? KITCHEN] ?? 'nakawa-kitchen') : findDropPoint(stops[i - 1]!.drop)!.at;
    return route(from, findDropPoint(x.drop)!.at);
  });
}

// Our campus map, heading-up behind the rider; or the whole run, north up.
function RunMap({ stops, legs, current, at, overview, width, height, anchorY }: { stops: Stop[]; legs: Route[]; current: number; at: ReturnType<typeof along>; overview: boolean; width: number; height: number; anchorY: number }) {
  const heading = headingAhead(at.ahead);
  const view = overview ? fitView(legs.flatMap((l) => l.points), width, height, [230, 40, 380, 40], 1.6) : followView(at.at, heading, width, height, anchorY, 1.5);
  const lines: MapLine[] = [];
  legs.forEach((l, i) => {
    if (i < current) lines.push({ points: l.points, color: mapInk.done, width: 6 });
    if (i > current) lines.push({ points: l.points, color: colors.forest, width: 5, dashed: true });
  });
  lines.push({ points: at.done, color: mapInk.done, width: 8 }, { points: at.ahead, color: colors.forest, width: 8 });
  const first = stops[0]!;
  const pins: MapPin[] = [
    { id: 'kitchen', at: legs[0]!.points[0]!, label: 'K', tone: 'kitchen' },
    ...stops.map((x, i) => ({ id: x.bag, at: findDropPoint(x.drop)!.at, label: i < current ? '✓' : String(i + 1), tone: i < current ? ('muted' as const) : ('forest' as const), big: i === current })),
  ];
  return (
    <CampusMap
      style={StyleSheet.absoluteFill}
      width={width}
      height={height}
      view={view}
      lines={lines}
      pins={pins}
      rider={{ at: at.at, heading }}
      accessibilityLabel={`Map: riding to ${stops[current]!.place}, starting from ${first.kitchen ?? KITCHEN}`}
    />
  );
}

// "Akamwesi Hostel, room 214" -> "Akamwesi Hostel"; "Digital Library entrance" -> "Digital Library".
function shortName(place: string) {
  return place.split(',')[0]!.replace(' entrance', '').replace(' gate', '');
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
  noteBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 2,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.orange,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: colors.forest,
    shadowOpacity: 0.18,
    shadowRadius: 17,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  noteButton: { height: 44, borderRadius: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3, backgroundColor: colors.forest },
  call: { width: 56, height: 56, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  next: { flex: 1, height: 56, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  nextNum: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
});
