import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlacePicker } from '../components/placePicker';
import { BackHeader, Display, FoodImage, Icon, Label, PrimaryButton, styles as ui } from '../components/ui';
import { formatClock, lineOptions, unitPrice, useAccount, type PayMethod } from '../lib/account';
import { priceBasket, useCart } from '../lib/cart';
import { findRestaurant, student } from '../lib/data';
import { onServer } from '../lib/server';
import { colors, fonts, formatUGX } from '../lib/theme';

type Method = { id: PayMethod; name: string; detail?: string; badge: string; badgeBg: string; badgeFg: string };

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
  const { width } = useWindowDimensions();
  const [method, setMethod] = useState<PayMethod>('mtn');
  const [choosingMethod, setChoosingMethod] = useState(false);
  const [choosingPlace, setChoosingPlace] = useState(false);
  // Null means as soon as possible.
  const [slot, setSlot] = useState<number | null>(null);
  const [now] = useState(Date.now);
  // The balance may have changed on another phone or a late top-up.
  const { refreshWallet } = account;
  useEffect(() => {
    if (onServer) refreshWallet();
  }, [refreshWallet]);
  // The server has no scheduled orders yet (a later slot would be sent as "now"), so it offers only Now.
  const slots = onServer ? [] : deliverySlots(now);
  const restaurant = findRestaurant(cart.restaurantId ?? '');
  const minutes = restaurant?.minutes ?? 15;
  const prep = Math.max(0, ...cart.lines.map((l) => l.item.prepMinutes ?? 0));
  const price = priceBasket(cart.restaurantId, cart.lines, method);
  const shortOfFunds = account.balance < price.total;
  // On the server, the wallet's balance is real (and free delivery isn't a wallet perk there).
  const walletDetail = onServer
    ? `Balance ${formatUGX(account.balance)}${shortOfFunds ? ` · ${formatUGX(price.total - account.balance)} short` : ''}`
    : `Balance ${formatUGX(account.balance)}${shortOfFunds ? ' · not enough' : ' · free delivery'}`;
  const methods: Method[] = [
    { id: 'mtn', name: 'MTN Mobile Money', detail: account.maskedPhone, badge: 'MTN', badgeBg: '#FFCB05', badgeFg: colors.forest },
    { id: 'airtel', name: 'Airtel Money', detail: account.maskedPhone, badge: 'airtel', badgeBg: '#E40000', badgeFg: '#FFFFFF' },
    { id: 'wallet', name: 'Chakula Wallet', detail: walletDetail, badge: 'C', badgeBg: colors.forest, badgeFg: colors.cream },
    // The server doesn't take cards yet, so it isn't offered there.
    ...(onServer ? [] : [{ id: 'card', name: 'Debit or credit card', badge: 'card', badgeBg: colors.tile, badgeFg: colors.forest } as Method]),
    { id: 'cash', name: 'Cash on delivery', badge: 'cash', badgeBg: colors.tile, badgeFg: colors.forest },
  ];
  const chosen = methods.find((m) => m.id === method)!;
  // On the server, a wallet that can't cover it turns the button into the way to top up.
  const needsTopUp = onServer && method === 'wallet' && shortOfFunds;
  const blocked = cart.count === 0 || (method === 'wallet' && shortOfFunds && !needsTopUp);
  const when = slot ? formatClock(slot, true) : null;
  const payLabel =
    needsTopUp
      ? `Top up your wallet · ${formatUGX(price.total - account.balance)} short`
      : method === 'wallet' && shortOfFunds
      ? 'Top up your wallet first'
      : method === 'cash'
        ? when
          ? `Schedule for ${when} · pay cash`
          : `Place order · ${formatUGX(price.total)}`
        : when
          ? `Pay and schedule for ${when}`
          : onServer && method === 'wallet'
            ? `Pay ${formatUGX(price.total)} from wallet`
            : `Pay ${formatUGX(price.total)}`;

  const pay = () => {
    if (needsTopUp) {
      router.push('/wallet');
      return;
    }
    if (blocked || !cart.restaurantId) return;
    account.placeOrder({ restaurantId: cart.restaurantId, lines: cart.lines, total: price.total, method, ...(slot ? { scheduledFor: slot } : {}) });
    cart.clear();
    router.replace('/tracking');
  };

  const hint = slot
    ? `The kitchen starts cooking at ${formatClock(slot - (prep + minutes) * 60 * 1000)} so it arrives hot.`
    : `At your door by about ${formatClock(now + minutes * 60 * 1000, true)}.`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <BackHeader title="Checkout" />

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <Label>Your order{restaurant ? ` · ${restaurant.name}` : ''}</Label>
          <View style={[ui.card, { overflow: 'hidden' }]}>
            {cart.lines.map((l, i) => {
              const options = lineOptions(l);
              return (
                <View key={l.key} style={[s.row, i < cart.lines.length - 1 && s.divider]}>
                  <FoodImage tint={l.item.tint} photo={l.item.photo} size={22} style={s.thumb} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.strong}>{l.item.name}</Text>
                    <Text style={s.meta}>
                      {l.quantity} ×{options ? ` · ${options}` : ''}
                    </Text>
                  </View>
                  <Text style={s.value}>{(l.quantity * unitPrice(l)).toLocaleString('en-US')}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <Label>When</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}>
            <WhenChip on={slot === null} title="Now" sub={`about ${minutes} min`} label="As soon as possible" onPress={() => setSlot(null)} />
            {slots.map((sl) => {
              const label = formatClock(sl.time, true);
              return <WhenChip key={sl.time} on={sl.time === slot} title={label} sub={sl.afterClass ? 'after lecture' : undefined} label={sl.afterClass ? `${label}, after lecture` : label} onPress={() => setSlot(sl.time)} />;
            })}
          </ScrollView>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{hint}</Text>
        </View>

        <View style={s.section}>
          <View style={[ui.card, { overflow: 'hidden' }]}>
            <View style={[s.row, s.divider]}>
              <View style={[s.badge, { backgroundColor: colors.tile }]}>
                <Icon name="map-pin" size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.strong}>{account.address.replace(' Hostel', '')}</Text>
                {account.note ? <Text style={s.meta}>{account.note}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Change delivery place" hitSlop={10} onPress={() => setChoosingPlace((x) => !x)}>
                <Text style={s.change}>{choosingPlace ? 'Done' : 'Change'}</Text>
              </Pressable>
            </View>
            {choosingPlace ? (
              <View style={[s.divider, { padding: 14 }]}>
                <PlacePicker
                  value={account.place}
                  width={width - 40 - 28}
                  onChange={(p) => {
                    account.saveProfile(account.name, p, account.room, account.note);
                    setChoosingPlace(false);
                  }}
                />
              </View>
            ) : null}
            <View style={[s.row, choosingMethod && s.divider]}>
              <Badge m={chosen} />
              <View style={{ flex: 1 }}>
                <Text style={s.strong}>{chosen.name}</Text>
                {chosen.detail ? <Text style={[s.meta, method === 'wallet' && shortOfFunds && { color: colors.orangeText }]}>{chosen.detail}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Change payment method" hitSlop={10} onPress={() => setChoosingMethod((x) => !x)}>
                <Text style={s.change}>{choosingMethod ? 'Done' : 'Change'}</Text>
              </Pressable>
            </View>
            {choosingMethod
              ? methods
                  .filter((m) => m.id !== method)
                  .map((m, i, list) => (
                    <Pressable
                      key={m.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: false }}
                      onPress={() => {
                        setMethod(m.id);
                        setChoosingMethod(false);
                      }}
                      style={[s.option, i < list.length - 1 && s.divider]}
                    >
                      <Badge m={m} small />
                      <View style={{ flex: 1 }}>
                        <Text style={s.optionText}>{m.name}</Text>
                        {m.detail ? <Text style={s.meta}>{m.detail}</Text> : null}
                      </View>
                      <Radio on={false} />
                    </Pressable>
                  ))
              : null}
          </View>
        </View>

        <View style={[s.section, { gap: 6, paddingTop: 14 }]}>
          <View style={s.line}>
            <Text style={s.lineLabel}>Food</Text>
            <Text style={s.lineLabel}>{price.subtotal.toLocaleString('en-US')}</Text>
          </View>
          <View style={s.line}>
            <Text style={s.lineLabel}>{onServer ? 'Delivery' : method === 'wallet' ? 'Delivery (wallet orders)' : student.freeDeliveriesLeft > 0 ? `Delivery (${student.freeDeliveriesLeft} free left)` : 'Delivery'}</Text>
            {price.freeDelivery ? <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>Free</Text> : <Text style={s.lineLabel}>{price.deliveryFee.toLocaleString('en-US')}</Text>}
          </View>
          <View style={[s.line, s.total]}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>Total</Text>
            <Display size={22}>{formatUGX(price.total)}</Display>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <View style={s.promise}>
          <Icon name="check" size={14} color={colors.green} />
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.green }}>On time, or your next delivery is free</Text>
        </View>
        <PrimaryButton floating disabled={blocked} label={payLabel} onPress={pay}>
          {payLabel}
        </PrimaryButton>
      </View>
    </SafeAreaView>
  );
}

