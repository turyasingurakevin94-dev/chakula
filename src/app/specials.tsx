import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, FoodImage, Icon, IconButton, Label, styles as ui } from '../components/ui';
import { useAccount } from '../lib/account';
import { specials } from '../lib/data';
import { colors, fonts, formatUGX } from '../lib/theme';

export default function Specials() {
  const account = useAccount();
  const [selectedId, setSelectedId] = useState(specials[0]!.id);
  const special = specials.find((x) => x.id === selectedId) ?? specials[0]!;
  const [slot, setSlot] = useState(special.slots[1] ?? special.slots[0]!);
  const booked = account.preorders.find((p) => p.specialId === special.id);
  const left = account.portionsLeft(special.id);
  const others = specials.filter((x) => x.id !== special.id);

  const pick = (id: string) => {
    const next = specials.find((x) => x.id === id)!;
    setSelectedId(id);
    setSlot(next.slots[1] ?? next.slots[0]!);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={s.header}>
        <IconButton icon="chevron-left" label="Back" variant="outline" style={{ backgroundColor: colors.card }} onPress={() => router.back()} />
        <Display size={26}>Specials</Display>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.meta14, { paddingLeft: 68, paddingRight: 20 }]}>Dishes from cooks beyond campus, once a week. Order ahead.</Text>

        <View style={s.hero}>
          <View style={s.heroTop}>
            <Text style={s.day}>This {special.day}</Text>
            <Text style={s.left}>
              {left} of {special.capacity} left
            </Text>
            <FoodImage tint="transparent" size={56} style={{ position: 'absolute', left: 0, right: 0, top: 30, bottom: 0 }} />
          </View>
          <View style={{ padding: 18, paddingTop: 16, gap: 12 }}>
            <View style={{ gap: 4 }}>
              <Display size={26} style={{ color: colors.cream }}>
                {special.name}
              </Display>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: '#CFE0D3' }}>
                From {special.vendor} · {special.description}
              </Text>
            </View>

            {booked ? (
              <View style={s.booked}>
                <Icon name="check-circle" size={20} color={colors.forest} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>
                    Pre-ordered for {special.day}, {booked.slot}
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>It is in your Orders tab. Pay when it arrives.</Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={s.overline}>Deliver {special.day} at</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {special.slots.map((t) => {
                    const on = t === slot;
                    return (
                      <Pressable key={t} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setSlot(t)} style={[s.slot, on && { backgroundColor: '#FFF4EC', borderColor: colors.orange }]}>
                        <Text style={{ fontFamily: on ? fonts.bold : fonts.medium, fontSize: 14, color: colors.forest }}>{t}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={left === 0}
                  onPress={() => account.preorder(special.id, slot)}
                  style={({ pressed }) => [s.cta, { opacity: left === 0 ? 0.5 : pressed ? 0.9 : 1 }]}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>{left === 0 ? 'Sold out this week' : `Pre-order · ${formatUGX(special.price)}`}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        <View style={s.section}>
          <Label>Coming up</Label>
          {others.map((x) => (
            <Pressable key={x.id} accessibilityRole="button" accessibilityLabel={`${x.name}, ${x.day}`} onPress={() => pick(x.id)} style={({ pressed }) => [ui.card, s.row, { opacity: pressed ? 0.92 : 1 }]}>
              <FoodImage tint={x.tint} size={26} style={s.thumb} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.orangeText }}>{x.day}</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>{x.name}</Text>
                <Text style={s.meta}>
                  {x.vendor} · {formatUGX(x.price)}
                </Text>
              </View>
              {account.preorders.some((p) => p.specialId === x.id) ? <Icon name="check-circle" size={18} /> : <Icon name="chevron-right" size={18} color="#B5AA9A" />}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  hero: { marginHorizontal: 20, marginTop: 16, borderRadius: 24, backgroundColor: colors.forest, overflow: 'hidden' },
  heroTop: { height: 128, backgroundColor: '#24573F', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  day: { zIndex: 1, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.forest, backgroundColor: colors.orange, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  left: { zIndex: 1, fontFamily: fonts.bold, fontSize: 12, color: colors.forest, backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  overline: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#CFE0D3' },
  slot: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: colors.card, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  cta: { height: 52, borderRadius: 16, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  booked: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.sage },
  section: { paddingHorizontal: 20, paddingTop: 22, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 20 },
  thumb: { width: 60, height: 60, borderRadius: 14 },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  meta14: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
