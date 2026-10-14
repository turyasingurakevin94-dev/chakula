import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { BackHeader, Icon, Label, PrimaryButton, styles as ui, type IconName } from '../components/ui';
import { bonusFor, topUpBonuses, useAccount } from '../lib/account';
import { colors, fonts, formatUGX, smallCaps } from '../lib/theme';

type Mode = 'topup' | 'withdraw' | 'activity';

const withdrawAmounts = [5000, 10000, 20000];

// Only perks that are true today. The board's fingerprint perk waits until fingerprint approval exists.
const perks: { icon: IconName; title: string; detail: string }[] = [
  { icon: 'truck', title: 'Free delivery on wallet orders', detail: 'Every order you pay from your wallet' },
  { icon: 'zap', title: 'Pay in one tap', detail: 'No phone prompt to wait for at checkout' },
  { icon: 'refresh-cw', title: 'Withdraw to MTN anytime', detail: 'It’s your money. No fee, no questions' },
];

export default function Wallet() {
  const account = useAccount();
  const [mode, setMode] = useState<Mode>('topup');
  const [hidden, setHidden] = useState(false);
  const [amount, setAmount] = useState(50000);
  const [take, setTake] = useState(5000);
  const [notice, setNotice] = useState<string | null>(null);
  const bonus = bonusFor(amount);
  const momo = `MTN ${account.maskedPhone.slice(-7)}`;
  const takeAll = take === -1 ? account.balance : take;

  const topUp = () => {
    const got = account.topUp(amount);
    setNotice(`${formatUGX(amount + got)} added${got ? `, including a ${got.toLocaleString('en-US')} bonus` : ''}.`);
  };

  const withdraw = () => {
    if (takeAll <= 0 || takeAll > account.balance) return;
    account.withdraw(takeAll);
    setNotice(`${formatUGX(takeAll)} sent to ${momo}. It usually lands in a minute.`);
    setTake(5000);
  };

  const switchTo = (m: Mode) => {
    setNotice(null);
    setMode((cur) => (cur === m ? 'topup' : m));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <BackHeader title="Wallet" />

      <ScrollView contentContainerStyle={{ paddingBottom: mode === 'activity' ? 32 : 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View style={s.card}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
                <Defs>
                  <LinearGradient id="wallet-card" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset={0} stopColor={colors.forestMid} />
                    <Stop offset={0.45} stopColor={colors.forest} />
                    <Stop offset={1} stopColor={colors.forestDeep} />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="10" height="10" fill="url(#wallet-card)" />
              </Svg>
            </View>
            <Svg width={350} height={200} viewBox="0 0 350 200" style={{ position: 'absolute', right: -60, top: -30, opacity: 0.16 }} fill="none" stroke={colors.cream} strokeWidth={1}>
              {[40, 70, 100, 130].map((r) => (
                <Circle key={r} cx={260} cy={70} r={r} />
              ))}
            </Svg>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.displayItalic, fontSize: 18, color: colors.cream }}>Chakula</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.mint} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" />
                  <Path d="m9 12 2 2 4-4" />
                </Svg>
                <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: colors.mint }}>Protected</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
              hitSlop={10}
              onPress={() => setHidden((h) => !h)}
              style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
            >
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.mint }}>Your balance</Text>
              <Icon name={hidden ? 'eye-off' : 'eye'} size={15} color={colors.mint} />
            </Pressable>
            <Text style={s.balance} accessibilityLabel={hidden ? 'Balance hidden' : `Balance ${formatUGX(account.balance)}`}>
              {hidden ? 'UGX ••••••' : formatUGX(account.balance)}
            </Text>
            <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mint, flexShrink: 1 }} numberOfLines={1}>
                {account.name}
              </Text>
              {account.bonusEarned > 0 ? <Text style={s.bonusChip}>+ {account.bonusEarned.toLocaleString('en-US')} bonus earned</Text> : null}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', gap: 10 }}>
          <ModeButton icon="arrow-up" label="Withdraw" on={mode === 'withdraw'} onPress={() => switchTo('withdraw')} />
          <ModeButton icon="file-text" label="Activity" on={mode === 'activity'} onPress={() => switchTo('activity')} />
        </View>

        {notice ? (
          <View style={s.notice} accessibilityLiveRegion="polite">
            <Icon name="check-circle" size={18} />
            <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.forest }}>{notice}</Text>
          </View>
        ) : null}

        {mode === 'topup' ? (
          <>
            <View style={s.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Label>Top up more, get more</Label>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>from {momo}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {topUpBonuses.map((t) => {
                  const on = t.amount === amount;
                  return (
                    <Pressable
                      key={t.amount}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${formatUGX(t.amount)}, plus ${t.bonus} free`}
                      onPress={() => setAmount(t.amount)}
                      style={[s.tier, on && { backgroundColor: colors.forest, borderColor: colors.forest }]}
                    >
                      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: on ? colors.cream : colors.forest }}>{t.amount.toLocaleString('en-US')}</Text>
                      <Text style={[s.free, on && { backgroundColor: colors.cream, color: colors.forest }]}>+ {t.bonus.toLocaleString('en-US')} free</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={[s.section, { paddingTop: 16 }]}>
              <View style={[ui.card, { overflow: 'hidden' }]}>
                {perks.map((p, i) => (
                  <View key={p.title} style={[s.perk, i < perks.length - 1 && s.divider]}>
                    <View style={s.perkIcon}>
                      <Icon name={p.icon} size={17} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>{p.title}</Text>
                      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{p.detail}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {mode === 'withdraw' ? (
          <View style={s.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Label>Withdraw</Label>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>to {momo} · no fee</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[...withdrawAmounts, -1].map((a) => {
                const value = a === -1 ? account.balance : a;
                const on = a === take;
                const tooMuch = value > account.balance || value <= 0;
                return (
                  <Pressable
                    key={a}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on, disabled: tooMuch }}
                    disabled={tooMuch}
                    onPress={() => setTake(a)}
                    style={[s.tier, { paddingVertical: 14 }, on && { backgroundColor: colors.forest, borderColor: colors.forest }, tooMuch && { opacity: 0.4 }]}
                  >
                    <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: on ? colors.cream : colors.forest }}>{a === -1 ? 'All' : a.toLocaleString('en-US')}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>The money goes to your MTN Mobile Money straight away.</Text>
          </View>
        ) : null}

        {mode === 'activity' ? (
          <View style={[s.section, { gap: 0 }]}>
            <Label style={{ marginBottom: 4 }}>Activity</Label>
            {account.wallet.map((e) => (
              <View key={e.id} style={s.entry}>
                <View style={[s.perkIcon, { backgroundColor: e.amount > 0 ? colors.sage : colors.lineSoft }]}>
                  <Icon name={e.amount > 0 ? 'arrow-down' : 'arrow-up'} size={17} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.forest }}>{e.title}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{e.when}</Text>
                </View>
                <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: e.amount > 0 ? colors.green : colors.ink }}>
                  {e.amount > 0 ? '+ ' : '− '}
                  {Math.abs(e.amount).toLocaleString('en-US')}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {mode === 'topup' ? (
        <View style={s.footer}>
          <PrimaryButton floating label={`Top up ${formatUGX(amount)}, get ${(amount + bonus).toLocaleString('en-US')}`} onPress={topUp}>
            {`Top up ${formatUGX(amount)} · get ${(amount + bonus).toLocaleString('en-US')}`}
          </PrimaryButton>
        </View>
      ) : mode === 'withdraw' ? (
        <View style={s.footer}>
          <PrimaryButton floating disabled={takeAll <= 0 || takeAll > account.balance} label={`Withdraw ${formatUGX(takeAll)} to MTN`} onPress={withdraw}>
            {account.balance <= 0 ? 'Nothing to withdraw' : `Withdraw ${formatUGX(takeAll)} to MTN`}
          </PrimaryButton>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function ModeButton({ icon, label, on, onPress }: { icon: IconName; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress} style={({ pressed }) => [s.mode, on && { backgroundColor: colors.highlight, borderColor: colors.forest }, pressed && { opacity: 0.85 }]}>
      <Icon name={icon} size={17} />
      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 20,
    paddingVertical: 18,
    overflow: 'hidden',
    backgroundColor: colors.forest,
    shadowColor: colors.forestDeep,
    shadowOpacity: 0.28,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  balance: { fontFamily: fonts.displayLight, fontSize: 40, lineHeight: 44, color: colors.cream, letterSpacing: -0.4 },
  bonusChip: { fontFamily: fonts.semibold, fontSize: 12, color: colors.cream, backgroundColor: 'rgba(255,248,240,0.12)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  mode: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  notice: { marginHorizontal: 20, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.sage },
  section: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  tier: { flex: 1, paddingTop: 12, paddingBottom: 10, paddingHorizontal: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', gap: 6 },
  free: { ...smallCaps, letterSpacing: 0, textTransform: 'none', color: colors.green, backgroundColor: colors.sage, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  perkIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, backgroundColor: colors.cream },
});
