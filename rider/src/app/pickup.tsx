import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Rect, Stop as GradientStop } from 'react-native-svg';
import { BackButton, Body, Bold, Icon, Label, Num, RoundButton } from '../components/ui';
import { KITCHEN, kitchenOf, ordinal, pickupOrder, spotOf, useRider } from '../lib/rider';
import { onServer } from '../lib/server';
import { colors, fonts } from '../lib/theme';

// How long the sample scanner takes to "read" each seal. There is no camera yet.
const SCAN_MS = 2200;

// Pick up: scan each bag's seal at the kitchen hatch. The last scan starts the route.
export default function Pickup() {
  const { run, scanned, startPickup, scanNext, pickUp, notify } = useRider();
  const [torch, setTorch] = useState(false);
  const [line] = useState(() => new Animated.Value(0));

  useEffect(() => {
    startPickup();
  }, [startPickup]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(line, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(line, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [line]);

  // Bags in loading order: the last stop goes in first.
  const bags = run ? [...run.stops].map((stop, i) => ({ stop, number: i + 1 })).reverse() : [];
  const waiting = bags.find((b) => !scanned.includes(b.stop.bag));

  // On the server each scan picks the bag up there; one at a time.
  const busy = useRef(false);
  const scan = async () => {
    if (busy.current) return;
    busy.current = true;
    const bag = onServer ? await pickUp() : scanNext();
    busy.current = false;
    if (!bag || !run) return;
    if (scanned.length + 1 === run.stops.length) {
      notify(`All ${run.stops.length} bags on · students told you're on the way`);
      router.replace('/route');
    }
  };

  // The sample scanner reads the next seal by itself after a moment. A bag still cooking waits for
  // the kitchen's Ready tap.
  useEffect(() => {
    if (!waiting || waiting.stop.status === 'cooking') return;
    const t = setTimeout(scan, SCAN_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting?.stop.bag, waiting?.stop.status]);

  if (!run) return null;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={s.header}>
        <BackButton />
        <View style={{ flex: 1, gap: 1 }}>
          <Label>
            {onServer ? pickupOrder(run)[0]!.name : KITCHEN}
            {run.slot !== undefined ? ` · slot ${run.slot}` : ''}
          </Label>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: 24, lineHeight: 28, color: colors.forest }}>Scan each seal</Text>
        </View>
        <RoundButton icon={torch ? 'zap' : 'zap-off'} label={torch ? 'Torch on' : 'Torch'} active={torch} onPress={() => setTorch(!torch)} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Scan the seal" onPress={scan} style={s.viewfinder}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="vf" cx="50%" cy="45%" rx="60%" ry="60%">
                  <GradientStop offset="0" stopColor={torch ? '#5A6A60' : colors.viewfinderLight} />
                  <GradientStop offset="1" stopColor={colors.viewfinder} />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#vf)" />
            </Svg>
            <View style={s.frame}>
              <View style={[s.corner, { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 14 }]} />
              <View style={[s.corner, { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 14 }]} />
              <View style={[s.corner, { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 14 }]} />
              <View style={[s.corner, { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 14 }]} />
              {waiting ? (
                <View style={s.sticker}>
                  <Svg width={64} height={64} viewBox="0 0 7 7">
                    <Path fill="#111" d="M0 0h3v3H0zM4 0h3v3H4zM0 4h3v3H0zM4 4h1v1H4zM6 4h1v1H6zM5 5h1v1H5zM4 6h1v1H4zM6 6h1v1H6z" />
                    <Path fill="#FFF" d="M1 1h1v1H1zM5 1h1v1H5zM1 5h1v1H1z" />
                  </Svg>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.1, color: '#111' }}>
                    {waiting.stop.bag} · {waiting.stop.student.toUpperCase()}
                  </Text>
                </View>
              ) : null}
              <Animated.View style={[s.scanLine, { transform: [{ translateY: line.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] }) }] }]} />
            </View>
            <Text style={s.hint}>Hold over the round sticker. It scans by itself.</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Label>Bags on this run</Label>
            <Num size={20}>
              {scanned.length} <Text style={{ color: colors.muted, fontSize: 15 }}>of {run.stops.length}</Text>
            </Num>
          </View>
          {bags.map(({ stop, number }, i) => {
            const done = scanned.includes(stop.bag);
            const now = waiting?.stop.bag === stop.bag;
            const first = number === 1;
            const load = i === 0 ? 'load first, bottom of the box' : i === bags.length - 1 ? 'load last, on top' : `load ${ordinal(i + 1)}`;
            const from = kitchenOf(stop) === KITCHEN ? '' : ` · from ${kitchenOf(stop)} ${spotOf(stop)}`;
            const sub = (done ? `Seal intact · ${load}` : `${first ? 'First stop' : i === 0 ? 'Last stop' : `Stop ${number}`} · ${load}`) + from;
            return (
              <View key={stop.bag} style={[s.bag, now && s.bagNow]}>
                {done ? (
                  <View style={[s.mark, { backgroundColor: colors.forest }]}>
                    <Icon name="check" size={18} color={colors.cream} />
                  </View>
                ) : (
                  <View style={[s.mark, { borderWidth: 2, borderStyle: 'dashed', borderColor: now ? colors.orangeText : colors.line }]} />
                )}
                <View style={{ flex: 1, gap: 1 }}>
                  <Bold>
                    {stop.bag} · {stop.student}
                  </Bold>
                  <Body style={{ fontSize: 13, lineHeight: 18, color: colors.muted }}>{sub}</Body>
                </View>
                {now ? <Bold size={13} color={colors.orangeText}>Scanning</Bold> : null}
              </View>
            );
          })}
          <Body style={{ fontSize: 13, lineHeight: 19, color: colors.body }}>The last scan starts your route and tells {run.stops.length === 2 ? 'both students' : 'every student'} you&apos;re on the way.</Body>
        </View>
      </ScrollView>

      <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/help', params: { from: 'pickup' } })} style={{ alignSelf: 'center', paddingVertical: 14, marginBottom: 8 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest, textDecorationLine: 'underline' }}>Seal broken or bag missing?</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewfinder: { height: 330, borderRadius: 28, overflow: 'hidden', alignItems: 'center' },
  frame: { marginTop: 34, width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: colors.cream },
  sticker: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transform: [{ rotate: '-8deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.orange,
    shadowColor: colors.orange,
    shadowOpacity: 0.6,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 22, textAlign: 'center', fontFamily: fonts.regular, fontSize: 14, color: colors.onForest },
  bag: { borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bagNow: { borderWidth: 2, borderColor: colors.orange, paddingVertical: 11, paddingHorizontal: 13 },
  mark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
