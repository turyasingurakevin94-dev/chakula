import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatClock, type OrderLine } from '../lib/account';
import type { Restaurant } from '../lib/data';
import { colors, fonts, formatUGX } from '../lib/theme';
import type { Meal, QuickDish } from '../lib/usual';
import { Display, FoodImage, Icon, Stepper } from './ui';

// "2 × Classic rolex, African tea"
export function dishNames(lines: OrderLine[]) {
  return lines.map((l) => (l.quantity > 1 ? `${l.quantity} × ${l.item.name}` : l.item.name)).join(', ');
}

export function UsualCard({
  restaurant,
  lines,
  meal,
  total,
  now,
  busy,
  onOrder,
  onChange,
}: {
  restaurant: Restaurant;
  lines: OrderLine[];
  meal: Meal;
  total: number;
  now: number;
  busy: boolean;
  onOrder: () => void;
  onChange: () => void;
}) {
  const arrives = formatClock(now + restaurant.minutes * 60 * 1000);
  const orderLabel = `Order again · ${formatUGX(total)}`;
  return (
    <View style={s.usual}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <FoodImage tint={lines[0]?.item.tint ?? restaurant.tint} size={30} style={s.usualImage} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={s.usualOverline}>Your usual {meal}</Text>
          <Display size={20} style={{ color: colors.cream }}>
            {dishNames(lines)}
          </Display>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: '#CFE0D3' }}>
            {restaurant.name} · at your door by {arrives}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={orderLabel}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onOrder}
          style={({ pressed }) => [s.usualPrimary, { opacity: busy ? 0.6 : pressed ? 0.9 : 1 }]}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }} numberOfLines={1}>
            {orderLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change your usual from ${restaurant.name}`}
          onPress={onChange}
          style={({ pressed }) => [s.usualSecondary, pressed && { backgroundColor: '#24553F' }]}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.cream }}>Change</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function QuickDishRow({
  dishes,
  quantityOf,
  onAdd,
  onRemove,
  onOpen,
}: {
  dishes: QuickDish[];
  quantityOf: (d: QuickDish) => number;
  onAdd: (d: QuickDish) => void;
  onRemove: (d: QuickDish) => void;
  onOpen: (d: QuickDish) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 4 }}>
      {dishes.map((d) => (
        <Pressable
          key={`${d.restaurant.id}-${d.item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${d.item.name} from ${d.restaurant.name}, ${d.minutes} minutes`}
          onPress={() => onOpen(d)}
          style={({ pressed }) => [s.quick, { opacity: pressed ? 0.92 : 1 }]}
        >
          <View>
            <FoodImage tint={d.item.tint} size={34} style={{ height: 92, borderRadius: 14 }} />
            <Stepper name={d.item.name} quantity={quantityOf(d)} onAdd={() => onAdd(d)} onRemove={() => onRemove(d)} />
          </View>
          <View style={{ gap: 2, paddingHorizontal: 4, paddingTop: 10 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }} numberOfLines={1}>
              {d.item.name}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }} numberOfLines={1}>
              {d.restaurant.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Icon name="clock" size={12} color={colors.orangeText} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.orangeText }}>{d.minutes} min</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}> · {formatUGX(d.item.price)}</Text>
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// Sits over the bottom of Home while the order can still be taken back.
export function UndoBar({ summary, seconds, onUndo }: { summary: string; seconds: number; onUndo: () => void }) {
  const [left] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const run = Animated.timing(left, { toValue: 0, duration: seconds * 1000, easing: Easing.linear, useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [left, seconds]);

  return (
    <View style={s.undo} accessibilityLiveRegion="polite">
      <View style={s.undoTick}>
        <Icon name="check" size={16} color={colors.forest} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.cream }}>Ordered</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: '#CFE0D3' }} numberOfLines={1}>
          {summary}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Undo order" hitSlop={8} onPress={onUndo} style={({ pressed }) => [s.undoButton, pressed && { opacity: 0.85 }]}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>Undo</Text>
      </Pressable>
      <Animated.View style={[s.undoTimer, { width: left.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

const s = StyleSheet.create({
  usual: { marginHorizontal: 20, marginTop: 18, padding: 16, borderRadius: 22, backgroundColor: colors.forest, gap: 16 },
  usualImage: { width: 72, height: 72, borderRadius: 16 },
  usualOverline: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.orange },
  usualPrimary: { flex: 1, height: 48, borderRadius: 14, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  usualSecondary: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#4F7D66', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  quick: { width: 156, padding: 8, paddingBottom: 12, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  undo: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: colors.ink,
    overflow: 'hidden',
  },
  undoTick: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  undoButton: { height: 40, paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  undoTimer: { position: 'absolute', left: 0, bottom: 0, height: 3, backgroundColor: colors.orange },
});
