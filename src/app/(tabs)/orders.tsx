import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { onServer } from '../../lib/server';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, FoodImage, Icon, Label, Stars, styles as ui } from '../../components/ui';
import { DELIVERY_MINUTES, formatClock, formatWhen, isWaiting, minutesLeft, useAccount, useNow, type Order } from '../../lib/account';
import { todaysLines, useCart } from '../../lib/cart';
import { findRestaurant, findSpecial } from '../../lib/data';
import { arriveBy, stageOf } from '../../lib/stages';
import { colors, fonts, formatUGX } from '../../lib/theme';

export default function Orders() {
  const account = useAccount();
  const cart = useCart();
  const now = useNow();
  const active = account.activeOrder;
  const past = account.orders.filter((o) => o.delivered);

  const again = (order: Order) => {
    if (!findRestaurant(order.restaurantId)) return;
    cart.refill(order.restaurantId, todaysLines(order));
    router.push('/checkout');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Display>Orders</Display>
        </View>

        {active ? <ActiveOrder order={active} now={now} /> : null}

        {account.preorders.length > 0 ? (
          <View style={s.section}>
            <Label>Pre-orders</Label>
            {account.preorders.map((p) => {
              const sp = findSpecial(p.specialId);
              if (!sp) return null;
              return (
                <View key={p.id} style={[ui.card, s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                  <FoodImage tint={sp.tint} photo={sp.photo} size={26} style={s.thumb} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.orangeText }}>
                      {sp.day} · {p.slot}
                    </Text>
                    <Text style={s.strong}>{sp.name}</Text>
                    <Text style={s.meta}>
                      {sp.vendor} · {formatUGX(sp.price)}
                    </Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Cancel ${sp.name} pre-order`} hitSlop={8} onPress={() => account.cancelPreorder(p.id)}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.orangeText, textDecorationLine: 'underline' }}>Cancel</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={[s.section, { paddingTop: 22 }]}>
          {past.length > 0 ? <Label>{active ? 'Earlier' : 'Past orders'}</Label> : null}
          {past.map((o) => {
            const r = findRestaurant(o.restaurantId);
            return (
              <View key={o.id} style={[ui.card, s.card]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <FoodImage tint={o.lines[0]?.item.tint ?? r?.tint ?? colors.peach} photo={o.lines[0]?.item.photo ?? r?.photo} size={26} style={s.thumb} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={s.strong} numberOfLines={1}>
                      {r?.name ?? 'Order'}
                    </Text>
                    <Text style={s.meta} numberOfLines={1}>
                      {o.lines.map((l) => (l.quantity > 1 ? `${l.quantity} × ${l.item.name}` : l.item.name)).join(', ')}
                    </Text>
                    <Text style={s.meta} numberOfLines={1}>
                      {formatWhen(o.placedAt, now)} · <Text style={{ fontFamily: fonts.semibold, color: colors.ink }}>{o.total.toLocaleString('en-US')}</Text>
                    </Text>
                    {o.rating ? (
                      <View style={{ marginTop: 2 }}>
                        <Stars value={o.rating.stars} />
                      </View>
                    ) : null}
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Order ${r?.name ?? ''} again`} onPress={() => again(o)} style={({ pressed }) => [s.again, pressed && { backgroundColor: colors.sage }]}>
                    <Icon name="refresh-cw" size={15} />
                    <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>Again</Text>
                  </Pressable>
                </View>
                {o.rating ? null : (
                  <View style={s.rateRow}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.forest }}>How was it?</Text>
                    {/* One tap rates it. A tip can be added from the full rating screen after a delivery. */}
                    <Stars value={0} size={26} gap={4} onPick={(stars) => account.rateOrder(o.id, { stars, tags: [], tip: 0 })} />
                  </View>
                )}
              </View>
            );
          })}

          {!active && past.length === 0 ? (
            <View style={[ui.card, s.empty]}>
              <View style={s.emptyIcon}>
                <Icon name="shopping-bag" size={24} color={colors.orangeText} />
              </View>
              <Display size={22} style={{ textAlign: 'center' }}>
                No orders yet
              </Display>
              <Text style={[s.meta, { textAlign: 'center', lineHeight: 19 }]}>{onServer ? 'Your orders and their codes show here once you order.' : 'Your first three deliveries are free.'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Find food" onPress={() => router.navigate('/')} style={({ pressed }) => [s.find, pressed && { opacity: 0.9 }]}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.cream }}>Find food</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActiveOrder({ order, now }: { order: Order; now: number }) {
  const r = findRestaurant(order.restaurantId);
  const { status, headline, step } = order.serverId ? serverCard(order, now) : sampleCard(order, now);
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Track your order. ${status}`} onPress={() => router.push('/tracking')} style={({ pressed }) => [ui.card, s.active, { opacity: pressed ? 0.94 : 1 }]}>
        <FoodImage tint={order.lines[0]?.item.tint ?? colors.sand} photo={order.lines[0]?.item.photo} size={26} style={{ width: 64, height: 64, borderRadius: 16 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }} numberOfLines={1}>
            {r?.name} · {status}
          </Text>
          <Text style={{ fontFamily: fonts.displayLight, fontSize: 24, lineHeight: 27, color: colors.forest }}>{headline}</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[s.bar, { backgroundColor: i < step ? colors.forest : i === step ? colors.orange : colors.line }]} />
            ))}
          </View>
        </View>
        <Icon name="chevron-right" size={20} color={colors.chevron} />
      </Pressable>
    </View>
  );
}

// Sample orders move on the demo timer. Same steps as tracking: confirmed, cooked, on the way, at your door.
function sampleCard(order: Order, now: number) {
  const minutes = minutesLeft(order, now);
  const arrived = minutes === 0;
  const scheduled = isWaiting(order, now) && order.scheduledFor ? formatClock(order.scheduledFor, true) : null;
  const step = scheduled ? 0 : arrived ? 3 : minutes > DELIVERY_MINUTES - 2 ? 1 : 2;
  const status = scheduled ? 'coming later' : arrived ? 'arrived' : step === 1 ? 'cooking' : 'on the way';
  return { status, step, headline: scheduled ? `Arrives ${scheduled}` : arrived ? 'At your door' : `${minutes} min away` };
}

// Server orders show where the kitchen and rider really are.
function serverCard(order: Order, now: number) {
  const stage = stageOf(order, true, now);
  const minutes = Math.max(1, Math.round((arriveBy(order) - now) / 60_000));
  switch (order.status) {
    case 'awaiting_payment':
      return { status: 'waiting for payment', step: 0, headline: 'Approve on your phone' };
    case 'ready':
      return { status: 'packed, waiting for a rider', step: 1, headline: `${minutes} min away` };
    case 'at_gate':
      return { status: 'your rider is here', step: 3, headline: 'At your gate' };
    default:
      return { status: stage === 2 ? 'on the way' : 'cooking', step: Math.min(stage, 3), headline: `${minutes} min away` };
  }
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  active: { borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  empty: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 28, alignItems: 'center', gap: 8 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  find: { marginTop: 10, height: 46, paddingHorizontal: 28, borderRadius: 23, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 12, gap: 10 },
  thumb: { width: 60, height: 60, borderRadius: 14 },
  again: { height: 38, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.forest, flexDirection: 'row', alignItems: 'center', gap: 6 },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  strong: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
