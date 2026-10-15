import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, FoodImage, PrimaryButton, Stars } from '../components/ui';
import { DELIVERY_MINUTES, useAccount } from '../lib/account';
import { findRestaurant } from '../lib/data';
import { onServer } from '../lib/server';
import { riderFor } from '../lib/stages';
import { colors, fonts } from '../lib/theme';

const tips = [0, 500, 1000, 2000];

export default function Rate() {
  const account = useAccount();
  const hasOrder = account.orders.length > 0;
  // On the server, opened straight here (a reload): wait for the orders; with none, go home.
  const loaded = account.ordersLoaded;
  useEffect(() => {
    if (!hasOrder && loaded) router.dismissTo('/');
  }, [hasOrder, loaded]);
  return hasOrder ? <RateOrder /> : null;
}

function RateOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useAccount();
  const order = account.orders.find((o) => o.id === id) ?? account.orders[0]!;
  const restaurant = findRestaurant(order.restaurantId);
  const [stars, setStars] = useState(0);
  const [tip, setTip] = useState(0);
  const first = order.lines[0]?.item;
  // The rider who brought this order: the server's named rider, else "your rider".
  const rider = riderFor(order).name;
  const named = rider !== 'your rider';
  // How long it really took, on the server; the sample orders use the demo's delivery time.
  const placed = order.times?.placed ? Date.parse(order.times.placed) : NaN;
  const delivered = order.times?.delivered ? Date.parse(order.times.delivered) : NaN;
  const tookMinutes = Number.isFinite(placed) && Number.isFinite(delivered) ? Math.max(1, Math.round((delivered - placed) / 60000)) : DELIVERY_MINUTES;

  const send = () => {
    if (!stars) return;
    account.rateOrder(order.id, { stars, tags: [], tip });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingTop: 28, gap: 10 }}>
          <FoodImage tint={first?.tint ?? colors.sand} photo={first?.photo} size={64} style={{ width: 150, height: 150, borderRadius: 75 }} />
          <Display size={28} style={{ marginTop: 8, textAlign: 'center' }}>
            Enjoy your food, {account.firstName}
          </Display>
          <Text style={s.meta14}>
            {first?.name ?? 'Your order'} from {restaurant?.name ?? 'the kitchen'} · {tookMinutes} min
          </Text>
        </View>

        <View style={{ alignItems: 'center', gap: 10, marginTop: 24 }}>
          <Text style={s.question}>How was it?</Text>
          <Stars value={stars} size={40} gap={8} onPick={setStars} />
        </View>

        {/* On the server there are no rider payouts yet, so a tip can't be passed on: none is offered. */}
        {onServer ? null : (
        <View style={{ gap: 10, marginTop: 26 }}>
          <Text style={[s.question, { textAlign: 'center' }]}>{named ? `Tip ${rider}, your rider?` : 'Tip your rider?'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {tips.map((t) => {
              const on = t === tip;
              const tooMuch = t > account.balance;
              return (
                <Pressable
                  key={t}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled: tooMuch }}
                  disabled={tooMuch}
                  onPress={() => setTip(t)}
                  style={[s.tip, on && { backgroundColor: colors.highlight, borderWidth: 2, borderColor: colors.forest }, tooMuch && { opacity: 0.4 }]}
                >
                  <Text style={{ fontFamily: on ? fonts.bold : fonts.semibold, fontSize: 14, color: on ? colors.forest : colors.ink }}>{t === 0 ? 'No tip' : t.toLocaleString('en-US')}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[s.meta12, { textAlign: 'center' }]}>From your wallet. All of it goes to {rider}.</Text>
        </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 4 }}>
        <PrimaryButton floating disabled={!stars} label={stars ? 'Send' : 'Tap a star to rate'} onPress={send}>
          {stars ? 'Send' : 'Tap a star to rate'}
        </PrimaryButton>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ alignSelf: 'center', padding: 14 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.forest, textDecorationLine: 'underline' }}>Skip</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  question: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  tip: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  meta12: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  meta14: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
