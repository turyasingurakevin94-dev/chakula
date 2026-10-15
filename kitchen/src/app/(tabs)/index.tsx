import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JustIn } from '../../components/justin';
import { Countdown, Lines, TimeBar } from '../../components/order';
import { Body, Button, Card, Display, Icon, Label, Segments, Toggle } from '../../components/ui';
import { clock, cookingQueue, cookNow, shortName, minutesUntil, ordinal, SERVED_EARLIER, useKitchen, type Order } from '../../lib/kitchen';
import { onServer } from '../../lib/server';
import { colors, fonts } from '../../lib/theme';

type Tab = 'cooking' | 'ready' | 'done';

export default function Orders() {
  const k = useKitchen();
  const [tab, setTab] = useState<Tab>('cooking');
  const queue = cookingQueue(k.orders);
  const ready = k.orders.filter((o) => o.status === 'ready').sort((a, b) => (a.readyAt ?? 0) - (b.readyAt ?? 0));
  const done = k.orders.filter((o) => o.status === 'picked' || o.status === 'delivered').sort((a, b) => (b.pickedAt ?? 0) - (a.pickedAt ?? 0));
  const totals = cookNow(k.orders);
  const auto = k.settings.autoAccept && k.settings.printTicket;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={{ gap: 2 }}>
            {onServer ? (
              // Nothing prints on the server version yet: orders just arrive on the board.
              <View accessibilityLabel={k.offline ? 'Offline: trying to reach Chakula' : 'Live: new orders arrive by themselves'} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[s.dot, { backgroundColor: k.offline ? colors.orange : '#2E9E5B' }]} />
                <Label>{k.offline ? 'Offline · retrying' : 'Live'}</Label>
              </View>
            ) : (
              <Pressable accessibilityRole="link" accessibilityLabel="Printer and POS settings" onPress={() => router.push('/setup')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[s.dot, { backgroundColor: auto ? '#2E9E5B' : colors.orange }]} />
                <Label>{auto ? 'Printing itself' : 'You accept each order'}</Label>
              </Pressable>
            )}
            <Display>Orders</Display>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="link" accessibilityLabel="Who hears what: alert settings" onPress={() => router.push('/alerts')} style={s.round}>
            <Icon name="bell" size={18} />
          </Pressable>
          <Pressable accessibilityRole="switch" accessibilityLabel="Kitchen open for orders" accessibilityState={{ checked: k.settings.open }} onPress={() => k.setSetting('open', !k.settings.open)} style={s.openPill}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>{k.settings.open ? 'Open' : 'Closed'}</Text>
            <Toggle small label="Kitchen open for orders" value={k.settings.open} />
          </Pressable>
          </View>
        </View>

        {!k.settings.open ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Icon name="moon" size={18} color={colors.muted} />
              <Body style={{ flex: 1, color: colors.muted }}>You’re closed. Students can’t order from you until you open again.</Body>
            </Card>
          </View>
        ) : null}

        <JustIn />

        {totals.length > 0 ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            <View style={s.cookNow} accessibilityLabel={`Cook now: ${totals.map((t) => `${t.qty} ${t.name}`).join(', ')}`}>
              <Text style={s.cookNowLabel}>Cook now</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 }}>
                {totals.map((t) => (
                  <Text key={t.name} style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.cream }}>
                    <Text style={{ fontFamily: fonts.display, fontSize: 20 }}>{t.qty}</Text> {shortName(t.name)}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Segments<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { key: 'cooking', label: `Cooking ${queue.length}` },
              { key: 'ready', label: `Ready ${ready.length}` },
              { key: 'done', label: `Done ${SERVED_EARLIER + done.length}` },
            ]}
          />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 10 }}>
          {tab === 'cooking' ? (
            queue.length ? (
              <>
                <Label>Cook in this order · first in, first out</Label>
                {queue.slice(0, 2).map((o, i) => (
                  <CookingCard key={o.id} order={o} rank={i + 1} now={k.now} onReady={() => k.markReady(o.id)} />
                ))}
                {queue[2] ? <NextRow order={queue[2]} after={queue.slice(3)} now={k.now} /> : null}
              </>
            ) : (
              <Empty icon={k.offline ? 'wifi-off' : 'coffee'} text={k.offline ? 'Can’t reach Chakula right now. Orders show here as soon as the connection is back.' : onServer ? 'Nothing to cook right now. New orders appear here by themselves.' : 'Nothing to cook right now. New orders print and appear here by themselves.'} />
            )
          ) : tab === 'ready' ? (
            ready.length ? (
              <>
                <Label>{onServer ? 'Waiting for riders' : 'Waiting for riders · they scan the bag seal'}</Label>
                {ready.map((o) => (
                  <ReadyCard key={o.id} order={o} now={k.now} />
                ))}
              </>
            ) : (
              <Empty icon="package" text={onServer ? "No bags waiting. Tap Ready on an order when it's packed." : "No bags waiting. Tap Ready on an order when it's packed and sealed."} />
            )
          ) : (
            <>
              {done.map((o) => (
                <DoneRow key={o.id} order={o} />
              ))}
              {SERVED_EARLIER ? <Body style={{ color: colors.muted, textAlign: 'center', paddingTop: 6 }}>{SERVED_EARLIER} more served earlier today</Body> : null}
              {!SERVED_EARLIER && !done.length ? <Empty icon="check-circle" text={onServer ? 'Orders riders have picked up in the last day show here.' : 'Orders riders have picked up today show here.'} /> : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CookingCard({ order: o, rank, now, onReady }: { order: Order; rank: number; now: number; onReady: () => void }) {
  const first = rank === 1;
  return (
    <Card highlight={first} style={{ gap: 10, paddingTop: first ? 11 : 12, paddingBottom: first ? 13 : 14 }}>
      <Pressable accessibilityRole="link" accessibilityLabel={`Order ${o.id} for ${o.student}, ${ordinal(rank)} in line`} onPress={() => router.push(`/order/${o.id}`)} style={s.orderHead}>
        <View style={[s.rank, first ? s.rankFirst : s.rankOther]}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: first ? '#2B1408' : colors.forest }}>{ordinal(rank)}</Text>
        </View>
        <Text style={s.orderId}>{o.id}</Text>
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Text numberOfLines={1} style={s.student}>
            {o.student}
          </Text>
          <Text numberOfLines={1} style={s.meta}>
            In at {clock(o.inAt)} · {o.tag ?? o.place}
          </Text>
        </View>
        <Countdown order={o} now={now} />
      </Pressable>
      <TimeBar order={o} now={now} first={first} />
      <Lines order={o} />
      {o.note ? <Text style={s.note}>“{o.note}”</Text> : null}
      <Button height={48} label={`Order ${o.id} is ready`} onPress={onReady}>
        Ready
      </Button>
    </Card>
  );
}

// From the 3rd order on, one compact row; the rest wait their turn.
function NextRow({ order: o, after, now }: { order: Order; after: Order[]; now: number }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`Order ${o.id} for ${o.student}, 3rd in line`} onPress={() => router.push(`/order/${o.id}`)}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
        <View style={[s.rank, s.rankOther]}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.forest }}>3rd</Text>
        </View>
        <Text style={s.orderId}>{o.id}</Text>
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Text numberOfLines={1} style={s.student}>
            {o.student}
          </Text>
          <Text numberOfLines={1} style={s.meta}>
            In at {clock(o.inAt)}
            {after.length ? ` · then ${after.map((x, i) => `${ordinal(i + 4)}: ${x.id}`).join(', ')}` : ''}
          </Text>
        </View>
        <Countdown order={o} now={now} size={18} />
      </Card>
    </Pressable>
  );
}

