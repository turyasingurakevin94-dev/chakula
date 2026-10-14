import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, Icon, IconButton, Label, PrimaryButton, styles as ui, type IconName } from '../components/ui';
import { formatClock, lineOptions, unitPrice, useAccount, type PayMethod } from '../lib/account';
import { useCart } from '../lib/cart';
import { findRestaurant } from '../lib/data';
import { colors, fonts, formatUGX } from '../lib/theme';

type Method = { id: PayMethod; name: string; detail?: string; icon: IconName };

// Lectures end at five past; food can be waiting when the student walks out.
const lectureEnds: [number, number][] = [
  [10, 5],
  [13, 5],
  [16, 5],
];

type Slot = { time: number; afterClass: boolean };

// The next four half-hour slots at least 30 minutes away, plus today's lecture ends that are coming up.
function deliverySlots(now: number): Slot[] {
  const earliest = now + 30 * 60 * 1000;
  const half = 30 * 60 * 1000;
  const first = Math.ceil(earliest / half) * half;
  const slots: Slot[] = [0, 1, 2, 3].map((i) => ({ time: first + i * half, afterClass: false }));
  for (const [h, m] of lectureEnds) {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    if (d.getTime() >= earliest) slots.push({ time: d.getTime(), afterClass: true });
  }
  return slots.sort((a, b) => a.time - b.time);
}

export default function Checkout() {
  const cart = useCart();
  const account = useAccount();
  const [method, setMethod] = useState<PayMethod>('mtn');
  // As soon as possible unless the student switches to Schedule and picks a slot.
  const [scheduling, setScheduling] = useState(false);
  const [slot, setSlot] = useState<number | null>(null);
  const [now] = useState(Date.now);
  const slots = deliverySlots(now);
  const minutes = findRestaurant(cart.restaurantId ?? '')?.minutes ?? 15;
  const scheduledFor = scheduling ? slot : null;
  const shortOfFunds = account.balance < cart.total;
  const methods: Method[] = [
    { id: 'mtn', name: 'MTN Mobile Money', detail: account.maskedPhone, icon: 'smartphone' },
    { id: 'airtel', name: 'Airtel Money', icon: 'smartphone' },
    { id: 'wallet', name: 'Chakula Wallet', detail: `Balance ${formatUGX(account.balance)}${shortOfFunds ? ' · not enough' : ''}`, icon: 'credit-card' },
    { id: 'card', name: 'Debit or credit card', icon: 'credit-card' },
    { id: 'cash', name: 'Cash on delivery', icon: 'dollar-sign' },
  ];
  const blocked = cart.count === 0 || (method === 'wallet' && shortOfFunds) || (scheduling && slot === null);
  const payLabel =
    method === 'wallet' && shortOfFunds
      ? 'Top up your wallet first'
      : scheduling && slot === null
        ? 'Pick a delivery time'
        : method === 'cash'
          ? `Place order · ${formatUGX(cart.total)}`
          : `Pay ${formatUGX(cart.total)}`;

  const pay = () => {
    if (blocked || !cart.restaurantId) return;
    account.placeOrder({ restaurantId: cart.restaurantId, lines: cart.lines, total: cart.total, method, ...(scheduledFor ? { scheduledFor } : {}) });
    cart.clear();
    router.replace('/tracking');
  };

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
              <Text style={s.strong}>{account.address}</Text>
              {account.note ? <Text style={s.meta}>{account.note}</Text> : null}
            </View>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.forest }}>Change</Text>
          </View>
        </View>

        <View style={s.section}>
          <Label>When</Label>
          <View style={[ui.card, { borderRadius: 18, overflow: 'hidden' }]}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: !scheduling }}
              onPress={() => setScheduling(false)}
              style={[s.row, { backgroundColor: !scheduling ? '#FFF4EC' : colors.card, borderBottomWidth: 1, borderBottomColor: colors.lineSoft }]}
            >
              <View style={[s.iconTile, { width: 36, height: 36, borderRadius: 10, backgroundColor: !scheduling ? colors.forest : colors.lineSoft }]}>
                <Icon name="zap" size={18} color={!scheduling ? colors.cream : colors.forest} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.strong, scheduling && { fontFamily: fonts.semibold, color: colors.ink }]}>As soon as possible</Text>
                <Text style={s.meta}>
                  About {minutes} min · at your door by {formatClock(now + minutes * 60 * 1000)}
                </Text>
              </View>
              <View style={[s.radio, !scheduling && { borderColor: colors.forest }]}>{!scheduling ? <View style={s.radioDot} /> : null}</View>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: scheduling }}
              onPress={() => setScheduling(true)}
              style={[s.row, { backgroundColor: scheduling ? '#FFF4EC' : colors.card }]}
            >
              <View style={[s.iconTile, { width: 36, height: 36, borderRadius: 10, backgroundColor: scheduling ? colors.forest : colors.lineSoft }]}>
                <Icon name="calendar" size={18} color={scheduling ? colors.cream : colors.forest} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.strong, !scheduling && { fontFamily: fonts.semibold, color: colors.ink }]}>Schedule</Text>
                <Text style={s.meta}>{scheduledFor ? `Arrives at ${formatClock(scheduledFor, true)}` : 'Pick a time, e.g. when your lecture ends'}</Text>
              </View>
              <View style={[s.radio, scheduling && { borderColor: colors.forest }]}>{scheduling ? <View style={s.radioDot} /> : null}</View>
            </Pressable>
            {scheduling ? (
              <View style={s.slots}>
                {slots.map((sl) => {
                  const on = sl.time === slot;
                  const label = formatClock(sl.time, true);
                  return (
                    <Pressable
                      key={sl.time}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={sl.afterClass ? `${label}, after lectures` : label}
                      onPress={() => setSlot(sl.time)}
                      style={[s.slot, on && { backgroundColor: colors.forest, borderColor: colors.forest }]}
                    >
                      <Text style={{ fontFamily: on ? fonts.bold : fonts.semibold, fontSize: 14, color: on ? colors.cream : colors.ink }}>{label}</Text>
                      {sl.afterClass ? <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: on ? '#CFE0D3' : colors.muted }}>After lectures</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
          <View style={s.promise}>
            <Icon name="shield" size={14} color={colors.forest} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.forest }}>On time, or your next delivery is free.</Text>
          </View>
        </View>

        <View style={s.section}>
          <Label>Your order</Label>
          <View style={[ui.card, { borderRadius: 18, overflow: 'hidden' }]}>
            {cart.lines.map((l, i) => {
              const options = lineOptions(l);
              return (
                <View key={l.key} style={[s.row, { alignItems: 'flex-start' }, i < cart.lines.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.lineSoft }]}>
                  <Text style={[s.strong, { width: 24 }]}>{l.quantity}×</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.strong, { fontFamily: fonts.semibold }]}>{l.item.name}</Text>
                    {options ? <Text style={s.meta}>{options}</Text> : null}
                  </View>
                  <Text style={s.lineValue}>{(l.quantity * unitPrice(l)).toLocaleString('en-US')}</Text>
                </View>
              );
            })}
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
            {cart.deliveryFee === 0 ? (
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.orangeText }}>Free</Text>
            ) : cart.freeDelivery ? (
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
        <View style={{ opacity: blocked ? 0.5 : 1 }}>
          <PrimaryButton floating={!blocked} label={payLabel} onPress={pay}>
            <Text style={[ui.primaryText, { flex: 1, textAlign: 'center' }]}>{payLabel}</Text>
          </PrimaryButton>
        </View>
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
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2, backgroundColor: '#FFF4EC' },
  slot: { minHeight: 40, minWidth: 92, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  promise: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
});