function WhenChip({ on, title, sub, label, onPress }: { on: boolean; title: string; sub?: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} style={[s.when, on && { backgroundColor: colors.forest, borderColor: colors.forest }]}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: on ? colors.cream : colors.forest }}>{title}</Text>
      {sub ? <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: on ? colors.cream : colors.forest, opacity: 0.8 }}>{sub}</Text> : null}
    </Pressable>
  );
}

function Badge({ m, small }: { m: Method; small?: boolean }) {
  const size = small ? 30 : 36;
  return (
    <View style={[s.badge, { width: size, height: size, backgroundColor: m.badgeBg }]}>
      {m.id === 'card' ? (
        <Icon name="credit-card" size={16} />
      ) : m.id === 'cash' ? (
        <Icon name="dollar-sign" size={16} />
      ) : (
        <Text style={{ fontFamily: m.id === 'wallet' ? fonts.displayItalic : fonts.bold, fontSize: m.id === 'wallet' ? 16 : 10, color: m.badgeFg }}>{m.badge}</Text>
      )}
    </View>
  );
}

function Radio({ on }: { on: boolean }) {
  return <View style={[s.radio, on && { borderColor: colors.forest, borderWidth: 7 }]} />;
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingTop: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: colors.highlight },
  optionText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  thumb: { width: 48, height: 48, borderRadius: 12 },
  badge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  strong: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  value: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  change: { fontFamily: fonts.semibold, fontSize: 14, color: colors.forest, textDecorationLine: 'underline' },
  when: { paddingHorizontal: 12, paddingVertical: 7, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  lineLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  total: { borderTopWidth: 1, borderTopColor: colors.border, borderStyle: 'dashed', paddingTop: 8, marginTop: 2 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, gap: 12, backgroundColor: colors.cream },
  promise: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
