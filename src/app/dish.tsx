import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Display, FoodImage, Icon, IconButton, Label, PrimaryButton, styles as ui } from '../components/ui';
import { unitPrice, type Pepper } from '../lib/account';
import { useCart } from '../lib/cart';
import { findRestaurant, type Extra } from '../lib/data';
import { colors, fonts, formatUGX } from '../lib/theme';

const peppers: Pepper[] = ['None', 'Mild', 'Hot'];

// Bottom sheet for choosing extras, pepper and a note before adding a dish.
export default function Dish() {
  const { restaurant: rid, item: itemId } = useLocalSearchParams<{ restaurant: string; item: string }>();
  const restaurant = findRestaurant(rid);
  const item = restaurant?.menu.find((m) => m.id === itemId);
  const cart = useCart();
  const insets = useSafeAreaInsets();
  const [extras, setExtras] = useState<Extra[]>([]);
  const [pepper, setPepper] = useState<Pepper>('Mild');
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);

  if (!restaurant || !item) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.cream }}>
        <Display size={24}>Dish not found</Display>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: fonts.semibold, color: colors.forest }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const toggle = (e: Extra) => setExtras((prev) => (prev.some((x) => x.id === e.id) ? prev.filter((x) => x.id !== e.id) : [...prev, e]));
  const total = quantity * unitPrice({ item, quantity, extras });
  const add = () => {
    cart.add(restaurant.id, item, { extras: (item.extras ?? []).filter((e) => extras.some((x) => x.id === e.id)), pepper: item.pepper ? pepper : undefined, note: note.trim() || undefined }, quantity);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={s.backdrop} />
      <View style={[s.sheet, { marginTop: insets.top + 40 }]}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          <FoodImage tint={item.tint} size={72} style={{ height: 190 }} />
          <IconButton icon="x" label="Close" onPress={() => router.back()} style={{ position: 'absolute', right: 16, top: 16 }} />

          <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <Display size={26} style={{ flex: 1 }}>
                {item.name}
              </Display>
              <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>{formatUGX(item.price)}</Text>
            </View>
            <Text style={s.meta14}>{item.description}</Text>
          </View>

          {item.extras?.length ? (
            <View style={s.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Label>Make it yours</Label>
                <Text style={s.meta}>Optional</Text>
              </View>
              <View style={[ui.card, { borderRadius: 18, overflow: 'hidden' }]}>
                {item.extras.map((e, i) => {
                  const on = extras.some((x) => x.id === e.id);
                  return (
                    <Pressable
                      key={e.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      onPress={() => toggle(e)}
                      style={[s.extra, i < item.extras!.length - 1 && s.divider]}
                    >
                      <View style={[s.check, on && { backgroundColor: colors.forest, borderColor: colors.forest }]}>{on ? <Icon name="check" size={15} color={colors.cream} /> : null}</View>
                      <Text style={{ flex: 1, fontFamily: on ? fonts.bold : fonts.regular, fontSize: 15, color: on ? colors.forest : colors.ink }}>{e.name}</Text>
                      <Text style={s.meta14}>+ {e.price.toLocaleString('en-US')}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {item.pepper ? (
            <View style={s.section}>
              <Label>Pepper</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {peppers.map((p) => {
                  const on = p === pepper;
                  return (
                    <Pressable key={p} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setPepper(p)} style={[s.pepper, on && { backgroundColor: colors.forest, borderColor: colors.forest }]}>
                      <Text style={{ fontFamily: on ? fonts.bold : fonts.medium, fontSize: 14, color: on ? colors.cream : colors.ink }}>{p}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={s.section}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Note for the kitchen, e.g. no onions"
              placeholderTextColor={colors.muted}
              maxLength={80}
              style={[ui.card, s.note]}
            />
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={[ui.card, s.qty]}>
            <Pressable accessibilityRole="button" accessibilityLabel="One less" hitSlop={6} onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={s.qtyHit}>
              <Icon name="minus" size={18} color={quantity > 1 ? colors.forest : colors.line} />
            </Pressable>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest, minWidth: 18, textAlign: 'center' }}>{quantity}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="One more" hitSlop={6} onPress={() => setQuantity((q) => Math.min(20, q + 1))} style={s.qtyHit}>
              <Icon name="plus" size={18} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton floating label={`Add ${quantity} to basket, ${formatUGX(total)}`} onPress={add}>
              <Text style={[ui.primaryText, { flex: 1, textAlign: 'center', fontSize: 16 }]}>Add · {formatUGX(total)}</Text>
            </PrimaryButton>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(27,67,50,0.45)' },
  sheet: { flex: 1, backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  section: { paddingHorizontal: 20, paddingTop: 18, gap: 8 },
  extra: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 50 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#D9CBB8', alignItems: 'center', justifyContent: 'center' },
  pepper: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  note: { height: 48, borderRadius: 14, paddingHorizontal: 16, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.lineSoft, backgroundColor: colors.cream },
  qty: { height: 60, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 6 },
  qtyHit: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  meta14: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
});
