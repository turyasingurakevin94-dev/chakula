import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Bold, Headline, Italic, Label, Num } from '../../components/ui';
import { KITCHEN, today, useRider } from '../../lib/rider';
import { colors, fonts, money } from '../../lib/theme';

// Shift: today's drops as a timeline, from the lunch rush to Friday's special.
export default function Shift() {
  const { run, nextRun } = useRider();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 4 }}>
          <Label>{today()} · Nakawa campus</Label>
          <Headline>
            Today&apos;s <Italic>drops</Italic>
          </Headline>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Row time="11:45" timeColor={colors.muted} lineDone>
            <Bold color={colors.muted}>Lunch orders · 11 drops</Bold>
            <Body style={s.sub}>Done · all on time · 3 tips</Body>
          </Row>

          {run ? (
            <Row time="Now" timeColor={colors.orangeText}>
              <Pressable accessibilityRole="button" onPress={() => router.navigate('/')} style={s.now}>
                <Bold>{run.title}</Bold>
                <Body style={s.sub}>
                  {run.stops.length} bags · slot {run.slot} · pays {money(run.pays)}
                </Body>
              </Pressable>
            </Row>
          ) : null}

          {nextRun ? (
            <Row time={nextRun.plannedAt}>
              <View style={s.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <Num size={19}>{nextRun.title}</Num>
                  <Bold size={13}>{nextRun.stops.length} bags</Bold>
                </View>
                <Body style={s.body}>Ready {nextRun.pickupAt} · one loop: {nextRun.stops.map((x) => x.place.split(',')[0]).join(', ')}</Body>
                <Body style={s.body}>Students picked this time, so they&apos;re waiting at the door. Pays {money(nextRun.pays)}.</Body>
              </View>
            </Row>
          ) : null}

          <Row time="2:30">
            <Bold>Lunch shift ends</Bold>
            <Body style={s.sub}>Hand in cash at {KITCHEN} on the way out</Body>
          </Row>

          <Row time="6:30">
            <Bold>Evening shift · meal plans</Bold>
            <Body style={s.sub}>9 bags · leave the kitchen 6:15 · Blocks A to C</Body>
          </Row>

          <Row time="Fri" last>
            <Bold>Weekly special · Luwombo</Bold>
            <Body style={s.sub}>40 pre-orders so far · you&apos;re on it</Body>
          </Row>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ time, timeColor = colors.forest, lineDone, last, children }: { time: string; timeColor?: string; lineDone?: boolean; last?: boolean; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 16 }}>
      <View style={{ width: 46, alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: timeColor }}>{time}</Text>
        {last ? null : <View style={{ flex: 1, width: 2, marginTop: 6, backgroundColor: lineDone ? colors.forest : colors.line }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 18, gap: 2 }}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  sub: { fontSize: 13, lineHeight: 18, color: colors.muted },
  body: { fontSize: 13, lineHeight: 18, color: colors.body },
  now: { borderRadius: 18, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.orange, paddingVertical: 13, paddingHorizontal: 15, gap: 3 },
  card: {
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
    shadowColor: colors.forest,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
});
