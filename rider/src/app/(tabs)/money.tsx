import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Body, Headline, Italic, Label, Num } from '../../components/ui';
import { clockTime, PER_DROP, useRider } from '../../lib/rider';
import { onServer } from '../../lib/server';
import { colors, fonts, money } from '../../lib/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Sample pay for the days already ridden this week.
const PAST = [24_000, 38_500, 29_000, 33_000, 26_500, 41_000];
const SCALE = 44_000;

// Money: tonight's pay as a banknote, the week so far and today's tips. On the server: today's
// deliveries only, since pay history, tips and payouts aren't on the server yet.
export default function Money() {
  return onServer ? <ServerMoney /> : <SampleMoney />;
}

function ServerMoney() {
  const { drops, pay, cash, today } = useRider();
  const delivered = today?.orders ?? [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 4 }}>
          <Label>Money</Label>
          <Headline>
            Your <Italic>pay</Italic>
          </Headline>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <View style={s.note}>
            <Svg width={320} height={220} viewBox="0 0 320 220" style={{ position: 'absolute', right: -90, top: -50 }}>
              {[100, 86, 72, 58, 44].map((r) => (
                <Circle key={r} cx={200} cy={110} r={r} fill="none" stroke={colors.lineSoft} />
              ))}
            </Svg>
            <View style={{ gap: 2 }}>
              <Label>Today&apos;s pay · estimate</Label>
              <Text style={{ fontFamily: fonts.display, fontSize: 42, lineHeight: 46, color: colors.forest }}>{money(pay)}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.44, color: colors.muted }}>UGANDA SHILLINGS</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Line label={`${drops} ${drops === 1 ? 'drop' : 'drops'} × ${money(PER_DROP)}`} value={money(drops * PER_DROP)} />
              <Line label="Tips from students" value="None yet" />
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 }}>
              <Body style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>Counted from today&apos;s deliveries. The Chakula team confirms your payout with you.</Body>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 4 }}>
            <Label>Delivered today</Label>
            <Num size={20}>{drops}</Num>
          </View>
          {delivered.length === 0 ? (
            <Body style={{ paddingVertical: 10, fontSize: 14, lineHeight: 20, color: colors.muted }}>
              No deliveries yet today. Each one adds UGX {money(PER_DROP)}.
            </Body>
          ) : (
            delivered.map((o, i) => (
              <View key={o.id} style={[s.tip, i < delivered.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>
                    Bag {o.number} · {o.dropPoint}
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>
                    {o.kitchen} · {clockTime(new Date(o.deliveredAt))} · {o.payMethod === 'cash' ? `cash ${money(o.total)} collected` : 'paid in the app'}
                  </Text>
                </View>
                <Num size={17}>+{money(PER_DROP)}</Num>
              </View>
            ))
          )}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 4 }}>
          <Label>This week</Label>
          <Body style={{ fontSize: 14, lineHeight: 20, color: colors.muted }}>Earlier days show here once pay history is on Chakula.</Body>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Pressable accessibilityRole="link" onPress={() => router.push('/cash')} style={{ paddingVertical: 6, alignSelf: 'flex-start' }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest, textDecorationLine: 'underline' }}>Cash you&apos;re holding: {money(cash)}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SampleMoney() {
  const { drops, tips, tipTotal, pay, cash } = useRider();
  const day = new Date().getDay();
  const week = DAYS.map((_, i) => (i < day ? PAST[i] : i === day ? pay : 0));
  const total = week.reduce((a, b) => a + b, 0);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 4 }}>
          <Label>Money</Label>
          <Headline>
            Your <Italic>pay</Italic>
          </Headline>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <View style={s.note}>
            <Svg width={320} height={220} viewBox="0 0 320 220" style={{ position: 'absolute', right: -90, top: -50 }}>
              {[100, 86, 72, 58, 44].map((r) => (
                <Circle key={r} cx={200} cy={110} r={r} fill="none" stroke={colors.lineSoft} />
              ))}
            </Svg>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ gap: 2 }}>
                <Label>Tonight&apos;s pay</Label>
                <Text style={{ fontFamily: fonts.display, fontSize: 42, lineHeight: 46, color: colors.forest }}>{money(pay)}</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.44, color: colors.muted }}>UGANDA SHILLINGS</Text>
              </View>
              <View style={s.seal}>
                <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={colors.forest} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                  <Path d="M8.5 12l2.5 2.5 4.5-5" />
                </Svg>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Line label={`${drops} drops × ${money(PER_DROP)}`} value={money(drops * PER_DROP)} />
              <Line label="Tips from students" value={money(tipTotal)} />
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.forest }}>Guaranteed by 10:00 pm · MTN MoMo ••• 552</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Label>This week</Label>
            <Num size={20}>{money(total)}</Num>
          </View>
          <View style={{ height: 64, flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            {week.map((v, i) => (
              <View
                key={DAYS[i]}
                style={{
                  flex: 1,
                  borderRadius: 6,
                  height: i > day ? '6%' : `${Math.min(100, Math.max(6, Math.round((v / SCALE) * 100)))}%`,
                  backgroundColor: i === day ? colors.forest : i < day ? colors.barDone : colors.line,
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {DAYS.map((d, i) => (
              <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontFamily: i === day ? fonts.bold : fonts.regular, color: i === day ? colors.forest : colors.muted }}>
                {d}
              </Text>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Label style={{ paddingBottom: 4 }}>Tips today · all yours</Label>
          {tips.map((t, i) => (
            <View key={t.from} style={[s.tip, i < tips.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>
                  {t.from}
                  {t.note ? '' : <Text style={{ fontFamily: fonts.regular, color: colors.muted }}> · 5 stars</Text>}
                </Text>
                {t.note ? <Text style={{ fontFamily: fonts.displayItalic, fontSize: 14, color: colors.body }}>&ldquo;{t.note}&rdquo;</Text> : null}
              </View>
              <Num size={17}>+{money(t.amount)}</Num>
            </View>
          ))}
          <Pressable accessibilityRole="link" onPress={() => router.push('/cash')} style={{ marginTop: 6, paddingVertical: 6, alignSelf: 'flex-start' }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest, textDecorationLine: 'underline' }}>Cash you&apos;re holding: {money(cash)}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Body style={{ color: colors.body }}>{label}</Body>
      <Body style={{ fontFamily: fonts.semibold }}>{value}</Body>
    </View>
  );
}

const s = StyleSheet.create({
  note: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
    shadowColor: colors.forest,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  seal: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
});
