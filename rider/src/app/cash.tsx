import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BackButton, Body, Label, Num } from '../components/ui';
import { CASH_LIMIT, KITCHEN, useRider } from '../lib/rider';
import { colors, fonts, money } from '../lib/theme';

// Cash you're holding: how close to the limit, the hand-in code the kitchen scans, and receipts.
export default function Cash() {
  const { cash, cashOrders, handIns } = useRider();
  const share = Math.min(1, cash / CASH_LIMIT);
  const from =
    cashOrders.length === 0
      ? 'No cash orders yet today'
      : `From ${cashOrders.length} cash order${cashOrders.length > 1 ? 's' : ''} · ${cashOrders.map((c) => `${c.bag} ${c.student}${cashOrders.length === 1 ? `, ${c.at}` : ''}`).join(', ')}`;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton label="Back to pay" />
        <Label>Cash you&apos;re holding</Label>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 56, color: colors.forest }}>{money(cash)}</Text>
            <Body style={{ color: colors.body }}>{from}</Body>
          </View>
          <View style={{ gap: 8 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(share * 100)}%`, height: 8, borderRadius: 4, backgroundColor: colors.forest }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.small}>Held</Text>
              <Text style={s.small}>Limit {money(CASH_LIMIT)}</Text>
            </View>
          </View>
          <Body style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>At the limit we pause cash orders until you hand in. It keeps you, and the money, safe.</Body>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <View style={s.card}>
            <Label>Hand in by 10:00 pm</Label>
            <View style={s.qr}>
              <Svg width={120} height={120} viewBox="0 0 9 9" accessibilityLabel={`Hand-in code for ${KITCHEN} to scan`}>
                <Path fill={colors.forest} d="M0 0h3v3H0zM6 0h3v3H6zM0 6h3v3H0zM4 0h1v2H4zM4 3h2v1H4zM3 4h1v1H3zM5 5h1v2H5zM7 4h2v1H7zM4 7h1v2H4zM7 6h1v1H7zM8 8h1v1H8zM6 8h1v1H6z" />
                <Path fill="#FFFFFF" d="M1 1h1v1H1zM7 1h1v1H7zM1 7h1v1H1z" />
              </Svg>
            </View>
            <Body style={{ textAlign: 'center', lineHeight: 21 }}>Give the cash to {KITCHEN}. They scan this code, and you both get a receipt.</Body>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Label style={{ paddingBottom: 4 }}>Handed in</Label>
          {handIns.map((h, i) => (
            <View key={h.receipt} style={[s.row, i < handIns.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>
                  {h.day} · {KITCHEN}
                </Text>
                <Text style={s.small}>
                  Received by {h.by} · receipt {h.receipt}
                </Text>
              </View>
              <Num size={17}>{money(h.amount)}</Num>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 14,
    shadowColor: colors.forest,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  qr: { width: 150, height: 150, borderRadius: 18, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
});
