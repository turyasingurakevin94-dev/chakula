import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader, FoodImage, Icon, Label, styles as ui } from '../components/ui';
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
      <BackHeader title="Specials" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        <View style={s.hero}>
          <FoodImage tint={special.tint} photo={special.photo} size={72} style={s.heroTop}>
            <Text style={[s.badge, s.day]}>This {special.day}</Text>
            <Text style={[s.badge, s.left]}>
              {left} of {special.capacity} left
            </Text>
          </FoodImage>
          <View style={{ padding: 18, paddingTop: 16, gap: 12 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: fonts.displayLight, fontSize: 24, lineHeight: 28, color: colors.cream }}>{special.name}</Text>
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
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {special.slots.map((t) => {
                    const on = t === slot;
                    return (
                      <Pressable key={t} accessibilityRole="radio" accessibilityLabel={`Deliver ${special.day} at ${t}`} accessibilityState={{ checked: on }} onPress={() => setSlot(t)} style={[s.slot, on && { backgroundColor: colors.highlight, borderColor: colors.cream }]}>
                        <Text style={{ fontFamily: on ? fonts.bold : fonts.medium, fontSize: 13, color: on ? colors.forest : colors.cream }}>{t}</Text>
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
              <FoodImage tint={x.tint} photo={x.photo} size={30} style={s.thumb} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.orangeText }}>{x.day}</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{x.name}</Text>
                <Text style={s.meta}>
                  {x.vendor} · {formatUGX(x.price)}
                </Text>
              </View>
              {account.preorders.some((p) => p.specialId === x.id) ? <Icon name="check-circle" size={18} /> : <Icon name="chevron-right" size={18} color={colors.chevron} />}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero: { marginHorizontal: 20, marginTop: 16, borderRadius: 24, backgroundColor: colors.forest, overflow: 'hidden' },
  heroTop: { height: 170 },
  badge: { position: 'absolute', top: 14, fontFamily: fonts.bold, fontSize: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, overflow: 'hidden' },
  day: { left: 14, color: colors.cream, backgroundColor: colors.forest },
  left: { right: 14, color: colors.forest, backgroundColor: colors.cream },
  slot: { flex: 1, height: 40, borderRadius: 12, borderWidth: 2, borderColor: colors.forestMid, backgroundColor: colors.forestMid, alignItems: 'center', justifyContent: 'center' },
  cta: { height: 52, borderRadius: 16, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  booked: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.sage },
  section: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18 },
  thumb: { width: 72, height: 72, borderRadius: 14 },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  meta14: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
