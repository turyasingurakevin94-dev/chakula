import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryChips, ChefsPick, dishNames, DishCard, QuickDishRow, UndoBar, UsualCard } from '../../components/home';
import { BasketBar, Display, FoodImage, Icon, Italic, styles as ui } from '../../components/ui';
import { useAccount, useNow, type PayMethod } from '../../lib/account';
import { priceBasket, todaysLines, useCart } from '../../lib/cart';
import { chefsPick, findRestaurant, foodCategories, popularDishes, specials, student, type MenuItem, type Restaurant } from '../../lib/data';
import { colors, fonts, formatUGX, smallCaps } from '../../lib/theme';
import { mealAt, pickUsual, quickDishes } from '../../lib/usual';

// Seconds an "Order again" can still be taken back before tracking opens.
const UNDO_SECONDS = 5;

function greeting(now: number) {
  const h = new Date(now).getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const mealWord = { breakfast: 'Breakfast', lunch: 'Lunch', supper: 'Supper' } as const;

export default function Home() {
  const account = useAccount();
  const cart = useCart();
  const now = useNow();
  const [category, setCategory] = useState<string | null>(null);
  // The order placed from "Your usual", while it can still be undone.
  const [justOrdered, setJustOrdered] = useState<{ id: string; summary: string } | null>(null);
  const special = specials[0]!;
  const quick = quickDishes();
  const popular = popularDishes(category ?? undefined);
  const pickKitchen = findRestaurant(chefsPick.restaurantId);
  const pickItem = pickKitchen?.menu.find((m) => m.id === chefsPick.itemId);

  const usual = pickUsual(account.orders, now);
  const usualKitchen = usual ? findRestaurant(usual.restaurantId) : undefined;
  const usualLines = usual ? todaysLines(usual) : [];
  const usualTotal = usual ? priceBasket(usual.restaurantId, usualLines).total : 0;
  // Pays the way the student paid last time. A wallet that can't cover it falls back to MTN, which asks on the phone.
  const lastMethod = account.orders[0]?.method ?? 'mtn';
  const usualMethod: PayMethod = lastMethod === 'wallet' && account.balance < usualTotal ? 'mtn' : lastMethod;
  const paysWith: Record<PayMethod, string> = {
    mtn: `MTN MoMo ${account.maskedPhone}`,
    airtel: 'Airtel Money',
    wallet: 'your Chakula wallet',
    card: 'your card',
    cash: 'cash on delivery',
  };

  useEffect(() => {
    if (!justOrdered) return;
    const t = setTimeout(() => {
      setJustOrdered(null);
      router.push('/tracking');
    }, UNDO_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [justOrdered]);

  const orderUsual = () => {
    if (!usual || justOrdered) return;
    const id = account.placeOrder({ restaurantId: usual.restaurantId, lines: usualLines, total: usualTotal, method: usualMethod });
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

  // Dishes with extras or pepper open the options sheet; the rest go straight in the basket.
  const addDish = (r: Restaurant, item: MenuItem) => {
    if (item.extras?.length || item.pepper) router.push({ pathname: '/dish', params: { restaurant: r.id, item: item.id } });
    else cart.add(r.id, item);
  };

  const showBasket = !justOrdered && cart.count > 0 && !!cart.restaurantId;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: showBasket || justOrdered ? 104 : 32 }} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Display size={24} style={{ letterSpacing: -0.2 }}>
            Chakula
          </Display>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Deliver to ${account.address}`} onPress={() => router.push('/profile')} style={s.place}>
              <Icon name="map-pin" size={14} />
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.forest, flexShrink: 1 }} numberOfLines={1}>
                {account.address.replace(' Hostel', '').replace('Room', 'Rm')}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => router.push('/profile')} style={s.avatar}>
              <Text style={{ color: colors.cream, fontFamily: fonts.semibold, fontSize: 13 }}>{account.initials}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 6 }}>
          <Text style={smallCaps}>
            {greeting(now)}, {account.firstName}
          </Text>
          {usual ? (
            <Display size={30} style={{ letterSpacing: -0.4 }}>
              {mealWord[mealAt(now)]}, <Italic>sorted.</Italic>
            </Display>
          ) : (
            <Display size={34} style={{ lineHeight: 37, letterSpacing: -0.5 }}>
              Something <Italic>special</Italic> tonight?
            </Display>
          )}
        </View>

        {usual && usualKitchen ? (
          <UsualCard
            restaurant={usualKitchen}
            lines={usualLines}
            usualAt={usual.placedAt}
            total={usualTotal}
            now={now}
            busy={!!justOrdered}
            paysWith={paysWith[usualMethod]}
            undoSeconds={UNDO_SECONDS}
            onOrder={orderUsual}
            onChange={changeUsual}
          />
        ) : null}

        <Pressable accessibilityRole="search" accessibilityLabel="Search dishes or kitchens" onPress={() => router.push('/search')} style={s.search}>
          <Icon name="search" size={18} color={colors.sub} />
          <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.sub }}>{usual ? 'Something else? Search dishes' : 'Search dishes or kitchens'}</Text>
        </Pressable>

        {quick.length > 0 ? (
          <>
            <View style={[s.sectionHead, { paddingBottom: 10 }]}>
              <Display size={21}>Ready in 15</Display>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>Quick to cook, close by</Text>
            </View>
            <QuickDishRow
              dishes={quick}
              quantityOf={(d) => (cart.restaurantId === d.restaurant.id ? cart.quantityOf(d.item.id) : 0)}
              onAdd={(d) => addDish(d.restaurant, d.item)}
              onRemove={(d) => cart.remove(d.item.id)}
              onOpen={(d) => router.push(`/restaurant/${d.restaurant.id}`)}
            />
          </>
        ) : null}

        {pickKitchen && pickItem ? (
          <View style={{ paddingTop: 16 }}>
            <ChefsPick
              restaurant={pickKitchen}
              item={pickItem}
              freeDeliveries={student.freeDeliveriesLeft}
              onOpen={() => router.push(`/restaurant/${pickKitchen.id}`)}
              onAdd={() => addDish(pickKitchen, pickItem)}
            />
          </View>
        ) : null}

        <View style={{ paddingTop: 18 }}>
          <CategoryChips categories={foodCategories} selected={category} onSelect={setCategory} />
        </View>

        <View style={s.sectionHead}>
          <Display size={21}>{category ? `${foodCategories.find((c) => c.id === category)?.label} tonight` : 'Popular tonight'}</Display>
          <Pressable accessibilityRole="link" hitSlop={10} onPress={() => router.push('/kitchens')}>
            <Text style={[smallCaps, { color: colors.forest }]}>See all</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
          {popular.map(({ restaurant, item }) => (
            <DishCard key={`${restaurant.id}-${item.id}`} name={item.name} price={item.price} tint={item.tint} onPress={() => router.push(`/restaurant/${restaurant.id}`)} />
          ))}
        </ScrollView>

        <View style={s.sectionHead}>
          <Display size={21}>This week’s specials</Display>
          <Pressable accessibilityRole="link" hitSlop={10} onPress={() => router.push('/specials')}>
            <Text style={[smallCaps, { color: colors.forest }]}>See all</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${special.name}, ${special.day}. Pre-order`}
          onPress={() => router.push('/specials')}
          style={({ pressed }) => [ui.card, s.special, { opacity: pressed ? 0.92 : 1 }]}
        >
          <FoodImage tint={special.tint} size={28} style={{ width: 64, height: 64, borderRadius: 14 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.orangeText }}>This {special.day}</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{special.name}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{special.vendor} · order ahead</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.chevron} />
        </Pressable>
      </ScrollView>

      {justOrdered ? (
        <UndoBar summary={justOrdered.summary} seconds={UNDO_SECONDS} onUndo={undo} />
      ) : showBasket ? (
        <View style={s.basket}>
          <BasketBar count={cart.count} total={formatUGX(cart.subtotal)} onPress={() => router.push('/checkout')} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  place: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  search: {
    marginHorizontal: 20,
    marginTop: 14,
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.lineSoft,
    borderRadius: 14,
  },
  sectionHead: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  basket: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  special: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: 18 },
});
