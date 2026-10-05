import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, Icon, IconButton, Label, PrimaryButton, styles as ui, type IconName } from '../components/ui';
import { useCart } from '../lib/cart';
import { student } from '../lib/data';
import { colors, fonts, formatUGX } from '../lib/theme';

type Method = { id: string; name: string; detail?: string; icon: IconName };

const methods: Method[] = [
  { id: 'mtn', name: 'MTN Mobile Money', detail: student.momoNumber, icon: 'smartphone' },
  { id: 'airtel', name: 'Airtel Money', icon: 'smartphone' },
  { id: 'wallet', name: 'Chakula Wallet', detail: `Balance ${formatUGX(student.walletBalance)}`, icon: 'credit-card' },
  { id: 'card', name: 'Debit or credit card', icon: 'credit-card' },
  { id: 'cash', name: 'Cash on delivery', icon: 'dollar-sign' },
];

export default function Checkout() {
  const cart = useCart();
  const [method, setMethod] = useState('mtn');
  const payLabel = method === 'cash' ? `Place order · ${formatUGX(cart.total)}` : `Pay ${formatUGX(cart.total)}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={s.header}>
        <IconButton icon="chevron-left" label="Back" variant="outline" style={{ backgroundColor: colors.card }} onPress={() => router.back()} />
        <Display size={26}>Checkout</Display>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <Label>Deliver to</Label>
          <View style={[ui.card, s.row, { borderRadius: 18 }]}>
            <View style={[s.iconTile, { backgroundColor: colors.sage }]}>
              <Icon name="home" size={20} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.strong}>{student.hostel}</Text>
              <Text style={s.meta}>{student.deliveryNote}</Text>
            </View>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.forest }}>Change</Text>
          </View>
        </View>

        <View style={s.section}>
          <Label>Pay with</Label>
          <View style={[ui.card, { borderRadius: 18, overflow: 'hidden' }]}>
            {methods.map((m, i) => {
              const on = m.id === method;
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setMethod(m.id)}
                  style={[s.row, { backgroundColor: on ? '#FFF4EC' : colors.card }, i < methods.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.lineSoft }]}
                >
                  <View style={[s.iconTile, { width: 36, height: 36, borderRadius: 10, backgroundColor: on ? colors.forest : colors.lineSoft }]}>
                    <Icon name={m.icon} size={18} color={on ? colors.cream : colors.forest} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.strong, !on && { fontFamily: fonts.semibold, color: colors.ink }]}>{m.name}</Text>
                    {m.detail ? <Text style={s.meta}>{m.detail}</Text> : null}
                  </View>
                  <View style={[s.radio, on && { borderColor: colors.forest }]}>{on ? <View style={s.radioDot} /> : null}</View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[s.section, { gap: 10 }]}>
          <View style={s.line}>
            <Text style={s.lineLabel}>Basket · {cart.count} {cart.count === 1 ? 'item' : 'items'}</Text>
            <Text style={s.lineValue}>{formatUGX(cart.subtotal)}</Text>
          </View>
          <View style={s.line}>
            <Text style={s.lineLabel}>Delivery</Text>
            {cart.freeDelivery ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={[s.lineLabel, { textDecorationLine: 'line-through' }]}>{cart.deliveryFee.toLocaleString('en-US')}</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.orangeText }}>Free</Text>
              </View>
            ) : (
              <Text style={s.lineValue}>{formatUGX(cart.deliveryFee)}</Text>
            )}
          </View>
          <View style={[s.line, s.total]}>
            <Text style={[s.strong, { fontSize: 15 }]}>Total</Text>
            <Display size={22}>{formatUGX(cart.total)}</Display>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <PrimaryButton floating label={payLabel} onPress={() => router.replace('/tracking')}>
          <Text style={[ui.primaryText, { flex: 1, textAlign: 'center' }]}>{payLabel}</Text>
        </PrimaryButton>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { paddingHorizontal: 20, paddingTop: 18, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  iconTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  strong: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.forest },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineLabel: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  lineValue: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  total: { borderTopWidth: 1, borderTopColor: '#E2D4C1', borderStyle: 'dashed', paddingTop: 12 },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 24 },
});
