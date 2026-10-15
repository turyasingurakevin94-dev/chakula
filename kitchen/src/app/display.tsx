import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, DishPhoto } from '../components/ui';
import { clock, cookingQueue, cookNow, minutesUntil, nextDrop, ordinal, SERVED_EARLIER, useKitchen, type Order } from '../lib/kitchen';
import { colors, fonts } from '../lib/theme';

// The canvas draws this screen dark green. Kevin asked for no dark green layouts, so it ships cream;
// flip this to true to get the canvas colours exactly.
const DARK = false;

const P = DARK
  ? { bg: '#0F2A1F', panel: '#173A2C', panelBorder: 'transparent', text: '#FFF8F0', sub: '#A9C4B2', ok: '#4CC27E', accent: '#FFB899', card: '#FFF8F0', cardBorder: 'transparent', outline: '#2F5E48', numOn: '#FFF8F0', numOnText: '#0F2A1F' }
  : { bg: colors.cream, panel: colors.card, panelBorder: colors.line, text: colors.forest, sub: colors.muted, ok: '#2E9E5B', accent: colors.orangeText, card: colors.card, cardBorder: colors.line, outline: colors.line, numOn: colors.forest, numOnText: colors.cream };

const MIN = 60_000;

// The counter tablet: the whole line at a glance, built for landscape.
export default function Counter() {
  const k = useKitchen();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const queue = cookingQueue(k.orders);
  const ready = k.orders.filter((o) => o.status === 'ready').sort((a, b) => (a.readyAt ?? 0) - (b.readyAt ?? 0));
  const away = k.orders.filter((o) => o.status === 'picked' || o.status === 'delivered').sort((a, b) => Number(a.status === 'delivered') - Number(b.status === 'delivered') || (b.pickedAt ?? 0) - (a.pickedAt ?? 0));
  const totals = cookNow(k.orders);
  const drop = nextDrop(k.now);
  const printsIn = minutesUntil(drop - 20 * MIN, k.now);
  const st = k.settings;

  const lanes = [
    <Lane key="1" n={1} title="Up next" w={210} wide={wide}>
      <Upcoming hot time={`Prints at ${clock(drop - 20 * MIN)}${printsIn > 0 ? ` · in ${printsIn} min` : ''}`} title={`${clock(drop)} drop`} sub="6 after-lecture orders" />
      <Upcoming time="Prints at 6:00" title="Supper plans" sub="38 meals · drop 7:00" />
      <Upcoming time="Prints at 6:10" title="6:30 drop" sub="3 orders" />
    </Lane>,
    <Lane key="2" n={2} on title="Cooking · in the order to cook them" wide={wide}>
      {queue.map((o, i) => (
        <CookCard key={o.id} order={o} rank={i + 1} now={k.now} onReady={() => k.markReady(o.id)} />
      ))}
    </Lane>,
    <Lane key="3" n={3} title="Ready · waiting for rider" w={240} wide={wide}>
      {ready.map((o) => {
        const here = !!o.rider && o.rider.arrivesAt <= k.now;
        return (
          <View key={o.id} style={[s.panel, here && { borderColor: P.ok, borderWidth: 1.5 }]}>
            <View style={s.between}>
              <Text style={[s.id, { fontSize: 26 }]}>{o.id}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: here ? P.ok : P.sub }}>{here ? 'At the counter' : o.rider ? `${o.rider.name} ${Math.max(1, minutesUntil(o.rider.arrivesAt, k.now))} min away` : 'Finding a rider'}</Text>
            </View>
            <Text style={s.sub}>
              Ready {o.readyAt ? clock(o.readyAt) : ''} · {here && o.rider ? `${o.rider.name} scanning the seal` : `waiting ${Math.max(0, -minutesUntil(o.readyAt ?? k.now, k.now))} min`}
            </Text>
          </View>
        );
      })}
    </Lane>,
    <Lane key="4" n={4} title="On the way" w={220} wide={wide} footer={<Today served={SERVED_EARLIER + away.length} />}>
      {away.map((o) => (
        <View key={o.id} style={[s.panel, { backgroundColor: 'transparent', borderColor: P.outline, borderWidth: 1 }]}>
          <View style={s.between}>
            <Text style={[s.id, { fontSize: 22 }]}>{o.id}</Text>
            {o.status === 'delivered' ? <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: P.ok }}>Delivered</Text> : <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: P.sub }}>Arrives {o.pickedAt ? clock(o.pickedAt + 10 * MIN) : ''}</Text>}
          </View>
          <Text style={s.sub}>{o.status === 'delivered' ? `${o.deliveredAt ? clock(o.deliveredAt) : ''} · on time` : `Picked up ${o.pickedAt ? clock(o.pickedAt) : ''} · ${o.place.split(',')[0]}`}</Text>
        </View>
      ))}
    </Lane>,
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.bg }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style={DARK ? 'light' : 'dark'} />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 22, gap: 14 }}>
        <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
            <Text style={{ fontFamily: fonts.displayItalic, fontSize: 26, lineHeight: 28, color: P.text }}>Chakula</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.32, textTransform: 'uppercase', color: P.sub }}>Nakawa Kitchen</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pill text={st.open ? (st.autoAccept ? 'Open · auto-accept' : 'Open') : 'Closed'} ok={st.open} />
          <Pill text="Printer · POS" ok />
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: 32, color: P.text, paddingLeft: 6 }}>{clock(k.now)}</Text>
        </View>

        {totals.length ? (
          <View style={s.cookNow}>
            <Text style={s.cookLabel}>Cook now</Text>
            {totals.map((t) => (
              <View key={t.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <DishPhoto name={t.name} size={30} radius={15} />
                <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: P.text }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 22 }}>{t.qty}</Text> {t.name}
                  {t.extras.length ? <Text style={{ color: P.accent }}> · {t.extras.join(', ')}</Text> : null}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {wide ? (
          <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>{lanes}</View>
        ) : (
          <ScrollView horizontal contentContainerStyle={{ gap: 16 }} showsHorizontalScrollIndicator={false}>
            {lanes}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function Pill({ text, ok }: { text: string; ok: boolean }) {
  return (
    <View style={s.pill}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ok ? P.ok : colors.orange }} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: P.text }}>{text}</Text>
    </View>
  );
}

function Lane({ n, title, on, w, wide, footer, children }: { n: number; title: string; on?: boolean; w?: number; wide: boolean; footer?: ReactNode; children: ReactNode }) {
  return (
    <View style={[{ gap: 10 }, wide ? (w ? { width: w } : { flex: 1, minWidth: 0 }) : { width: w ?? 420 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[s.num, on && { backgroundColor: P.numOn, borderWidth: 0 }]}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: on ? P.numOnText : P.sub }}>{n}</Text>
        </View>
        <Text style={s.laneTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

function Upcoming({ time, title, sub, hot }: { time: string; title: string; sub: string; hot?: boolean }) {
  return (
    <View style={[s.panel, hot && { borderColor: colors.orange, borderWidth: 1.5 }]}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: hot ? P.accent : P.sub }}>{time}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: P.text }}>{title}</Text>
      <Text style={s.sub}>{sub}</Text>
    </View>
  );
}

