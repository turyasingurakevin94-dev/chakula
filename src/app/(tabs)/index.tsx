import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dishNames, QuickDishRow, UndoBar, UsualCard } from '../../components/home';
import { Display, FoodImage, Icon, PrimaryButton, styles as ui } from '../../components/ui';
import { useAccount, useNow } from '../../lib/account';
import { priceBasket, todaysLines, useCart } from '../../lib/cart';
import { findRestaurant, foodCategories, restaurants, specials, student } from '../../lib/data';
import { colors, fonts, formatUGX } from '../../lib/theme';
import { mealAt, pickUsual, quickDishes } from '../../lib/usual';

// Seconds an "Order again" can still be taken back before tracking opens.
const UNDO_SECONDS = 5;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const account = useAccount();
  const cart = useCart();
  const now = useNow();
  const [category, setCategory] = useState('All');
  // The order placed from "Your usual", while it can still be undone.
  const [justOrdered, setJustOrdered] = useState<{ id: string; summary: string } | null>(null);
  const fastest = restaurants.filter((r) => !r.opensAt).sort((a, b) => a.minutes - b.minutes);
  const special = specials[0]!;
  const quick = quickDishes();

  const usual = pickUsual(account.orders, now);
  const usualKitchen = usual ? findRestaurant(usual.restaurantId) : undefined;
  const usualLines = usual ? todaysLines(usual) : [];
  const usualTotal = usual ? priceBasket(usual.restaurantId, usualLines).total : 0;

  useEffect(() => {
    if (!justOrdered) return;
    const t = setTimeout(() => {
      setJustOrdered(null);
      router.push('/tracking');
    }, UNDO_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [justOrdered]);

  // Pays the way the student paid last time. A wallet that can't cover it falls back to MTN, which asks on the phone.
  const orderUsual = () => {
    if (!usual || justOrdered) return;
    const last = account.orders[0]?.method ?? 'mtn';
    const method = last === 'wallet' && account.balance < usualTotal ? 'mtn' : last;
    const id = account.placeOrder({ restaurantId: usual.restaurantId, lines: usualLines, total: usualTotal, method });
    setJustOrdered({ id, summary: `${dishNames(usualLines)} · ${formatUGX(usualTotal)}` });
  };

  const undo = () => {
    if (!justOrdered) return;
    account.cancelOrder(justOrdered.id);
    setJustOrdered(null);
  };

  const changeUsual = () => {
    if (!usual) return;
    cart.refill(usual.restaurantId, usualLines);
    router.push(`/restaurant/${usual.restaurantId}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: cart.count > 0 || justOrdered ? 104 : 32 }} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Deliver to ${account.address}. Change address`} onPress={() => router.push('/profile')} style={s.address}>
            <View style={s.pin}>
              <Icon name="map-pin" size={18} color={colors.orangeText} />
            </View>
            <View>
              <Text style={s.overline}>Deliver to</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.addressText} numberOfLines={1}>{account.address}</Text>
                <Icon name="chevron-down" size={16} />
              </View>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => router.push('/profile')} style={s.avatar}>
            <Text style={{ color: colors.cream, fontFamily: fonts.semibold, fontSize: 15 }}>{account.initials}</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.muted }}>
            {greeting()}, {account.firstName}
          </Text>
          <Display style={{ marginTop: 4 }}>What are you craving tonight?</Display>
        </View>

        <Pressable accessibilityRole="search" onPress={() => router.navigate('/search')} style={s.search}>
          <Icon name="search" size={20} color={colors.muted} />
          <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.muted }}>Search rolex, pilau, juice…</Text>
        </Pressable>

        {usual && usualKitchen ? (
          <UsualCard
            restaurant={usualKitchen}
            lines={usualLines}
            meal={mealAt(now)}
            total={usualTotal}
            now={now}
            busy={!!justOrdered}
            onOrder={orderUsual}
            onChange={changeUsual}
          />
        ) : null}

        {quick.length > 0 ? (
          <>
            <View style={s.sectionHead}>
              <Display size={21}>Ready in 15</Display>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>Quick to cook, close by</Text>
            </View>
            <QuickDishRow
              dishes={quick}
              quantityOf={(d) => (cart.restaurantId === d.restaurant.id ? cart.quantityOf(d.item.id) : 0)}
              onAdd={(d) => cart.add(d.restaurant.id, d.item)}
              onRemove={(d) => cart.remove(d.item.id)}
              onOpen={(d) => router.push(`/restaurant/${d.restaurant.id}`)}
            />
          </>
        ) : null}

        <View style={s.promo}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.badge}>New on campus</Text>
            <Display size={22} style={{ color: colors.cream }}>
              Free delivery on your first {student.freeDeliveriesLeft} orders
            </Display>
          </View>
          <View style={s.promoIcon}>
            <Icon name="zap" size={32} color={colors.forest} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 20 }}>
          {foodCategories.map((c) => {
            const on = c === category;
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setCategory(c)}
                style={[s.chip, on ? { backgroundColor: colors.forest, borderColor: colors.forest } : null]}
              >
                <Text style={{ fontFamily: on ? fonts.semibold : fonts.medium, fontSize: 14, color: on ? colors.cream : colors.ink }}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.sectionHead}>
          <Display size={21}>Fastest to your hostel</Display>
          <Pressable accessibilityRole="link" hitSlop={10} onPress={() => router.push('/kitchens')}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.forest }}>See all</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 20 }}>
          {fastest.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`${r.name}, ${r.minutes} minutes`}
              onPress={() => router.push(`/restaurant/${r.id}`)}
              style={({ pressed }) => [ui.card, s.restaurantCard, { opacity: pressed ? 0.92 : 1 }]}
            >
              <FoodImage tint={r.tint} style={{ height: 120 }} />
              <View style={s.timeTag}>
                <Icon name="clock" size={13} />
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.forest }}>{r.minutes} min</Text>
              </View>
              <View style={{ padding: 16, paddingTop: 14, gap: 4 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>{r.name}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{r.tags}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }}>★ {r.rating}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink }}>{formatUGX(r.deliveryFee)} delivery</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <View style={s.sectionHead}>
          <Display size={21}>This week’s specials</Display>
          <Pressable accessibilityRole="link" hitSlop={10} onPress={() => router.push('/specials')}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.forest }}>See all</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${special.name}, ${special.day}. Pre-order`}
          onPress={() => router.push('/specials')}
          style={({ pressed }) => [ui.card, s.special, { opacity: pressed ? 0.92 : 1 }]}
        >
          <FoodImage tint={special.tint} size={28} style={{ width: 72, height: 72, borderRadius: 14 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.orangeText }}>This {special.day}</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>{special.name}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{special.vendor} · order ahead</Text>
          </View>
          <Icon name="chevron-right" size={18} color="#B5AA9A" />
        </Pressable>
      </ScrollView>

      {justOrdered ? (
        <UndoBar summary={justOrdered.summary} seconds={UNDO_SECONDS} onUndo={undo} />
      ) : cart.count > 0 && cart.restaurantId ? (
        <View style={s.basket}>
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
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  address: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pin: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  overline: { fontFamily: fonts.regular, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.muted },
  addressText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.forest },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  search: {
    marginHorizontal: 20,
    marginTop: 18,
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
  },
  promo: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.forest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.forest,
    backgroundColor: colors.orange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  promoIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, justifyContent: 'center' },
  sectionHead: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  restaurantCard: { width: 262, overflow: 'hidden' },
  basket: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  count: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  special: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 20 },
  timeTag: {
    position: 'absolute',
    left: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cream,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
});
