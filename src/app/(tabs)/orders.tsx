import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, FoodImage, Icon, Label, Stars, styles as ui } from '../../components/ui';
import { DELIVERY_MINUTES, formatClock, formatWhen, isWaiting, minutesLeft, useAccount, useNow, type Order } from '../../lib/account';
import { todaysLines, useCart } from '../../lib/cart';
import { findRestaurant, findSpecial } from '../../lib/data';
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

        {active ? <ActiveOrder order={active} minutes={minutesLeft(active, now)} waiting={isWaiting(active, now)} /> : null}

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
            <View style={{ alignItems: 'center', paddingTop: 64, gap: 8 }}>
              <Display size={22}>No orders yet</Display>
              <Text style={s.meta}>Your first three deliveries are free.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActiveOrder({ order, minutes, waiting }: { order: Order; minutes: number; waiting: boolean }) {
  const r = findRestaurant(order.restaurantId);
  const arrived = minutes === 0;
  const scheduled = waiting && order.scheduledFor ? formatClock(order.scheduledFor, true) : null;
  // Same steps as tracking: confirmed, cooked, on the way, at your door.
  const step = scheduled ? 0 : arrived ? 3 : minutes > DELIVERY_MINUTES - 2 ? 1 : 2;
  const status = scheduled ? 'coming later' : arrived ? 'arrived' : step === 1 ? 'cooking' : 'on the way';
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Track your order" onPress={() => router.push('/tracking')} style={({ pressed }) => [s.active, { opacity: pressed ? 0.94 : 1 }]}>
        <FoodImage tint={order.lines[0]?.item.tint ?? colors.sand} photo={order.lines[0]?.item.photo} size={26} style={{ width: 64, height: 64, borderRadius: 16 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.mint }} numberOfLines={1}>
            {r?.name} · {status}
          </Text>
          <Text style={{ fontFamily: fonts.displayLight, fontSize: 24, lineHeight: 27, color: colors.cream }}>{scheduled ? `Arrives ${scheduled}` : arrived ? 'At your door' : `${minutes} min away`}</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[s.bar, { backgroundColor: i < step ? colors.cream : i === step ? colors.orange : colors.forestLine }]} />
            ))}
          </View>
        </View>
        <Icon name="chevron-right" size={20} color={colors.cream} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  active: { backgroundColor: colors.forest, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  card: { padding: 12, gap: 10 },
  thumb: { width: 60, height: 60, borderRadius: 14 },
  again: { height: 38, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.forest, flexDirection: 'row', alignItems: 'center', gap: 6 },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  strong: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
