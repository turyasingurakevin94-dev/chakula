import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Display, Icon, Label, PrimaryButton, styles as ui } from '../components/ui';
import { DELIVERY_MINUTES, useAccount } from '../lib/account';
import { findRestaurant } from '../lib/data';
import { colors, fonts } from '../lib/theme';

const riderTags = ['Fast', 'Friendly', 'Food was hot', 'Careful'];
const tips = [0, 500, 1000, 2000];

export default function Rate() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useAccount();
  const order = account.orders.find((o) => o.id === id) ?? account.orders[0]!;
  const restaurant = findRestaurant(order.restaurantId);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tip, setTip] = useState(0);

  const toggle = (t: string) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const send = () => {
    if (!stars) return;
    account.rateOrder(order.id, { stars, tags, tip });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingTop: 24, gap: 6 }}>
          <View style={s.tick}>
            <Icon name="check" size={28} />
          </View>
          <Display size={28} style={{ marginTop: 10, textAlign: 'center' }}>
            Enjoy your food, {account.firstName}
          </Display>
          <Text style={s.meta14}>
            Delivered in {DELIVERY_MINUTES} min · Order #{order.id}
          </Text>
        </View>

        <View style={[ui.card, s.card, { alignItems: 'center', marginTop: 24 }]}>
          <Text style={s.question}>How was the food from {restaurant?.name ?? 'the kitchen'}?</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} ${n === 1 ? 'star' : 'stars'}`} accessibilityState={{ selected: n <= stars }} onPress={() => setStars(n)} style={{ padding: 4 }}>
                <Star filled={n <= stars} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[ui.card, s.card, { marginTop: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={s.avatar}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>BK</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.question}>And Brian, your rider?</Text>
              <Text style={s.meta}>Tap what went well</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {riderTags.map((t) => {
              const on = tags.includes(t);
              return (
                <Pressable key={t} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(t)} style={[s.chip, on && { backgroundColor: colors.forest, borderColor: colors.forest }]}>
                  <Text style={{ fontFamily: on ? fonts.bold : fonts.medium, fontSize: 14, color: on ? colors.cream : colors.ink }}>{t}</Text>
                </Pressable>
              );
            })}
          </View>

          <Label style={{ marginTop: 6 }}>Add a tip for Brian</Label>
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
                  style={[s.tip, on && { backgroundColor: '#FFF4EC', borderWidth: 2, borderColor: colors.forest }, tooMuch && { opacity: 0.4 }]}
                >
                  <Text style={{ fontFamily: on ? fonts.bold : fonts.semibold, fontSize: 14, color: colors.forest }}>{t === 0 ? 'No tip' : t.toLocaleString('en-US')}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={s.meta}>Paid from your wallet. All of it goes to Brian.</Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 4 }}>
        <View style={{ opacity: stars ? 1 : 0.5 }}>
          <PrimaryButton floating={!!stars} label={stars ? 'Send rating' : 'Pick a star rating first'} onPress={send}>
            <Text style={[ui.primaryText, { flex: 1, textAlign: 'center' }]}>{stars ? 'Send rating' : 'Tap a star to rate'}</Text>
          </PrimaryButton>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ alignSelf: 'center', padding: 12 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest, textDecorationLine: 'underline' }}>Skip</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24">
      <Path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill={filled ? colors.orange : '#E6D8C6'} />
    </Svg>
  );
}

const s = StyleSheet.create({
  tick: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 18, gap: 12, borderRadius: 22 },
  question: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  chip: { height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, justifyContent: 'center' },
  tip: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  meta14: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
