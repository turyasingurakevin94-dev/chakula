import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Line, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Body, Display, Icon, Label } from '../../components/ui';
import { clock, useKitchen, type Order } from '../../lib/kitchen';
import { onServer } from '../../lib/server';
import { colors, fonts } from '../../lib/theme';

const LOCKED = 401_400;
const CASH = 36_000;
const PAID = [
  { day: 'Tue 13 Oct', at: '10:02 pm', ref: '58214739', orders: 61, amount: 882_500 },
  { day: 'Mon 12 Oct', at: '10:01 pm', ref: '58196204', orders: 74, amount: 1_091_000 },
];
const n = (v: number) => v.toLocaleString('en-US');
const mint = '#CFE0D3';

function Glyph({ d, size = 20, color = colors.forest, width = 2 }: { d: string[]; size?: number; color?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {d.map((p) => (
        <Path key={p} d={p} />
      ))}
    </Svg>
  );
}

// Banknote texture: fine diagonal lines and a soft light in the top corner.
function Texture() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="lines" width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Line x1={0} y1={0} x2={0} y2={7} stroke={colors.cream} strokeOpacity={0.035} strokeWidth={2} />
        </Pattern>
        <RadialGradient id="glow" cx="100%" cy="0%" r="70%">
          <Stop offset="0" stopColor={colors.cream} stopOpacity={0.1} />
          <Stop offset="1" stopColor={colors.cream} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#lines)" />
      <Rect width="100%" height="100%" fill="url(#glow)" />
    </Svg>
  );
}

function Hatch() {
  return (
    <Svg width="100%" height={10}>
      <Defs>
        <Pattern id="hatch" width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Line x1={0} y1={0} x2={0} y2={5} stroke={colors.cream} strokeWidth={4} />
        </Pattern>
      </Defs>
      <Rect width="100%" height={10} fill="url(#hatch)" />
    </Svg>
  );
}

export default function Money() {
  return onServer ? <ServerMoney /> : <SampleMoney />;
}

// On the server: real figures from the orders the board already has (this kitchen's last 24 hours),
// counted from midnight. Food sales are the dishes and extras; delivery fees aren't the kitchen's.
// Payouts aren't on the server yet, so no account, guarantee or history is shown.
const IN_PROGRESS: Order['status'][] = ['cooking', 'ready', 'picked'];

function ServerMoney() {
  const k = useKitchen();
  const midnight = new Date(k.now);
  midnight.setHours(0, 0, 0, 0);
  const today = k.orders.filter((o) => o.sale && o.inAt >= midnight.getTime());
  const delivered = today.filter((o) => o.status === 'delivered');
  const going = today.filter((o) => IN_PROGRESS.includes(o.status));
  const food = (list: Order[]) => list.reduce((sum, o) => sum + (o.sale?.subtotal ?? 0), 0);
  const sales = food(delivered);
  const cash = delivered.filter((o) => o.sale?.payMethod === 'cash');
  const momo = delivered.filter((o) => o.sale?.payMethod !== 'cash');
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 22, gap: 2 }}>
          <Label>{k.kitchenName}</Label>
          <Display>Money</Display>
        </View>

        <View style={[s.card, { marginTop: 16, padding: 18, gap: 14 }]} accessibilityLabel={`Food sales today: UGX ${n(sales)} from ${plural(delivered.length, 'delivered order')}`}>
          <View style={{ gap: 4 }}>
            <Label>Food sales today</Label>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.muted }}>UGX</Text>
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: 42, lineHeight: 46, letterSpacing: -0.4, color: colors.forest }}>{n(sales)}</Text>
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.segmentText }}>
              From {plural(delivered.length, 'delivered order')}
              {delivered.length ? ` · last at ${clock(Math.max(...delivered.map((o) => o.deliveredAt ?? o.inAt)))}` : ''}
            </Text>
          </View>
          {sales > 0 ? (
            <View style={s.split} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {food(momo) > 0 ? <View style={{ flex: food(momo), backgroundColor: colors.forest }} /> : null}
              {food(cash) > 0 ? <View style={{ flex: food(cash), backgroundColor: colors.orange }} /> : null}
            </View>
          ) : null}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.lineSoft }}>
            <SplitRow color={colors.forest} title="Mobile money" sub={plural(momo.length, 'order')} amount={food(momo)} />
            <SplitRow color={colors.orange} title="Cash on delivery" sub={cash.length ? `${plural(cash.length, 'order')} · riders collect it` : plural(0, 'order')} amount={food(cash)} last />
          </View>
        </View>

        <View style={[s.card, { marginTop: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <View style={s.iconWell}>
            <Icon name="clock" size={18} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.rowTitle}>{going.length ? `${plural(going.length, 'order')} still in progress` : 'Nothing in progress'}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.segmentText }}>
              {going.length ? 'Cooking, ready or with a rider. They count once delivered.' : 'Orders count here once they’re delivered.'}
            </Text>
          </View>
          {going.length ? <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.muted }}>{n(food(going))}</Text> : null}
        </View>

        <Body style={{ color: colors.muted, paddingTop: 18, paddingHorizontal: 4, fontSize: 13, lineHeight: 19 }}>
          What students paid for the food on orders placed since midnight; delivery fees aren’t included. Payouts to your kitchen are set up with Chakula directly.
        </Body>
      </ScrollView>
    </SafeAreaView>
  );
}

