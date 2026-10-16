import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CountdownRing } from '../components/alerts';
import { BackButton, Body, Button, Headline, Icon, Label, type IconName } from '../components/ui';
import { clockTime, contactStudent, KITCHEN, kitchenOf, PER_DROP, RIDER, useNow, useRider, WAIT_MS, type Stop } from '../lib/rider';
import { onServer } from '../lib/server';
import { colors, fonts, money } from '../lib/theme';

// Sample timings for what Chakula does while the rider waits: from arrival, when each step starts
// and when it's done. There is no backend yet, so these only play out on screen.
const TRAIL = { push: [0, 0], call: [10_000, 20_000], sms: [30_000, 45_000], friend: [50_000, 130_000] } as const;

type StepState = 'done' | 'now' | 'todo';
type Step = { title: string; detail: string; time: string; state: StepState };

// Something wrong: wait for a student who isn't answering, or report a problem. From the handover
// it opens on the wait ring and what Chakula is doing; from pickup it only lists the problems.
export default function Help() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { stop, arrivedAt, completeStop, run, stopIndex, notify, returnBag } = useRider();
  const now = useNow(1000);
  const waiting = from !== 'pickup' && stop && run && arrivedAt !== null;

  const giveBack = async () => {
    if (!run) return;
    // On the server the order ends there (the student and kitchen are told); stay put if it fails.
    const error = await returnBag();
    if (error) return notify(error);
    const last = stopIndex + 1 >= run.stops.length;
    completeStop('returned');
    if (last) router.dismissAll();
    else router.dismissTo('/route');
  };

  // On the server nothing is reported from here yet, so each problem says what the rider can do now.
  const kitchen = stop ? kitchenOf(stop) : 'the kitchen';
  const problems: { icon: IconName; title: string; sub: string; done: string; act?: () => void }[] = onServer
    ? [
        {
          icon: 'map-pin',
          title: "Can't find the place",
          sub: stop?.phone ? `Call ${stop.first} for directions` : 'Call the student from the handover screen',
          done: 'Call the student from the handover screen',
          act: stop?.phone ? () => contactStudent(stop, 'call', notify) : undefined,
        },
        { icon: 'package', title: 'Seal broken or bag damaged', sub: 'Show the kitchen before you ride off', done: `Show ${kitchen} the bag. Reporting it in the app comes later.` },
        { icon: 'dollar-sign', title: "Student won't pay cash", sub: 'Keep the bag; don’t hand it over', done: `Keep the bag and take it back to ${kitchen}.` },
        { icon: 'tool', title: 'Bike trouble', sub: 'Tell the kitchen so another rider can help', done: `Call ${kitchen} so another rider can take your bags.` },
      ]
    : [
        { icon: 'map-pin', title: "Can't find the place", sub: "The student's pin, plus a photo of the entrance", done: 'Pin and entrance photo sent to you' },
        { icon: 'package', title: 'Seal broken or bag damaged', sub: 'One photo; the kitchen remakes it', done: `${KITCHEN} is remaking it. Take one photo of the bag.` },
        { icon: 'dollar-sign', title: "Student won't pay cash", sub: 'Keep the bag; we sort it out with them', done: 'Keep the bag. Chakula is calling the student.' },
        { icon: 'tool', title: 'Bike trouble', sub: 'We pass your bags to the nearest rider', done: 'Finding the nearest rider for your bags' },
      ];

  const problemList = (
    <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
      <Label style={{ paddingBottom: 6 }}>{waiting ? 'Something else' : 'What happened?'}</Label>
      {problems.map((p, i) => (
        <Pressable
          key={p.title}
          accessibilityRole="button"
          onPress={() => (p.act ? p.act() : notify(p.done))}
          style={({ pressed }) => [s.row, i < problems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }, pressed && { opacity: 0.7 }]}
        >
          <Icon name={p.icon} size={22} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{p.title}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{p.sub}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );

  const accident = (
    <Button
      variant="danger"
      icon="alert-triangle"
      height={58}
      size={16}
      onPress={() =>
        onServer
          ? Linking.openURL('tel:999').catch(() => notify('Stay where you are safe and call 999'))
          : notify('Calling Chakula · stay where you are safe')
      }
    >
      {onServer ? 'Accident or danger · call 999' : 'Accident or danger · call Chakula'}
    </Button>
  );

  if (!waiting) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}>
        <View style={s.header}>
          <BackButton label="Back" />
          <Headline size={28}>We&apos;ve got you.</Headline>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>{problemList}</ScrollView>
        <View style={{ paddingHorizontal: 20, paddingBottom: 26, paddingTop: 8 }}>{accident}</View>
      </SafeAreaView>
    );
  }

  const elapsed = Math.max(0, now - arrivedAt);
  const left = Math.max(0, WAIT_MS - elapsed);
  const mins = Math.floor(left / 60_000);
  const secs = Math.floor((left % 60_000) / 1000);
  const spot = stop.place.split(',')[0];
  const steps = onServer ? serverTrail(stop, arrivedAt, left) : trail(stop, arrivedAt, elapsed, left);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={s.header}>
        <BackButton label="Back to the handover" />
        <Label style={{ flex: 1 }}>
          Stop {stopIndex + 1} of {run.stops.length} · {spot}
        </Label>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 26, alignItems: 'center', gap: 10 }}>
          <CountdownRing size={168} stroke={10} share={left / WAIT_MS} track={colors.line} fill={colors.forest}>
            <Text style={{ fontFamily: fonts.display, fontSize: 48, lineHeight: 52, color: colors.forest }}>
              {mins}:{String(secs).padStart(2, '0')}
            </Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, color: colors.muted, marginTop: 2 }}>LEFT TO WAIT</Text>
          </CountdownRing>
          <Headline size={30} style={{ textAlign: 'center' }}>
            {left > 0 ? (onServer ? `Waiting for ${stop.first}` : `We're getting ${stop.first} for you`) : `${stop.first} didn't come`}
          </Headline>
          <Body style={{ fontSize: 15, lineHeight: 21, color: colors.body, textAlign: 'center' }}>
            {onServer
              ? left > 0
                ? `Stay at ${spot}. Chakula told ${stop.first} you're here; give them a call too.`
                : `Take the bag back to ${kitchenOf(stop)}.`
              : left > 0
                ? `Stay at ${spot}. You don't need to keep calling.`
                : `Take the bag back to ${KITCHEN}. You're still paid for this drop.`}
          </Body>
          {onServer ? (
            <Button variant="secondary" icon="phone" height={48} style={{ alignSelf: 'stretch', borderRadius: 16, gap: 8 }} onPress={() => contactStudent(stop, 'call', notify)}>
              {`Call ${stop.first}`}
            </Button>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={s.card}>
            {steps.map((st, i) => (
              <View key={st.title} style={[s.step, i < steps.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.lineSoft }]}>
                <View
                  style={[
                    s.dot,
                    st.state === 'done'
                      ? { backgroundColor: colors.forest }
                      : st.state === 'now'
                        ? { borderWidth: 2, borderColor: colors.orange, backgroundColor: colors.chipBg }
                        : { borderWidth: 1.5, borderColor: colors.toggleOff },
                  ]}
                >
                  {st.state === 'done' ? <Icon name="check" size={14} color={colors.cream} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{st.title}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{st.detail}</Text>
                </View>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: st.state === 'now' ? colors.orangeText : colors.muted }}>{st.time}</Text>
              </View>
            ))}
          </View>
        </View>

        {problemList}
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>{accident}</View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 18, paddingTop: 8, gap: 10 }}>
        {onServer ? null : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="shield" size={18} color={colors.sealed} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>You&apos;re paid UGX {money(PER_DROP)} either way</Text>
          </View>
        )}
        {left > 0 ? (
          <Button height={60} size={17} style={{ borderRadius: 20 }} onPress={() => router.back()}>
            {`${stop.first} is here, enter code`}
          </Button>
        ) : (
          <Button height={60} size={17} icon="corner-up-left" style={{ borderRadius: 20 }} onPress={() => void giveBack()}>
            Return the bag to the kitchen
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

// On the server: what really happened. Arriving told the student (push, or SMS without the app);
// there's no Chakula call line or saved friend yet.
function serverTrail(stop: Stop, arrivedAt: number, left: number): Step[] {
  const at = (ms: number) => clockTime(new Date(arrivedAt + ms));
  return [
    { title: `${stop.first} was told you're here`, detail: 'By notification, or SMS without the app', time: at(0), state: 'done' },
    { title: `Call ${stop.first}`, detail: stop.phone ?? 'Number not on this order', time: left > 0 ? 'now' : '', state: left > 0 ? 'now' : 'done' },
    { title: 'Return the bag to the kitchen', detail: `Only if nobody comes by ${at(WAIT_MS)}`, time: at(WAIT_MS), state: left === 0 ? 'now' : 'todo' },
  ];
}

// What Chakula does while the rider waits. The saved-friend step only shows when the student set one.
function trail(stop: Stop, arrivedAt: number, elapsed: number, left: number): Step[] {
  const state = ([start, end]: readonly [number, number]): StepState => (elapsed >= end ? 'done' : elapsed >= start ? 'now' : 'todo');
  const at = (ms: number) => clockTime(new Date(arrivedAt + ms));
  const call = state(TRAIL.call);
  const sms = state(TRAIL.sms);
  const steps: Step[] = [
    { title: `Push sent to ${stop.first}`, detail: `"${RIDER} is at ${stop.place.split(',')[0]}"`, time: at(0), state: 'done' },
    { title: call === 'done' ? `Chakula called ${stop.first}` : `Calling ${stop.first}`, detail: call === 'done' ? 'No answer' : 'From the Chakula line', time: call === 'now' ? 'now' : at(TRAIL.call[1]), state: call },
    { title: 'SMS sent', detail: 'Works without data', time: sms === 'now' ? 'now' : at(TRAIL.sms[1]), state: sms },
  ];
  if (stop.friend) {
    const f = state(TRAIL.friend);
    steps.push({
      title: f === 'done' ? `Called ${stop.first}'s saved friend` : `Calling ${stop.first}'s saved friend`,
      detail: `${stop.friend.name}, ${stop.friend.place}${f === 'done' ? ' · no answer' : ''}`,
      time: f === 'now' ? 'now' : at(TRAIL.friend[1]),
      state: f,
    });
  }
  steps.push({
    title: 'Return the bag to the kitchen',
    detail: `Only if nobody comes by ${at(WAIT_MS)}`,
    time: at(WAIT_MS),
    state: left === 0 ? 'now' : 'todo',
  });
  return steps;
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    paddingVertical: 6,
    paddingHorizontal: 16,
    shadowColor: colors.forest,
    shadowOpacity: 0.07,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 14 },
});
