import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Display, Icon, Label, styles as ui } from '../../components/ui';
import { useAccount } from '../../lib/account';
import { colors, fonts, formatUGX } from '../../lib/theme';

const amounts = [5000, 10000, 20000];

export default function Wallet() {
  const account = useAccount();
  const [amount, setAmount] = useState(10000);
  const [done, setDone] = useState<number | null>(null);

  const topUp = () => {
    // Prototype: credits straight away. Real top ups wait for the MTN or Airtel payment prompt to clear.
    account.topUp(amount);
    setDone(amount);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Display>Wallet</Display>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <View style={s.balance}>
            <Svg width={160} height={160} style={{ position: 'absolute', right: -40, top: -40 }}>
              <Circle cx={80} cy={80} r={80} fill="#24573F" />
            </Svg>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: '#CFE0D3' }}>Chakula balance</Text>
            <Display size={40} style={{ color: colors.cream, marginTop: 4 }}>
              {formatUGX(account.balance)}
            </Display>
            {!account.hasToppedUp ? <Text style={s.bonus}>+ UGX 2,000 bonus on your first top up</Text> : null}
          </View>
        </View>

        <View style={s.section}>
          <Label>Top up</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {amounts.map((a) => {
              const on = a === amount;
              return (
                <Pressable
                  key={a}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setAmount(a)}
                  style={[s.amount, on && { backgroundColor: '#FFF4EC', borderWidth: 2, borderColor: colors.forest }]}
                >
                  <Text style={{ fontFamily: on ? fonts.bold : fonts.semibold, fontSize: 14, color: colors.forest }}>{a.toLocaleString('en-US')}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={[ui.card, s.method]}>
            <View style={s.tile}>
              <Icon name="smartphone" size={18} color={colors.cream} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.strong}>MTN Mobile Money</Text>
              <Text style={s.meta}>{account.maskedPhone}</Text>
            </View>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.forest, textDecorationLine: 'underline' }}>Change</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={topUp} style={({ pressed }) => [s.button, { opacity: pressed ? 0.9 : 1 }]}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.cream }}>Top up {formatUGX(amount)}</Text>
          </Pressable>
          {done ? (
            <View style={s.done}>
              <Icon name="check-circle" size={18} />
              <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.forest }}>{formatUGX(done)} added to your wallet.</Text>
            </View>
          ) : null}
        </View>

        <View style={[s.section, { gap: 0 }]}>
          <Label style={{ marginBottom: 4 }}>Activity</Label>
          {account.wallet.map((e) => (
            <View key={e.id} style={s.entry}>
              <View style={[s.entryIcon, { backgroundColor: e.amount > 0 ? colors.sage : colors.lineSoft }]}>
                <Icon name={e.amount > 0 ? 'arrow-down' : 'file-text'} size={18} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.strong, { fontFamily: fonts.semibold }]}>{e.title}</Text>
                <Text style={s.meta}>{e.when}</Text>
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: e.amount > 0 ? '#2F6B4A' : colors.ink }}>
                {e.amount > 0 ? '+ ' : '− '}
                {Math.abs(e.amount).toLocaleString('en-US')}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  balance: { backgroundColor: colors.forest, borderRadius: 24, padding: 22, overflow: 'hidden' },
  bonus: {
    alignSelf: 'flex-start',
    marginTop: 14,
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.forest,
    backgroundColor: colors.orange,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  amount: { flex: 1, height: 44, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18 },
  tile: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  button: { height: 54, borderRadius: 16, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.sage },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  entryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  strong: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