function SplitRow({ color, title, sub, amount, last }: { color: string; title: string; sub: string; amount: number; last?: boolean }) {
  return (
    <View style={[s.paidRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.lineSoft }]}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>{title}</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{sub}</Text>
      </View>
      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{n(amount)}</Text>
    </View>
  );
}

// Sample figures from the design. The payout guarantee and timing still need Kevin's sign-off.
function SampleMoney() {
  const k = useKitchen();
  const payout = new Date(k.now);
  payout.setHours(22, 0, 0, 0);
  const hours = Math.max(0, Math.round((payout.getTime() - k.now) / 3_600_000));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 22, gap: 2 }}>
          <Label>Nakawa Kitchen</Label>
          <Display>Money</Display>
        </View>

        <View style={[s.note, { marginTop: 16 }]}>
          <Texture />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ gap: 6 }}>
              <Text style={s.noteLabel}>{"Tonight's payout"}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: mint }}>UGX</Text>
                <Text style={{ fontFamily: fonts.displayMedium, fontSize: 42, lineHeight: 46, letterSpacing: -0.4, color: colors.cream }}>{n(LOCKED + CASH)}</Text>
              </View>
            </View>
            <View style={s.seal} accessibilityRole="image" accessibilityLabel="Guaranteed">
              <Glyph d={['M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z', 'M8.5 12l2.5 2.5 4.5-5']} size={22} color={colors.cream} />
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <View style={s.bar}>
              <View style={{ flex: LOCKED, backgroundColor: colors.cream }} />
              <View style={{ flex: CASH }}>
                <Hatch />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={s.noteStrong}>{n(LOCKED)} locked in</Text>
                <Text style={s.noteMeta}>{"Delivered, can't be reversed"}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.noteStrong}>{n(CASH)} on the way</Text>
                <Text style={s.noteMeta}>Cash with 3 riders</Text>
              </View>
            </View>
          </View>
          <View style={s.guarantee}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.cream }}>Guaranteed by 10:00 pm</Text>
              <Text style={s.noteMeta}>To MTN MoMo ••• 418, in one transfer</Text>
            </View>
            <Text style={{ fontFamily: fonts.displayItalic, fontSize: 15, color: mint }}>{hours > 0 ? `in ${hours} h` : 'tonight'}</Text>
          </View>
        </View>

        <View style={[s.card, { marginTop: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }]}>
          <View style={s.iconWell}>
            <Glyph d={['M8 11V7a4 4 0 0 1 8 0v4', 'M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z']} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.rowTitle}>MTN MoMo ••• 418</Text>
              <View style={s.verified}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.forest }}>Verified</Text>
              </View>
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.segmentText }}>Registered to Nakawa Kitchen. Changing it needs your PIN and waits 24 hours, so nobody can redirect your money.</Text>
          </View>
        </View>

        <View style={{ paddingTop: 18, gap: 10 }}>
          <Label>Paid to you</Label>
          <View style={[s.card, { paddingHorizontal: 14, paddingVertical: 2 }]}>
            {PAID.map((p, i) => (
              <View key={p.ref} style={[s.paidRow, i < PAID.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.lineSoft }]}>
                <View style={s.tick}>
                  <Glyph d={['M5 12l5 5 9-10']} size={14} color={colors.cream} width={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>
                    {p.day} · received {p.at}
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>
                    MoMo ref {p.ref} · {p.orders} orders
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{n(p.amount)}</Text>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => k.notify('Statement sent to your email')} style={s.statement}>
            <Glyph d={['M12 4v11M7 10l5 5 5-5', 'M5 20h14']} size={18} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>Statement for your accountant</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  note: { borderRadius: 24, padding: 20, gap: 16, backgroundColor: colors.forest, overflow: 'hidden', shadowColor: colors.forest, shadowOpacity: 0.28, shadowRadius: 32, shadowOffset: { width: 0, height: 16 }, elevation: 10 },
  noteLabel: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: mint },
  noteStrong: { fontFamily: fonts.bold, fontSize: 13, color: colors.cream },
  noteMeta: { fontFamily: fonts.regular, fontSize: 13, color: mint },
  seal: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: mint, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#2F5E48' },
  guarantee: { borderTopWidth: 1, borderTopColor: '#2F5E48', paddingTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18 },
  iconWell: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.lineSoft, alignItems: 'center', justifyContent: 'center' },
  verified: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#E3F1E8' },
  rowTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  tick: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  split: { height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', backgroundColor: colors.lineSoft },
  statement: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.toggleOff, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
