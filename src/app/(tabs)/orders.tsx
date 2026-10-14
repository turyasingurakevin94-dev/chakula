import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, FoodImage, Icon, Label, styles as ui } from '../../components/ui';
import { DELIVERY_MINUTES, formatWhen, minutesLeft, useAccount, useNow, type Order } from '../../lib/account';
import { useCart } from '../../lib/cart';
import { findRestaurant } from '../../lib/data';
import { colors, fonts, formatUGX } from '../../lib/theme';

export default function Orders() {
  const account = useAccount();
  const cart = useCart();
  const now = useNow();
  const active = account.activeOrder;
  const past = account.orders.filter((o) => o.delivered);

  const again = (order: Order) => {
    const restaurant = findRestaurant(order.restaurantId);
    if (!restaurant) return;
    // Use today's menu prices, not what was paid last time.
    const lines = order.lines.map((l) => ({ quantity: l.quantity, item: restaurant.menu.find((m) => m.id === l.item.id) ?? l.item }));
    cart.refill(restaurant.id, lines);
    router.push('/checkout');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Display>Orders</Display>
        </View>

        {active ? <ActiveOrder order={active} minutes={minutesLeft(active, now)} /> : null}

        <View style={[s.section, { gap: 10 }]}>
          {past.length > 0 ? <Label>{active ? 'Earlier' : 'Past orders'}</Label> : null}
          {past.map((o) => {
            const r = findRestaurant(o.restaurantId);
            return (
              <View key={o.id} style={[ui.card, s.past]}>
                <FoodImage tint={r?.tint ?? colors.peach} size={26} style={s.thumb} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={s.strong}>{r?.name ?? 'Order'}</Text>
                  <Text style={s.meta} numberOfLines={1}>
                    {o.lines.map((l) => (l.quantity > 1 ? `${l.quantity} × ${l.item.name}` : l.item.name)).join(', ')}
                  </Text>
                  <Text style={s.meta}>
                    {formatWhen(o.placedAt, now)} · <Text style={{ fontFamily: fonts.semibold, color: colors.ink }}>{formatUGX(o.total)}</Text>
                  </Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Order ${r?.name ?? ''} again`} onPress={() => again(o)} style={({ pressed }) => [s.again, pressed && { backgroundColor: colors.sage }]}>
                  <Icon name="repeat" size={15} />
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>Again</Text>
                </Pressable>
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

function ActiveOrder({ order, minutes }: { order: Order; minutes: number }) {
  const r = findRestaurant(order.restaurantId);
  const arrived = minutes === 0;
  // Same four steps as the tracking screen: confirmed, cooked, on the way, at your door.
  const step = arrived ? 3 : minutes > DELIVERY_MINUTES - 2 ? 1 : 2;
  return (
    <View style={s.section}>
      <Label>{arrived ? 'Arrived' : 'On the way'}</Label>
      <Pressable accessibilityRole="button" accessibilityLabel="Track your order" onPress={() => router.push('/tracking')} style={({ pressed }) => [s.active, { opacity: pressed ? 0.94 : 1 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: '#CFE0D3' }}>
              {r?.name} · #{order.id}
            </Text>
            <Display size={28} style={{ color: colors.cream }}>
              {arrived ? 'At your door' : `${minutes} min away`}
            </Display>
          </View>
          <View style={s.bike}>
            <Icon name={arrived ? 'check' : 'navigation'} size={24} color={colors.forest} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[s.bar, { backgroundColor: i < step ? colors.cream : i === step ? colors.orange : '#3C6B55' }]} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.cream }}>{arrived ? 'Brian is outside' : 'Brian is riding over'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.cream }}>Track</Text>
            <Icon name="chevron-right" size={16} color={colors.cream} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  active: { backgroundColor: colors.forest, borderRadius: 22, padding: 18, gap: 14 },
  bike: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  bar: { flex: 1, height: 6, borderRadius: 3 },
  past: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
  thumb: { width: 56, height: 56, borderRadius: 14 },
  again: { height: 38, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.forest, flexDirection: 'row', alignItems: 'center', gap: 6 },
  strong: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
