import { router, type Href } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { onAlertTap } from '../lib/notify';
import { OFFER_MS, pickupOrder, useNow, useRider, type KitchenPickup } from '../lib/rider';
import { colors, fonts, money } from '../lib/theme';
import { Body, Bold, Icon, Italic, Label, Num, TearLine } from './ui';

// Opens the screen a tapped system notification points at.
export function AlertTaps() {
  useEffect(() => onAlertTap((url) => router.navigate(url as Href)), []);
  return null;
}

// A ring that empties as time runs out, with the number inside.
export function CountdownRing({ size, stroke, share, track, fill, children }: { size: number; stroke: number; share: number; track: string; fill: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fill}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, share)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

// New run: the boarding-pass offer, full screen over whatever is open, ringing for 42 seconds.
export function RunOffer() {
  const { offer, run } = useRider();
  if (!offer || !run || run.id !== offer.runId) return null;
  return <OfferScreen at={offer.at} />;
}

function OfferScreen({ at }: { at: number }) {
  const { run, acceptRun, passRun } = useRider();
  const insets = useSafeAreaInsets();
  const now = useNow(250);
  const left = Math.max(0, OFFER_MS - (now - at));

  useEffect(() => {
    if (left === 0) passRun('timeout');
  }, [left, passRun]);

  if (!run) return null;
  const kitchens = pickupOrder(run);
  const seconds = Math.ceil(left / 1000);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.cream, paddingTop: insets.top, paddingBottom: insets.bottom }]} accessibilityViewIsModal>
      <View style={o.top}>
        <Text style={o.brand}>
          Chakula <Text style={o.brandTag}>RIDER</Text>
        </Text>
        <View style={o.ringing} accessibilityLiveRegion="assertive">
          <View style={o.ringDot} />
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.chipText }}>Ringing</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 6 }}>
          <Label style={{ color: colors.orangeText }}>New run for you</Label>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: 36, lineHeight: 38, color: colors.forest }}>
            {run.name},{'\n'}
            <Italic>
              {run.stops.length} drop{run.stops.length === 1 ? '' : 's'}.
            </Italic>
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={o.ticket}>
            <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Label>
                  Pick up {run.pickupAt} · {run.away}
                </Label>
                <Num size={28}>{kitchens[0].name}</Num>
                <Body style={{ fontSize: 13, color: colors.body }}>
                  {kitchens.length > 1 ? `Then ${kitchens.slice(1).map((k) => k.name).join(', ')} · sealed as you arrive` : 'Bags sealed by the time you arrive'}
                </Body>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4, color: colors.muted }}>SLOT</Text>
                <Text style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 56, color: colors.forest }}>{run.slot}</Text>
              </View>
            </View>
            <TearLine />
            <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 18, gap: 10 }}>
              {run.stops.map((stop, i) => (
                <View key={stop.bag} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[o.num, i === 0 ? { backgroundColor: colors.forest } : { borderWidth: 1.5, borderColor: colors.forest }]}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: i === 0 ? colors.cream : colors.forest }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.forest }}>{stop.place}</Text>
                  {stop.cash > 0 ? (
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.chipText }}>cash {money(stop.cash)}</Text>
                  ) : (
                    <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.muted }}>paid · {stop.eta}</Text>
                  )}
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                <Body style={{ fontSize: 13, color: colors.body }}>This run pays</Body>
                <Num size={22}>UGX {money(run.pays)}</Num>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 18, gap: 4, alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`On my way. ${seconds} seconds to answer`}
          onPress={acceptRun}
          style={({ pressed }) => [o.accept, pressed && { opacity: 0.92 }]}
        >
          <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 19, color: colors.cream }}>On my way</Text>
          <CountdownRing size={50} stroke={4} share={left / OFFER_MS} track={colors.forestMid} fill={colors.orange}>
            <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.cream }}>{seconds}</Text>
          </CountdownRing>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => passRun('declined')} style={{ height: 44, justifyContent: 'center', paddingHorizontal: 12 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>I can&apos;t take this run</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center' }}>
          Rings loud even when your phone is locked. No answer in {OFFER_MS / 1000} seconds and we pass the run on.
        </Text>
      </View>
    </View>
  );
}

// The in-app twin of every alert: "Leave now", "Your bags are sealed and waiting", reminders.
export function AlertBanner() {
  const { banner, dismissBanner, offer } = useRider();
  const insets = useSafeAreaInsets();
  if (!banner || offer) return null;

  const act = (url?: string) => {
    dismissBanner();
    if (url) router.navigate(url as Href);
  };

  return (
    <View style={{ position: 'absolute', left: 12, right: 12, top: insets.top + 8 }} accessibilityLiveRegion="polite">
      <View style={[b.card, banner.loud && { borderWidth: 2, borderColor: colors.orange }]}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="bell" size={14} color={colors.chipText} />
            <Label style={{ flex: 1, color: colors.chipText }}>{banner.kicker}</Label>
            {banner.loud ? <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.orangeText }}>LOUD</Text> : null}
          </View>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: 23, lineHeight: 27, color: colors.forest }}>{banner.title}</Text>
          {banner.body ? <Body style={{ color: colors.body }}>{banner.body}</Body> : null}
        </View>
        {banner.kitchens ? (
          <View style={{ marginHorizontal: 14, marginTop: 12, gap: 8 }}>
            {banner.kitchens.map((k, i) => (
              <KitchenCard key={k.name} kitchen={k} index={i} />
            ))}
          </View>
        ) : null}
        <View style={b.actions}>
          {banner.secondary ? (
            <Pressable accessibilityRole="button" onPress={() => act(banner.secondary?.url)} style={[b.action, { borderRightWidth: 1, borderRightColor: colors.line }]}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.forest }}>{banner.secondary.label}</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => act(banner.primary?.url)} style={b.action}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{banner.primary?.label ?? 'Got it'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function KitchenCard({ kitchen, index }: { kitchen: KitchenPickup; index: number }) {
  const first = index === 0;
  return (
    <View style={[b.kitchen, first ? { borderWidth: 2, borderColor: colors.forest } : { borderWidth: 1, borderColor: colors.line }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[b.num, first ? { backgroundColor: colors.forest } : { borderWidth: 1.5, borderColor: colors.forest }]}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: first ? colors.cream : colors.forest }}>{index + 1}</Text>
        </View>
        <Bold style={{ flex: 1 }}>
          {kitchen.name} · {kitchen.spot}
        </Bold>
        <Bold size={12}>Ready</Bold>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {kitchen.bags.map((bag) => (
          <View key={bag.bag} style={b.chip}>
            <Icon name="check" size={13} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.forest }}>
              {bag.bag} sealed {bag.sealedAt}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const o = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: fonts.displayItalic, fontSize: 20, color: colors.forest },
  brandTag: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.76, color: colors.muted },
  ringing: { height: 34, borderRadius: 17, paddingHorizontal: 12, backgroundColor: colors.chipBg, flexDirection: 'row', alignItems: 'center', gap: 8 },
  ringDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange, borderWidth: 0, shadowColor: colors.orange, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  ticket: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    overflow: 'hidden',
    shadowColor: colors.forest,
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  num: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  accept: {
    alignSelf: 'stretch',
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.forest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 22,
    paddingRight: 12,
    shadowColor: colors.forest,
    shadowOpacity: 0.25,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
});

const b = StyleSheet.create({
  card: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: colors.forest,
    shadowOpacity: 0.18,
    shadowRadius: 17,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  kitchen: { backgroundColor: colors.card, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, gap: 8 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chip: { height: 30, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.sage, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { marginTop: 12, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line },
  action: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center' },
});
