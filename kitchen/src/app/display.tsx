import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { first } from '../components/alerts';
import { Chip, DishPhoto } from '../components/ui';
import { clock, cookingQueue, cookNow, demoNow, minutesUntil, nextDrop, ordinal, ridersDue, SERVED_EARLIER, useKitchen, type Order } from '../lib/kitchen';
import { colors, fonts } from '../lib/theme';

// The canvas draws this screen dark green. Kevin asked for no dark green layouts, so it ships cream;
// flip this to true to get the canvas colours exactly.
const DARK = false;

const P = DARK
  ? { bg: '#0F2A1F', panel: '#173A2C', panelBorder: 'transparent', text: '#FFF8F0', sub: '#A9C4B2', ok: '#4CC27E', accent: '#FFB899', card: '#FFF8F0', cardBorder: 'transparent', outline: '#2F5E48', numOn: '#FFF8F0', numOnText: '#0F2A1F' }
  : { bg: colors.cream, panel: colors.card, panelBorder: colors.line, text: colors.forest, sub: colors.muted, ok: '#2E9E5B', accent: colors.orangeText, card: colors.card, cardBorder: colors.line, outline: colors.line, numOn: colors.forest, numOnText: colors.cream };

const MIN = 60_000;
const sage = '#E4EEE6';
// How long the new-order toast stays in the corner.
const TOAST_FOR = 12_000;

// The counter tablet: the whole line at a glance, built for landscape.
export default function Counter() {
  const k = useKitchen();
  // The rider countdown needs seconds; the shared clock ticks every 5.
  const [tick, setTick] = useState(demoNow);
  useEffect(() => {
    const i = setInterval(() => setTick(demoNow()), 1000);
    return () => clearInterval(i);
  }, []);
  const now = Math.max(tick, k.now);
  const run = ridersDue(k.orders, now)[0];
  const fresh = k.orders.filter((o) => o.live && o.status === 'cooking' && now - o.inAt < TOAST_FOR).sort((a, b) => b.inAt - a.inAt)[0];
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
        <CookCard key={o.id} order={o} rank={i + 1} now={now} riderComing={!!run && run.orders.some((x) => x.id === o.id)} onReady={() => k.markReady(o.id)} />
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

        {run ? <RiderBanner run={run} now={now} /> : null}

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
      {fresh ? <NewOrderToast order={fresh} rank={queue.findIndex((o) => o.id === fresh.id) + 1} /> : null}
    </SafeAreaView>
  );
}

