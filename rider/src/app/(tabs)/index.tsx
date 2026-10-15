import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Body, Bold, Headline, Italic, Label, Num, TearLine } from '../../components/ui';
import { greeting, KITCHEN, onlineFor, pickupOrder, useNow, useRider, type Run } from '../../lib/rider';
import { onServer } from '../../lib/server';
import { colors, fonts, money } from '../../lib/theme';

// Today: the next run as a boarding-pass ticket, one button, and tonight's money.
export default function Today() {
  const { onlineSince, goOffline, run, stage, stopIndex, drops, pay, cash, riderName } = useRider();
  const now = useNow(30_000);

  const cta =
    !run ? null : stage === 'waiting' || stage === 'pickup' ? (
      <ScanButton
        onPress={() => {
          router.push('/pickup');
        }}
      />
    ) : (
      <Pressable accessibilityRole="button" onPress={() => router.push(stage === 'handover' ? '/drop' : '/route')} style={s.cta}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.cream} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M7 20V10h10M13 6l4 4-4 4" />
        </Svg>
        <Text style={s.ctaText}>Back to riding mode</Text>
      </Pressable>
    );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={s.top}>
          <Text style={s.brand}>
            Chakula <Text style={s.brandTag}>RIDER</Text>
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="You are online. Tap to go offline" onPress={goOffline} style={s.online}>
            <View style={s.onlineHalo}>
              <View style={s.onlineDot} />
            </View>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.forest }}>Online · {onlineFor(onlineSince, now)}</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 12 }}>
          <Headline>
            {greeting()},{'\n'}
            <Italic>{riderName}.</Italic>
          </Headline>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <Stat value="4.9" label="rating" />
            <Stat value="98%" label="on time" />
            <Stat value={String(drops)} label="drops today" />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>{run ? <Ticket run={run} current={stage === 'waiting' || stage === 'pickup' ? -1 : stopIndex} /> : <ShiftDone />}</View>

        {cta ? <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>{cta}</View> : null}

        <View style={s.tiles}>
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/money')} style={s.tile}>
            <Label>Tonight&apos;s pay</Label>
            <Num size={22}>{money(pay)}</Num>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/cash')} style={s.tile}>
            <Label>Cash with you</Label>
            <Num size={22}>{money(cash)}</Num>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 17, color: colors.forest }}>{value}</Text> {label}
    </Text>
  );
}

function Ticket({ run, current }: { run: Run; current: number }) {
  const { stage } = useRider();
  const kicker = stage === 'waiting' ? `Next run · pick up ${run.pickupAt}` : stage === 'pickup' ? `At the hatch · ${run.pickupAt}` : 'On the road';
  return (
    <View style={s.ticketShadow}>
      <View style={s.ticket}>
        <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Label>{kicker}</Label>
            <Num size={28}>{onServer ? pickupOrder(run)[0]!.name : KITCHEN}</Num>
            <Body style={{ fontSize: 13, color: colors.body }}>
              {run.stops.length} sealed bag{run.stops.length === 1 ? '' : 's'} · {run.away}
            </Body>
          </View>
          {run.slot !== undefined ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4, color: colors.muted }}>SLOT</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 56, color: colors.forest }}>{run.slot}</Text>
            </View>
          ) : null}
        </View>
        <TearLine />
        <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 18, gap: 10 }}>
          {run.stops.map((stop, i) => {
            const done = current > i;
            const next = current === -1 ? i === 0 : current === i;
            return (
              <View key={stop.bag} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[s.stopNum, next ? { backgroundColor: colors.forest } : { borderWidth: 1.5, borderColor: colors.forest }, done && { backgroundColor: colors.barDone, borderWidth: 0 }]}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: next ? colors.cream : colors.forest }}>{i + 1}</Text>
                </View>
                <Bold size={14} style={[{ flex: 1, fontFamily: fonts.semibold }, done && { color: colors.muted, textDecorationLine: 'line-through' }]}>
                  {stop.place}
                </Bold>
                <Body style={{ color: colors.muted }}>{stop.eta}</Body>
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
            <Body style={{ fontSize: 13, color: colors.body }}>This run pays</Body>
            <Num size={18}>UGX {money(run.pays)}</Num>
          </View>
        </View>
      </View>
    </View>
  );
}

function ShiftDone() {
  return (
    <View style={[s.ticketShadow]}>
      <View style={[s.ticket, { padding: 20, gap: 6 }]}>
        <Label>No more runs this shift</Label>
        <Num size={26}>That&apos;s lunch done.</Num>
        <Body style={{ color: colors.body }}>Hand in your cash at {KITCHEN} on the way out. Evening meal plans start at 6:30.</Body>
      </View>
    </View>
  );
}

function ScanButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.cta, pressed && { opacity: 0.9 }]}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.cream} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12h8" />
      </Svg>
      <Text style={s.ctaText}>Scanner opens when you reach the hatch</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: fonts.displayItalic, fontSize: 20, color: colors.forest },
  brandTag: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.76, color: colors.muted },
  online: { height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  onlineHalo: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(46,158,91,0.18)', alignItems: 'center', justifyContent: 'center', marginHorizontal: -4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.online },
  ticketShadow: {
    borderRadius: 24,
    backgroundColor: colors.card,
    shadowColor: colors.forest,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  ticket: { borderRadius: 24, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, overflow: 'hidden' },
  stopNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cta: { height: 56, borderRadius: 18, backgroundColor: colors.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 12 },
  ctaText: { fontFamily: fonts.bold, fontSize: 14, color: colors.cream },
  tiles: { paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, paddingHorizontal: 16, gap: 2 },
});
