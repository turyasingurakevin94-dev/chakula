import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Display, Icon, Label } from '../../components/ui';
import { useKitchen } from '../../lib/kitchen';
import { colors, fonts } from '../../lib/theme';

const LOCKED = 401_400;
const CASH = 36_000;
const PAID = [
  { day: 'Tue 13 Oct', at: '10:02 pm', ref: '58214739', orders: 61, amount: 882_500 },
  { day: 'Mon 12 Oct', at: '10:01 pm', ref: '58196204', orders: 74, amount: 1_091_000 },
];
const n = (v: number) => v.toLocaleString('en-US');

// Sample figures from the design. The payout guarantee and timing still need Kevin's sign-off.
export default function Money() {
  const k = useKitchen();
  const payout = new Date(k.now);
  payout.setHours(22, 0, 0, 0);
  const hours = Math.max(0, Math.round((payout.getTime() - k.now) / 3_600_000));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 18, gap: 2 }}>
          <Label style={{ color: colors.muted }}>Nakawa Kitchen</Label>
          <Display>Money</Display>
        </View>

        <Card style={{ gap: 14, padding: 18 }}>
          <Label>Tonight’s payout</Label>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.muted }}>UGX</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 50, color: colors.forest }}>{n(LOCKED + CASH)}</Text>
          </View>
          <View style={s.split}>
            <View style={[s.splitBar, { flex: LOCKED, backgroundColor: colors.forest }]} />
            <View style={[s.splitBar, { flex: CASH, backgroundColor: colors.orange }]} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Legend color={colors.forest} title={`${n(LOCKED)} locked in`} sub="Delivered, can't be reversed" />
            <Legend color={colors.orange} title={`${n(CASH)} on the way`} sub="Cash with 3 riders" />
          </View>
          <View style={s.guarantee}>
            <Icon name="shield" size={20} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.rowTitle}>Guaranteed by 10:00 pm</Text>
              <Text style={s.meta}>To MTN MoMo ••• 418, in one transfer</Text>
            </View>
            <Text style={[s.rowTitle, { color: colors.orangeText }]}>{hours > 0 ? `in ${hours} h` : 'tonight'}</Text>
          </View>
        </Card>

        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[s.rowTitle, { flex: 1 }]}>MTN MoMo ••• 418</Text>
            <View style={s.verified}>
              <Icon name="check" size={14} color={colors.green} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.green }}>Verified</Text>
            </View>
          </View>
          <Text style={s.meta}>Registered to Nakawa Kitchen. Changing it needs your PIN and waits 24 hours, so nobody can redirect your money.</Text>
        </Card>

        <Label>Paid to you</Label>
        <Card style={{ paddingVertical: 4 }}>
          {PAID.map((p, i) => (
            <View key={p.ref} style={[s.paidRow, i < PAID.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.lineSoft }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.rowTitle}>
                  {p.day} · received {p.at}
                </Text>
                <Text style={s.meta}>
                  MoMo ref {p.ref} · {p.orders} orders
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{n(p.amount)}</Text>
            </View>
          ))}
        </Card>

        <Pressable accessibilityRole="button" onPress={() => k.notify('Statement sent to your email')} style={s.statement}>
          <Icon name="file-text" size={18} />
          <Text style={[s.rowTitle, { flex: 1 }]}>Statement for your accountant</Text>
          <Icon name="chevron-right" size={18} color={colors.chevron} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Legend({ color, title, sub }: { color: string; title: string; sub: string }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginTop: 6 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>{title}</Text>
        <Text style={s.meta}>{sub}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  split: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 3 },
  splitBar: { height: 8, borderRadius: 4 },
  guarantee: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.well, borderRadius: 14, padding: 12 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.sage, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  statement: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  rowTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
});