function ReadyCard({ order: o, now }: { order: Order; now: number }) {
  const r = o.rider;
  const here = r && r.arrivesAt <= now;
  const mins = r ? minutesUntil(r.arrivesAt, now) : 0;
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(`/order/${o.id}`)}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={s.orderId}>{o.id}</Text>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={s.student}>{o.student}</Text>
          <Text style={s.meta}>Ready {o.readyAt ? clock(o.readyAt) : ''} · {onServer ? 'on the shelf' : 'sealed and on the shelf'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          {onServer ? (
            // The server knows who took the run, not when they reach the counter.
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>{r ? `${r.name} is coming` : 'Finding a rider'}</Text>
          ) : (
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: here ? colors.orangeText : colors.forest }}>{r ? (here ? `${r.name} is here` : `${r.name} in ${Math.max(mins, 1)} min`) : 'Finding a rider'}</Text>
          )}
          <Text style={s.meta}>{here && !onServer ? 'Scanning the seal' : 'Nothing to do'}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function DoneRow({ order: o }: { order: Order }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(`/order/${o.id}`)} style={s.doneRow}>
      <Icon name="check-circle" size={18} color={colors.green} />
      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{o.id}</Text>
      <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.ink }} numberOfLines={1}>
        {o.student}
      </Text>
      <Text style={s.meta}>{o.status === 'delivered' && o.deliveredAt ? `Delivered ${clock(o.deliveredAt)}` : `Picked up ${o.pickedAt ? clock(o.pickedAt) : ''} · ${o.rider?.name ?? ''}`}</Text>
    </Pressable>
  );
}

function Empty({ icon, text }: { icon: 'coffee' | 'package' | 'check-circle' | 'wifi-off'; text: string }) {
  return (
    <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
      <Icon name={icon} size={26} color={colors.sub} />
      <Body style={{ textAlign: 'center', color: colors.muted, maxWidth: 260 }}>{text}</Body>
    </Card>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  openPill: { height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 8 },
  cookNow: { backgroundColor: colors.forest, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  cookNowLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: '#A9C4B2' },
  orderHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rankFirst: { backgroundColor: colors.orange },
  rankOther: { borderWidth: 1.5, borderColor: colors.forest },
  orderId: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.forest },
  student: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  note: { fontFamily: fonts.displayItalic, fontSize: 15, lineHeight: 21, color: colors.ink },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
});
