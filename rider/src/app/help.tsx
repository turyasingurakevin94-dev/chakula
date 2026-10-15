import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { BackButton, Body, Button, Headline, Icon, Label, type IconName } from '../components/ui';
import { KITCHEN, useNow, useRider, WAIT_MS } from '../lib/rider';
import { colors, fonts } from '../lib/theme';

// Something wrong: wait for a student who isn't answering, or report a problem. From the handover
// it opens on the wait timer; from pickup it only lists the problems.
export default function Help() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { stop, arrivedAt, completeStop, run, stopIndex, notify } = useRider();
  const now = useNow(1000);
  const waiting = from !== 'pickup' && stop && arrivedAt !== null;

  const left = waiting ? Math.max(0, arrivedAt + WAIT_MS - now) : 0;
  const mins = Math.floor(left / 60_000);
  const secs = Math.floor((left % 60_000) / 1000);

  const giveBack = () => {
    if (!run) return;
    const last = stopIndex + 1 >= run.stops.length;
    completeStop('returned');
    if (last) router.dismissAll();
    else router.dismissTo('/route');
  };

  const problems: { icon: IconName; title: string; sub: string; done: string }[] = [
    { icon: 'map-pin', title: "Can't find the place", sub: "The student's pin, plus a photo of the entrance", done: 'Pin and entrance photo sent to you' },
    { icon: 'package', title: 'Seal broken or bag damaged', sub: 'One photo; the kitchen remakes it', done: `${KITCHEN} is remaking it. Take one photo of the bag.` },
    { icon: 'dollar-sign', title: "Student won't pay cash", sub: 'Keep the bag; we sort it out with them', done: 'Keep the bag. Chakula is calling the student.' },
    { icon: 'tool', title: 'Bike trouble', sub: 'We pass your bags to the nearest rider', done: 'Finding the nearest rider for your bags' },
  ];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={s.header}>
        <BackButton label="Back" />
        <Headline size={28}>We&apos;ve got you.</Headline>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {waiting ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <View style={s.card}>
              <Label>{stop.first} isn&apos;t answering</Label>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
                  <Svg width={96} height={96} style={StyleSheet.absoluteFill}>
                    <Circle cx={48} cy={48} r={45} stroke={colors.line} strokeWidth={6} fill="none" />
                    <Circle
                      cx={48}
                      cy={48}
                      r={45}
                      stroke={colors.forest}
                      strokeWidth={6}
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={2 * Math.PI * 45 * (1 - left / WAIT_MS)}
                      transform="rotate(-90 48 48)"
                    />
                  </Svg>
                  <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 30, color: colors.forest }}>
                    {mins}:{String(secs).padStart(2, '0')}
                  </Text>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, color: colors.muted }}>LEFT</Text>
                </View>
                <Body style={{ flex: 1, fontSize: 15, lineHeight: 22 }}>
                  Wait at {stop.place.split(',')[0]}. Chakula has called {stop.first} twice and sent a message.
                </Body>
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
                <Body style={{ fontSize: 13, lineHeight: 19, color: colors.body }}>
                  If {stop.first} hasn&apos;t come when the timer ends, take the bag back to {KITCHEN}.{' '}
                  <Text style={{ fontFamily: fonts.bold, color: colors.forest }}>You&apos;re still paid for this drop.</Text>
                </Body>
              </View>
              {left === 0 ? (
                <Button icon="corner-up-left" onPress={giveBack}>
                  Take the bag back
                </Button>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Label style={{ paddingBottom: 6 }}>{waiting ? 'Something else' : 'What happened?'}</Label>
          {problems.map((p, i) => (
            <Pressable
              key={p.title}
              accessibilityRole="button"
              onPress={() => notify(p.done)}
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
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 26, paddingTop: 8 }}>
        <Button variant="danger" icon="alert-triangle" height={58} size={16} onPress={() => notify('Calling Chakula · stay where you are safe')}>
          Accident or danger · call Chakula
        </Button>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
    padding: 20,
    gap: 14,
    shadowColor: colors.forest,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  row: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 14 },
});
