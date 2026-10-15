import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { clock, cookingQueue, demoNow, minutesUntil, ordinal, useKitchen, type Order } from '../lib/kitchen';
import { colors, fonts } from '../lib/theme';
import { first } from './alerts';
import { Chip, DishPhoto } from './ui';

// How long a new order keeps the "Just in" treatment at the top of Orders.
const JUST_IN = 2 * 60_000;
const sage = '#E4EEE6';

function clockSec(ms: number) {
  return `${clock(ms)}:${String(new Date(ms).getSeconds()).padStart(2, '0')}`;
}

// The newest order that arrived while the app was open, as on the K-Arrive board: big number, what to
// cook, and three checks that tick on by themselves (ticket printed, bag seal ready, student told).
export function JustIn() {
  const k = useKitchen();
  const [tick, setT] = useState(demoNow);
  // The shared clock moves every 5 s and wakes the card when an order arrives; this one every second.
  const t = Math.max(tick, k.now);
  const latest = k.orders.filter((o) => o.live && o.status === 'cooking').sort((a, b) => b.inAt - a.inAt)[0];
  const showing = !!latest && (t - latest.inAt < JUST_IN || !latest.seenAt);
  useEffect(() => {
    if (!showing) return;
    const i = setInterval(() => setT(demoNow()), 1000);
    return () => clearInterval(i);
  }, [showing]);
  if (!latest || !showing) return null;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
      <Card order={latest} t={t} />
    </View>
  );
}

function Card({ order: o, t }: { order: Order; t: number }) {
  const k = useKitchen();
  const rank = cookingQueue(k.orders).findIndex((x) => x.id === o.id) + 1;
  const left = Math.max(0, minutesUntil(o.dueAt, t));
  const printing = k.settings.printTicket;
  const name = first(o);
  const ok = !!o.printed;
  const since = t - o.inAt;
  const checks = ok
    ? [
        { done: since >= 3000, title: 'Ticket printed', sub: clockSec(o.inAt + 3000) },
        { done: since >= 5000, title: k.settings.printSeal ? 'Bag seal ready' : 'Bag seal off', sub: `QR ${o.id}` },
        { done: since >= 8000, title: `${name} told`, sub: '“Kitchen has it”' },
      ]
    : [
        { done: false, warn: true, title: printing ? 'Didn’t print' : 'Ticket off', sub: 'Tap to see it' },
        { done: false, warn: true, title: 'Bag seal', sub: 'By hand' },
        { done: !!o.seenAt, title: o.seenAt ? `${name} told` : `${name} waiting`, sub: o.seenAt ? '“Kitchen has it”' : 'Told after your tap' },
      ];

  return (
    <View style={s.card}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`New order ${o.id} for ${o.student}, ${ordinal(rank)} in line. Open it.`}
        onPress={() => {
          k.markSeen(o.id);
          router.push(`/order/${o.id}`);
        }}
        style={{ gap: 12 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={s.dotRing}>
              <View style={s.dot} />
            </View>
            <Text style={s.kicker}>
              Just in · {clock(o.inAt)}
              {ok ? '' : ' · needs a tap'}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.segmentText }}>{ordinal(rank)} in line</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flexShrink: 1, gap: 2 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 48, lineHeight: 48, color: colors.forest }}>{o.id}</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }} numberOfLines={1}>
              {o.student} · {o.place}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 32, color: colors.forest }}>
              {left}
              <Text style={{ fontSize: 15 }}> min</Text>
            </Text>
            <Text style={s.caps}>ready by {clock(o.dueAt)}</Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          {o.items.map((i) => (
            <View key={i.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <DishPhoto name={i.name} size={40} radius={11} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>
                {i.qty}× {i.name}
              </Text>
              {(i.extras ?? []).map((e) => (
                <Chip key={e}>{e}</Chip>
              ))}
            </View>
          ))}
        </View>
      </Pressable>

      <View style={s.dashed}>
        <Svg width="100%" height={2} style={{ marginBottom: 4 }}>
          <Line x1={0} y1={1} x2="100%" y2={1} stroke={colors.border} strokeWidth={1.5} strokeDasharray="5 4" />
        </Svg>
        <Text style={s.caps}>{ok ? 'Confirmed by itself, no tap needed' : printing ? 'Printer not answering · tap the order' : 'Ticket printing is off · tap the order'}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {checks.map((c) => (
            <View key={c.title} style={[s.check, c.done ? { backgroundColor: sage } : c.warn ? { backgroundColor: colors.chipBg } : { backgroundColor: colors.segment }]} accessibilityLabel={`${c.title}${c.done ? ', done' : ''}`}>
              {c.done ? (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.forest} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M5 12.5l4.5 4.5L19 7.5" />
                </Svg>
              ) : (
                <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: c.warn ? colors.chipText : colors.chevron, borderStyle: c.warn ? 'solid' : 'dashed' }} />
              )}
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: c.warn ? colors.chipText : colors.forest }} numberOfLines={1}>
                {c.title}
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.segmentText }} numberOfLines={1}>
                {c.sub}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            k.markSeen(o.id);
            router.push(`/order/${o.id}`);
          }}
          style={s.button}
        >
          <Text style={s.buttonText}>Something ran out</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => k.notify(ok ? `Ticket for ${o.id} printed again` : `Sent ${o.id} to the printer again. Still no answer`)} style={s.button}>
          <Text style={s.buttonText}>Print again</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.orange,
    padding: 14,
    gap: 12,
    shadowColor: colors.orange,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
    elevation: 6,
  },
  dotRing: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,107,53,0.2)', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange },
  kicker: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.76, textTransform: 'uppercase', color: colors.orangeText },
  caps: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.88, textTransform: 'uppercase', color: colors.muted },
  dashed: { gap: 8 },
  check: { flex: 1, minWidth: 0, borderRadius: 12, padding: 8, gap: 2 },
  button: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.bold, fontSize: 14, color: colors.forest },
});
