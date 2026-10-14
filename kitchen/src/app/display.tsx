import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader, Button, Chip } from '../components/ui';
import { clock, cookingQueue, cookNow, minutesUntil, nextDrop, ordinal, SERVED_EARLIER, useKitchen, type Order } from '../lib/kitchen';
import { colors, fonts } from '../lib/theme';

// The counter tablet: the whole line at a glance, best in landscape. Kept cream like the rest of the app.
export default function Counter() {
  const k = useKitchen();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const queue = cookingQueue(k.orders);
  const ready = k.orders.filter((o) => o.status === 'ready').sort((a, b) => (a.readyAt ?? 0) - (b.readyAt ?? 0));
  const away = k.orders.filter((o) => o.status === 'picked' || o.status === 'delivered').sort((a, b) => (b.pickedAt ?? 0) - (a.pickedAt ?? 0));
  const totals = cookNow(k.orders);
  const delivered = k.orders.filter((o) => o.status === 'delivered').length;

  const lanes = (
    <>
      <Lane title="Up next" count={3} wide={wide}>
        <Upcoming time={`Prints at ${clock(nextDrop(k.now) - 20 * 60_000)}`} title={`${clock(nextDrop(k.now))} drop`} sub="6 after-lecture orders" />
        <Upcoming time="Prints at 6:00" title="Supper plans" sub="38 meals · drop 7:00" />
        <Upcoming time="Prints at 6:10" title="6:30 drop" sub="3 orders" />
      </Lane>
      <Lane title="Cooking · in the order to cook them" count={queue.length} wide={wide} grow={1.6}>
        {queue.map((o, i) => (
          <CookCard key={o.id} order={o} rank={i + 1} now={k.now} onReady={() => k.markReady(o.id)} />
        ))}
      </Lane>
      <Lane title="Ready · waiting for rider" count={ready.length} wide={wide}>
        {ready.map((o) => {
          const here = o.rider && o.rider.arrivesAt <= k.now;
          return (
            <View key={o.id} style={[s.card, here && s.cardHot]}>
              <Text style={s.id}>{o.id}</Text>
              <Text style={[s.title, here && { color: colors.orangeText }]}>{here ? 'At the counter' : o.rider ? `${o.rider.name} ${Math.max(1, minutesUntil(o.rider.arrivesAt, k.now))} min away` : 'Finding a rider'}</Text>
              <Text style={s.meta}>
                Ready {o.readyAt ? clock(o.readyAt) : ''}
                {here && o.rider ? ` · ${o.rider.name} scanning the seal` : ''}
              </Text>
            </View>
          );
        })}
      </Lane>
      <Lane title="On the way" count={away.length} wide={wide}>
        {away.map((o) => (
          <View key={o.id} style={s.card}>
            <Text style={s.id}>{o.id}</Text>
            <Text style={s.title}>{o.status === 'delivered' ? 'Delivered' : `Arrives ${o.pickedAt ? clock(o.pickedAt + 10 * 60_000) : ''}`}</Text>
            <Text style={s.meta}>{o.status === 'delivered' ? `${o.deliveredAt ? clock(o.deliveredAt) : ''} · on time` : `Picked up ${o.pickedAt ? clock(o.pickedAt) : ''} · ${o.place.split(',')[0]}`}</Text>
          </View>
        ))}
      </Lane>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom', 'left', 'right']}>
      <BackHeader
        kicker={`Nakawa Kitchen · ${k.settings.open ? (k.settings.autoAccept ? 'Open · auto-accept' : 'Open') : 'Closed'}`}
        title="Counter display"
        right={<Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.forest }}>{clock(k.now)}</Text>}
      />
      {totals.length ? (
        <View style={s.cookNow}>
          <Text style={s.cookLabel}>Cook now</Text>
          {totals.map((t) => (
            <Text key={t.name} style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.forest }}>{t.qty}</Text> {t.name}
              {t.extras.length ? <Text style={{ color: colors.orangeText }}> · {t.extras.join(', ')}</Text> : null}
            </Text>
          ))}
        </View>
      ) : null}
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 12 }}>{lanes}</View>
      ) : (
        <ScrollView horizontal contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 12 }} showsHorizontalScrollIndicator={false}>
          {lanes}
        </ScrollView>
      )}
      <View style={s.footer}>
        <Text style={s.meta}>
          Today · <Text style={{ fontFamily: fonts.bold, color: colors.forest }}>{SERVED_EARLIER + 2 + delivered} served</Text> · 11 min average · 4.8 stars
        </Text>
      </View>
    </SafeAreaView>
  );
}

function Lane({ title, count, wide, grow = 1, children }: { title: string; count: number; wide: boolean; grow?: number; children: ReactNode }) {
  return (
    <View style={[s.lane, wide ? { flex: grow } : { width: grow > 1 ? 320 : 260 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={s.laneTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={s.count}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.forest }}>{count}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

function Upcoming({ time, title, sub }: { time: string; title: string; sub: string }) {
  return (
    <View style={s.card}>
      <Text style={[s.meta, { color: colors.orangeText, fontFamily: fonts.semibold }]}>{time}</Text>
      <Text style={s.title}>{title}</Text>
      <Text style={s.meta}>{sub}</Text>
    </View>
  );
}

function CookCard({ order: o, rank, now, onReady }: { order: Order; rank: number; now: number; onReady: () => void }) {
  const left = minutesUntil(o.dueAt, now);
  const first = rank === 1;
  return (
    <View style={[s.card, first && s.cardFirst, { gap: 6 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[s.rank, first ? { backgroundColor: colors.orange } : { borderWidth: 1.5, borderColor: colors.forest }]}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: first ? '#2B1408' : colors.forest }}>{ordinal(rank)}</Text>
        </View>
        <Text style={s.id}>{o.id}</Text>
        <Text style={[s.title, { flex: 1 }]} numberOfLines={1}>
          {o.student}
        </Text>
      </View>
      <Text style={[s.meta, { fontFamily: fonts.semibold, color: left <= 4 ? colors.orangeText : colors.forest }]}>
        Due {clock(o.dueAt)} · {left < 0 ? `${-left} min late` : `${left} min`}
      </Text>
      {o.items.map((i) => (
        <View key={i.name} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>
            {i.qty}× {i.name}
          </Text>
          {(i.extras ?? []).map((e) => (
            <Chip key={e}>{e}</Chip>
          ))}
        </View>
      ))}
      <Text style={s.meta} numberOfLines={1}>
        In at {clock(o.inAt)}
        {o.note ? ` · note: ${o.note.toLowerCase().replace(/[.,]?\s*please\.?$/, '')}` : o.tag ? ` · ${o.tag.toLowerCase()}` : ''}
      </Text>
      <Button height={40} label={`Order ${o.id} is ready`} onPress={onReady}>
        Ready
      </Button>
    </View>
  );
}

const s = StyleSheet.create({
  cookNow: { marginHorizontal: 20, marginVertical: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 18, rowGap: 4, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  cookLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.orangeText },
  lane: { backgroundColor: colors.well, borderRadius: 20, padding: 10, gap: 10 },
  laneTitle: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.sub },
  count: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, gap: 2 },
  cardFirst: { borderWidth: 2, borderColor: colors.orange, padding: 11 },
  cardHot: { borderColor: colors.orange },
  rank: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  id: { fontFamily: fonts.display, fontSize: 22, color: colors.forest },
  title: { fontFamily: fonts.bold, fontSize: 14, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  footer: { paddingHorizontal: 20, paddingBottom: 8 },
});
