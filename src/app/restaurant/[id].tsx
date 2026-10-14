import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BasketBar, Display, FoodImage, Icon, IconButton, Scrim, Stepper } from '../../components/ui';
import { useCart } from '../../lib/cart';
import { findRestaurant, type MenuItem } from '../../lib/data';
import { colors, fonts, formatUGX, smallCaps } from '../../lib/theme';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurant = findRestaurant(id);
  const cart = useCart();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(restaurant?.categories[0] ?? 'Popular');
  const [saved, setSaved] = useState(false);

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
  const closed = !!restaurant.opensAt;
  const hasOptions = (item: MenuItem) => !!item.extras?.length || !!item.pepper;
  const openDish = (item: MenuItem) => router.push({ pathname: '/dish', params: { restaurant: restaurant.id, item: item.id } });
  const addOne = (item: MenuItem) => (hasOptions(item) ? openDish(item) : cart.add(restaurant.id, item));
  const delivery = restaurant.deliveryFee === 0 ? 'Free delivery' : `${formatUGX(restaurant.deliveryFee)} delivery`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 290 + insets.top, backgroundColor: colors.forest }}>
          <FoodImage tint={restaurant.tint} size={96} style={[StyleSheet.absoluteFill, { paddingTop: insets.top, paddingBottom: 110 }]} />
          <Scrim id="menu-hero" />
          <View style={s.heroText}>
            <Text style={[smallCaps, { color: colors.peachText }]}>
              {restaurant.cuisine} · {restaurant.distance} away
            </Text>
            <Text style={s.heroTitle}>{restaurant.name}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.heroMeta }}>
              ★ {restaurant.rating} · {restaurant.minutes} min · {delivery}
            </Text>
          </View>
          <View style={[s.topButtons, { top: insets.top + 16 }]}>
            <IconButton icon="chevron-left" label="Back" variant="glass" size={40} onPress={() => router.back()} />
            <IconButton icon="heart" label={saved ? 'Saved' : 'Save restaurant'} variant={saved ? 'dark' : 'glass'} size={40} onPress={() => setSaved((x) => !x)} />
          </View>
        </View>

        {closed ? (
          <View style={s.closed}>
            <Icon name="moon" size={18} color={colors.orangeText} />
            <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>Closed now. Opens at {restaurant.opensAt}, so have a look at the menu.</Text>
          </View>
        ) : null}

        <View style={s.tabs}>
          {restaurant.categories.map((c) => {
            const on = c === tab;
            return (
              <Pressable key={c} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(c)} style={[s.tab, on && s.tabOn]}>
                <Text style={{ fontSize: 15, fontFamily: on ? fonts.bold : fonts.medium, color: on ? colors.forest : colors.muted }}>{c}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {items.map((item, i) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${formatUGX(item.price)}`}
              disabled={closed}
              onPress={() => openDish(item)}
              style={[s.item, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.lineSoft }]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>{item.name}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted }}>{item.description}</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginTop: 2 }}>{formatUGX(item.price)}</Text>
              </View>
              <View>
                <FoodImage tint={item.tint} size={40} style={{ width: 104, height: 104, borderRadius: 18, opacity: closed ? 0.6 : 1 }} />
                {closed ? null : (
                  <Stepper
                    name={item.name}
                    quantity={cart.restaurantId === restaurant.id ? cart.quantityOf(item.id) : 0}
                    onAdd={() => addOne(item)}
                    onRemove={() => cart.remove(item.id)}
                  />
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {showBasket && (
        <View style={[s.basket, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
          <BasketBar count={cart.count} total={formatUGX(cart.subtotal)} onPress={() => router.push('/checkout')} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  topButtons: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  heroText: { position: 'absolute', left: 20, right: 20, bottom: 20, gap: 6 },
  heroTitle: { fontFamily: fonts.displayLight, fontSize: 32, lineHeight: 34, color: colors.cream },
  tabs: { flexDirection: 'row', gap: 22, paddingHorizontal: 20, paddingTop: 6, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tab: { paddingVertical: 10, paddingHorizontal: 2, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.orange },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  closed: { marginHorizontal: 16, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.peach },
  basket: { position: 'absolute', left: 16, right: 16 },
});
