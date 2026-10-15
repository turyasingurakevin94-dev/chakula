import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Bold, Headline, Italic, Label, Num } from '../../components/ui';
import { clockTime, KITCHEN, today, useRider } from '../../lib/rider';
import { onServer } from '../../lib/server';
import { colors, fonts, money } from '../../lib/theme';

// Shift: today's drops as a timeline, from the lunch rush to Friday's special. On the server: the
// real deliveries today and the run in hand; there's no rota on the server yet.
export default function Shift() {
  return onServer ? <ServerShift /> : <SampleShift />;
}

function ServerShift() {
  const { run, today: day, user, signOut } = useRider();
  const delivered = [...(day?.orders ?? [])].reverse();
  const rows = delivered.length + (run ? 1 : 0);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 4 }}>
          <Label>{today()}</Label>
          <Headline>
            Today&apos;s <Italic>drops</Italic>
          </Headline>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          {rows === 0 ? (
            <Body style={{ fontSize: 14, lineHeight: 20, color: colors.muted }}>No drops yet today. We&apos;ll ring you when a run comes in.</Body>
          ) : null}
          {delivered.map((o, i) => (
            <Row key={o.id} time={clockTime(new Date(o.deliveredAt))} timeColor={colors.muted} lineDone last={!run && i === delivered.length - 1}>
              <Bold color={colors.muted}>
                Bag {o.number} · {o.dropPoint}
              </Bold>
              <Body style={s.sub}>
                Delivered · from {o.kitchen} · {o.payMethod === 'cash' ? `cash ${money(o.total)}` : 'paid in the app'}
              </Body>
            </Row>
          ))}
          {run ? (
            <Row time="Now" timeColor={colors.orangeText} last>
              <Pressable accessibilityRole="button" onPress={() => router.navigate('/')} style={s.now}>
                <Bold>{run.title}</Bold>
                <Body style={s.sub}>
                  {run.stops.length === 1 ? '1 bag' : `${run.stops.length} bags`} · pays {money(run.pays)}
                </Body>
              </Pressable>
            </Row>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 4 }}>
          <Label>Shifts</Label>
          <Body style={{ fontSize: 14, lineHeight: 20, color: colors.muted }}>Your shift times and planned runs show here once the rota is on Chakula.</Body>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
          <Label style={{ paddingBottom: 4 }}>Signed in</Label>
          <View style={s.reminder}>
            <View style={{ flex: 1, gap: 2 }}>
              <Bold size={14}>{user?.name ?? 'Rider'}</Bold>
              <Body style={s.sub}>{user?.phone ?? ''}</Body>
            </View>
            <Pressable accessibilityRole="button" onPress={signOut} hitSlop={6}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.forest, textDecorationLine: 'underline' }}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SampleShift() {
  const { run, nextRun, reminders, previewReminder } = useRider();

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
                  {run.stops.length} bags{run.slot !== undefined ? ` · slot ${run.slot}` : ''} · pays {money(run.pays)}
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
            <Body style={s.sub}>9 bags · leave the kitchen 6:15 · Kiswa hostels and campus</Body>
          </Row>

          <Row time="Fri" last>
            <Bold>Weekly special · Luwombo</Bold>
            <Body style={s.sub}>40 pre-orders so far · you&apos;re on it</Body>
          </Row>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
          <Label style={{ paddingBottom: 4 }}>Reminders</Label>
          {reminders.map((r, i) => (
            <View key={r.id} style={[s.reminder, i < reminders.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Bold size={14}>{r.title}</Bold>
                <Body style={s.sub}>{r.on ? `${sameDay(r.at) ? 'Today' : 'Tomorrow'} at ${clockTime(r.at)}` : 'Off · turn it on in the shift check'}</Body>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Preview: ${r.title}`} onPress={() => previewReminder(r.id)} hitSlop={6}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.forest, textDecorationLine: 'underline' }}>Preview</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function sameDay(d: Date) {
  return d.toDateString() === new Date().toDateString();
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
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
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