function Today({ served }: { served: number }) {
  return (
    <View style={[s.panel, { paddingHorizontal: 18, paddingVertical: 14 }]}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: P.sub }}>Today</Text>
      <Text style={{ fontFamily: fonts.displayMedium, fontSize: 30, lineHeight: 36, color: P.text }}>{served} served</Text>
      <Text style={s.sub}>11 min average · 4.8 stars</Text>
    </View>
  );
}

function CookCard({ order: o, rank, now, onReady }: { order: Order; rank: number; now: number; onReady: () => void }) {
  const left = minutesUntil(o.dueAt, now);
  const first = rank === 1;
  const fresh = now - o.inAt < 2 * MIN;
  const extra = o.rider && o.rider.arrivesAt > now ? `rider ${o.rider.name} ${minutesUntil(o.rider.arrivesAt, now)} min away` : o.note ? `note: ${o.note.toLowerCase().replace(/[.,]?\s*please\.?$/, '')}` : o.tag ? o.tag.toLowerCase() : `rider assigned at ${clock(o.dueAt - 4 * MIN)}`;
  return (
    <View style={[s.cook, first && { borderColor: colors.orange, borderWidth: 2 }]}>
      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 14, paddingVertical: 12, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[s.rank, first ? { backgroundColor: colors.orange } : { borderWidth: 1.5, borderColor: colors.forest }]}>
            <Text style={{ fontFamily: fonts.bold, fontSize: first ? 14 : 13, color: first ? '#2B1408' : colors.forest }}>{ordinal(rank)}</Text>
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 30, color: colors.forest }}>{o.id}</Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }} numberOfLines={1}>
            {o.student}
          </Text>
          {fresh ? (
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: colors.orange }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.44, color: '#2B1408' }}>NEW</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 24, color: left <= 4 ? colors.orangeText : colors.forest }}>{Math.abs(left)} min</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: left < 0 ? colors.orangeText : colors.muted }}>
              {left < 0 ? 'late' : 'left'} · due {clock(o.dueAt)}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {o.items.map((i, n) => (
            <View key={i.name} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              {n > 0 ? <Text style={s.item}>·</Text> : null}
              <DishPhoto name={i.name} size={26} radius={8} />
              <Text style={s.item}>
                {i.qty}× {i.name}
              </Text>
              {(i.extras ?? []).map((e) => (
                <Chip key={e}>{e}</Chip>
              ))}
            </View>
          ))}
        </View>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }} numberOfLines={1}>
          In at {clock(o.inAt)} · {extra}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Order ${o.id} is ready`} onPress={onReady} style={({ pressed }) => [s.readyBtn, { opacity: pressed ? 0.9 : 1 }]}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.cream }}>Ready</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: P.panel, borderWidth: 1, borderColor: P.panelBorder, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cookNow: { minHeight: 44, borderRadius: 14, backgroundColor: P.panel, borderWidth: 1, borderColor: P.panelBorder, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 22, rowGap: 4, paddingHorizontal: 18, paddingVertical: 6 },
  cookLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.32, textTransform: 'uppercase', color: P.sub },
  num: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: P.sub, alignItems: 'center', justifyContent: 'center' },
  laneTitle: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: P.sub },
  panel: { backgroundColor: P.panel, borderWidth: 1, borderColor: P.panelBorder, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 3 },
  between: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  id: { fontFamily: fonts.display, color: P.text },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: P.sub },
  cook: { flexDirection: 'row', backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder, borderRadius: 18, overflow: 'hidden' },
  rank: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  item: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  readyBtn: { width: 104, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
});
