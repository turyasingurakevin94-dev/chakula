import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Display, FoodImage, IconButton, PrimaryButton, Stepper, styles as ui } from '../../components/ui';
import { useCart } from '../../lib/cart';
import { findRestaurant } from '../../lib/data';
import { colors, fonts, formatUGX } from '../../lib/theme';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurant = findRestaurant(id);
  const cart = useCart();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(restaurant?.categories[0] ?? 'Popular');

  if (!restaurant) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Display size={24}>Restaurant not found</Display>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: fonts.semibold, color: colors.forest }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const items = restaurant.menu.filter((m) => m.category === tab);
  const showBasket = cart.count > 0 && cart.restaurantId === restaurant.id;

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <FoodImage tint={restaurant.tint} size={72} style={{ height: 230 + insets.top }} />
        <View style={[s.topButtons, { top: insets.top + 12 }]}>
          <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
          <IconButton icon="heart" label="Save restaurant" />
        </View>

        <View style={[ui.card, s.info]}>
          <Display size={26}>{restaurant.name}</Display>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.muted }}>
            {restaurant.cuisine} · {restaurant.distance} from your hostel
          </Text>
          <View style={s.stats}>
            <Stat value={`★ ${restaurant.rating}`} label={`${restaurant.ratingCount} ratings`} />
            <Stat value={`${restaurant.minutes} min`} label="to your door" />
            <Stat value={formatUGX(restaurant.deliveryFee)} label="delivery" />
          </View>
        </View>

        <View style={s.tabs}>
          {restaurant.categories.map((c) => {
            const on = c === tab;
            return (
              <Pressable key={c} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(c)} style={[s.tab, on && s.tabOn]}>
                <Text style={{ fontSize: 15, fontFamily: on ? fonts.bold : fonts.regular, color: on ? colors.forest : colors.muted }}>{c}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          {items.map((item, i) => (
            <View key={item.id} style={[s.item, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.lineSoft }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>{item.name}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted }}>{item.description}</Text>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, marginTop: 4 }}>{formatUGX(item.price)}</Text>
              </View>
              <View>
                <FoodImage tint={item.tint} size={36} style={{ width: 92, height: 92, borderRadius: 16 }} />
                <Stepper
                  name={item.name}
                  quantity={cart.restaurantId === restaurant.id ? cart.quantityOf(item.id) : 0}
                  onAdd={() => cart.add(restaurant.id, item)}
                  onRemove={() => cart.remove(item.id)}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {showBasket && (
        <View style={[s.basket, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
          <PrimaryButton floating label={`View basket, ${cart.count} items`} onPress={() => router.push('/checkout')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={s.count}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>{cart.count}</Text>
              </View>
              <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.cream }}>View basket</Text>
            </View>
            <Text style={ui.primaryText}>{formatUGX(cart.subtotal)}</Text>
          </PrimaryButton>
        </View>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>{value}</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  topButtons: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  info: { marginHorizontal: 16, marginTop: -40, borderRadius: 22, padding: 18, paddingBottom: 16, gap: 10 },
  stats: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.lineSoft, paddingTop: 12 },
  tabs: { flexDirection: 'row', gap: 22, paddingHorizontal: 20, paddingTop: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { paddingBottom: 12, minHeight: 44, justifyContent: 'flex-end' },
  tabOn: { borderBottomWidth: 2, borderBottomColor: colors.orange },
  item: { flexDirection: 'row', gap: 14, paddingVertical: 16 },
  basket: { position: 'absolute', left: 16, right: 16 },
  count: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
});