// "Moses reaches the hatch in 2 min", with a ring counting down the two minutes and the bags he
// collects, sealed or not. As on the K-Counter board.
function RiderBanner({ run, now }: { run: ReturnType<typeof ridersDue>[number]; now: number }) {
  const secs = Math.max(0, Math.round((run.arrivesAt - now) / 1000));
  const share = Math.min(secs / 120, 1);
  const c = 2 * Math.PI * 24;
  const mins = Math.max(1, Math.ceil(secs / 60));
  const unready = run.unready.map((o) => o.id);
  return (
    <View style={s.rider} accessibilityLiveRegion="polite">
      <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${Math.floor(secs / 60)} minutes ${secs % 60} seconds`}>
        <Svg width={56} height={56} viewBox="0 0 56 56" style={StyleSheet.absoluteFill}>
          <Circle cx={28} cy={28} r={24} fill="none" stroke={colors.segment} strokeWidth={5} />
          <Circle cx={28} cy={28} r={24} fill="none" stroke={colors.orange} strokeWidth={5} strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={c * (1 - share)} transform="rotate(-90 28 28)" />
        </Svg>
        <Text style={{ fontFamily: fonts.display, fontSize: 17, color: colors.forest }}>
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 19, color: colors.forest }}>
          {run.name} reaches the hatch in {mins} min
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.segmentText }}>
          Collecting{' '}
          {run.orders.map((o, i) => (
            <Text key={o.id}>
              {i > 0 ? ' and ' : ''}
              {o.id} ({o.status === 'ready' ? 'sealed' : <Text style={{ fontFamily: fonts.bold, color: colors.chipText }}>still cooking</Text>})
            </Text>
          ))}
          . {unready.length ? `Seal ${unready.join(' and ')} first and ${run.name} leaves on time.` : 'Everything is sealed.'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {run.orders.map((o) =>
          o.status === 'ready' ? (
            <View key={o.id} style={[s.bag, { backgroundColor: sage }]}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.forest} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12.5l4.5 4.5L19 7.5" />
              </Svg>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>{o.id}</Text>
            </View>
          ) : (
            <View key={o.id} style={[s.bag, { backgroundColor: colors.chipBg }]}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.chipText }}>
                {o.id} · {Math.max(0, minutesUntil(o.dueAt, now))} min
              </Text>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

// "New order 4826 · printed", in the corner for a few seconds.
function NewOrderToast({ order: o, rank }: { order: Order; rank: number }) {
  const what = o.items.map((i, n) => (n === 0 ? i.name : i.name.toLowerCase())).join(', ');
  return (
    <View style={[s.toast, !o.printed && { borderColor: colors.orange, borderWidth: 2 }]} accessibilityRole="alert">
      <DishPhoto name={o.items[0]?.name ?? ''} size={44} radius={12} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>
          New order {o.id} · {o.printed ? 'printed' : 'didn’t print'}
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }} numberOfLines={1}>
          {what} · {o.printed ? `${first(o)} told` : 'tap it on the board'}
        </Text>
      </View>
      {rank > 0 ? <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.forest }}>{ordinal(rank)}</Text> : null}
    </View>
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

function CookCard({ order: o, rank, now, riderComing, onReady }: { order: Order; rank: number; now: number; riderComing: boolean; onReady: () => void }) {
  const left = minutesUntil(o.dueAt, now);
  const isFirst = rank === 1;
  const fresh = now - o.inAt < 2 * MIN;
  // Running over: the ticket turns orange (with a soft chime, from the alert host).
  const late = now >= o.dueAt + MIN;
  const extra = o.rider && o.rider.arrivesAt > now ? `rider ${o.rider.name} ${minutesUntil(o.rider.arrivesAt, now)} min away` : o.note ? `note: ${o.note.toLowerCase().replace(/[.,]?\s*please\.?$/, '')}` : o.tag ? o.tag.toLowerCase() : `rider assigned at ${clock(o.dueAt - 4 * MIN)}`;
  const flag = late
    ? { text: `Over time · ${first(o)} has been told the new time`, bg: colors.chipBg, fg: colors.chipText }
    : riderComing && o.rider
      ? { text: `${o.rider.name} is coming for this one`, bg: sage, fg: colors.forest }
      : null;
  return (
    <View style={[s.cook, late ? { borderColor: colors.orange, borderWidth: 2 } : riderComing ? { borderColor: colors.forest, borderWidth: 2 } : null]}>
      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 14, paddingVertical: 12, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[s.rank, isFirst ? { backgroundColor: colors.orange } : { borderWidth: 1.5, borderColor: colors.forest }]}>
            <Text style={{ fontFamily: fonts.bold, fontSize: isFirst ? 14 : 13, color: isFirst ? '#2B1408' : colors.forest }}>{ordinal(rank)}</Text>
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
            <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 24, color: left <= 4 ? colors.orangeText : colors.forest }}>
              {Math.abs(left)} min{left < 0 ? ' over' : ''}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: left < 0 ? colors.orangeText : colors.muted }}>{left < 0 ? `was due ${clock(o.dueAt)}` : `left · due ${clock(o.dueAt)}`}</Text>
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
        {flag ? (
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9, backgroundColor: flag.bg }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: flag.fg }} numberOfLines={1}>
              {flag.text}
            </Text>
          </View>
        ) : (
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }} numberOfLines={1}>
            In at {clock(o.inAt)} · {extra}
          </Text>
        )}
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
  rider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.orange,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 12,
    shadowColor: colors.orange,
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  bag: { height: 40, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  toast: {
    position: 'absolute',
    right: 24,
    bottom: 22,
    width: 360,
    maxWidth: '90%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.forest,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  readyBtn: { width: 104, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
});
