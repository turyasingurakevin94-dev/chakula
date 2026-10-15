import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatClock, type OrderLine } from '../lib/account';
import type { MenuItem, Restaurant } from '../lib/data';
import type { PhotoKey } from '../lib/photos';
import { colors, fonts, formatUGX, smallCaps } from '../lib/theme';
import type { QuickDish } from '../lib/usual';
import { FoodImage, Icon, Scrim, Stepper } from './ui';

// "2 × Classic rolex, African tea"
export function dishNames(lines: OrderLine[]) {
  return lines.map((l) => (l.quantity > 1 ? `${l.quantity} × ${l.item.name}` : l.item.name)).join(', ');
}

export function UsualCard({
  restaurant,
  lines,
  usualAt,
  total,
  now,
  busy,
  paysWith,
  undoSeconds,
  onOrder,
  onChange,
}: {
  restaurant: Restaurant;
  lines: OrderLine[];
  // When the student usually orders it.
  usualAt: number;
  total: number;
  now: number;
  busy: boolean;
  paysWith: string;
  undoSeconds: number;
  onOrder: () => void;
  onChange: () => void;
}) {
  const arrives = formatClock(now + restaurant.minutes * 60 * 1000);
  const orderLabel = `Order again · ${formatUGX(total)}`;
  return (
    <View style={s.usual}>
      <View style={{ flexDirection: 'row', gap: 14, padding: 16, alignItems: 'center' }}>
        <FoodImage tint={lines[0]?.item.tint ?? restaurant.tint} photo={lines[0]?.item.photo ?? restaurant.photo} size={36} style={s.usualImage} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={[smallCaps, { color: colors.peachText }]}>Your usual · {formatClock(usualAt, true)}</Text>
          <Text style={{ fontFamily: fonts.displayLight, fontSize: 22, lineHeight: 25, color: colors.cream }} numberOfLines={2}>
            {dishNames(lines)}
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.mint }} numberOfLines={2}>
            {restaurant.name} · at your door by {arrives}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
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
          style={({ pressed }) => [s.usualSecondary, pressed && { backgroundColor: colors.forestMid }]}
        >
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.cream }}>Change</Text>
        </Pressable>
      </View>
      <View style={s.usualFoot}>
        <Text style={s.usualFootText} numberOfLines={1}>
          Pays with {paysWith}
        </Text>
        <Text style={s.usualFootText}>{undoSeconds} seconds to undo</Text>
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 10 }}>
      {dishes.map((d) => (
        <Pressable
          key={`${d.restaurant.id}-${d.item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${d.item.name} from ${d.restaurant.name}, ${d.minutes} minutes`}
          onPress={() => onOpen(d)}
          style={({ pressed }) => [{ width: 150, gap: 8, opacity: pressed ? 0.92 : 1 }]}
        >
          <View>
            <FoodImage tint={d.item.tint} photo={d.item.photo} size={36} style={{ height: 108, borderRadius: 16 }} />
            <View style={s.timePill}>
              <Icon name="clock" size={12} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.forest }}>{d.minutes} min</Text>
            </View>
            <Stepper name={d.item.name} quantity={quantityOf(d)} onAdd={() => onAdd(d)} onRemove={() => onRemove(d)} />
          </View>
          <View>
            <Text style={s.cardTitle} numberOfLines={1}>
              {d.item.name}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }} numberOfLines={1}>
              {d.restaurant.name} · {formatUGX(d.item.price)}
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// Full-width featured dish with its title laid over the picture.
export function ChefsPick({ restaurant, item, freeDeliveries, onOpen, onAdd }: { restaurant: Restaurant; item: MenuItem; freeDeliveries: number; onOpen: () => void; onAdd: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Chef’s pick tonight: ${item.name} from ${restaurant.name}`} onPress={onOpen} style={({ pressed }) => [s.hero, { opacity: pressed ? 0.95 : 1 }]}>
      <FoodImage tint={item.tint} photo={item.photo} size={60} style={[StyleSheet.absoluteFill, { paddingTop: 44, paddingBottom: 96 }]} />
      <Scrim id="chefs-pick" />
      {freeDeliveries > 0 ? <Text style={s.heroPill}>Free delivery · first {freeDeliveries} orders</Text> : null}
      <View style={s.heroFoot}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[smallCaps, { color: colors.peachText }]}>Chef’s pick tonight</Text>
          <Text style={{ fontFamily: fonts.displayLight, fontSize: 26, lineHeight: 29, color: colors.cream }}>{item.name}</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.heroMeta }}>
            {restaurant.name} · {restaurant.minutes} min · {formatUGX(item.price)}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Add ${item.name}`} hitSlop={6} onPress={onAdd} style={s.heroAdd}>
          <Icon name="plus" size={20} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export function CategoryChips({ categories, selected, onSelect }: { categories: { id: string; label: string; tint: string; photo?: PhotoKey }[]; selected: string | null; onSelect: (id: string | null) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 4 }}>
      {categories.map((c) => {
        const on = c.id === selected;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={c.label}
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(on ? null : c.id)}
            style={{ width: 64, alignItems: 'center', gap: 6 }}
          >
            <View style={[s.chipRing, on && { borderColor: colors.forest }]}>
              <FoodImage tint={c.tint} photo={c.photo} size={26} style={s.chipImage} />
            </View>
            <Text style={{ fontSize: 12, fontFamily: on ? fonts.bold : fonts.medium, color: on ? colors.forest : colors.muted }}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function DishCard({ name, price, tint, photo, onPress }: { name: string; price: number; tint: string; photo?: PhotoKey; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${formatUGX(price)}`} onPress={onPress} style={({ pressed }) => [{ width: 150, gap: 8, opacity: pressed ? 0.92 : 1 }]}>
      <FoodImage tint={tint} photo={photo} size={40} style={{ height: 112, borderRadius: 16 }} />
      <View>
        <Text style={s.cardTitle} numberOfLines={1}>
          {name}
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{formatUGX(price)}</Text>
      </View>
    </Pressable>
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
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.mint }} numberOfLines={1}>
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
  usual: { marginHorizontal: 20, marginTop: 16, borderRadius: 22, backgroundColor: colors.forest, overflow: 'hidden' },
  usualImage: { width: 88, height: 88, borderRadius: 18 },
  usualPrimary: { flex: 1, height: 50, borderRadius: 14, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  usualSecondary: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.forestLine, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  usualFoot: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.forestMid },
  usualFootText: { fontFamily: fonts.regular, fontSize: 12, color: colors.mint, flexShrink: 1 },
  timePill: { position: 'absolute', left: 8, top: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.forest },
  hero: { marginHorizontal: 20, height: 224, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.forest },
  heroPill: {
    position: 'absolute',
    left: 16,
    top: 16,
    ...smallCaps,
    color: colors.cream,
    backgroundColor: 'rgba(15,42,31,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroFoot: { position: 'absolute', left: 18, right: 18, bottom: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  heroAdd: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  chipRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  chipImage: { width: 56, height: 56, borderRadius: 28 },
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
