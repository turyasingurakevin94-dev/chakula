import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Body, Button, Headline, Icon, Italic, Label, Num } from '../components/ui';
import { getAlertPermission, openAppSettings, openBatterySettings, requestAlertPermission, runChannelIsLoud, sendAlert, type AlertPermission } from '../lib/notify';
import { SMS_BACKUP, today, useRider } from '../lib/rider';
import { onServer } from '../lib/server';
import { colors, fonts } from '../lib/theme';
import { versionLabel } from '../lib/updates';

const CHECKS = ['Delivery box clean and dry', 'Helmet and Chakula jacket on', 'Fuel for about 18 km'];

// Start your shift: the Gold Rider card and a three-tap check, then the alerts check, then online.
export default function Start() {
  const { checks, toggleCheck, notify, drops, riderName, user } = useRider();
  const [step, setStep] = useState<1 | 2>(1);

  const go = () => {
    const missing = CHECKS.find((_, i) => !checks[i]);
    if (missing) {
      notify(`Tick "${missing}" first`);
      return;
    }
    setStep(2);
  };

  if (step === 2) return <AlertsCheck />;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 26, gap: 4 }}>
          <Label>{today()} · start shift · step 1 of 2</Label>
          <Headline>
            Ready to ride,{'\n'}
            <Italic>{riderName}?</Italic>
          </Headline>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={s.member}>
            <Svg width={260} height={200} viewBox="0 0 260 200" style={{ position: 'absolute', right: -60, top: -40 }}>
              {[96, 78, 60, 42].map((r) => (
                <Circle key={r} cx={160} cy={100} r={r} fill="none" stroke={colors.lineSoft} />
              ))}
            </Svg>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ fontFamily: fonts.displayItalic, fontSize: 18, color: colors.forest }}>Chakula</Text>
              {onServer ? null : (
                <View style={s.gold}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6, color: colors.forest }}>GOLD RIDER</Text>
                </View>
              )}
            </View>
            <View style={{ gap: 2 }}>
              <Num size={26}>{onServer ? (user?.name ?? 'Rider') : 'Moses Kato'}</Num>
              <Body style={{ fontSize: 13, color: colors.muted }}>{onServer ? `Rider · ${user?.phone ?? ''}` : 'Rider 07 · Nakawa campus'}</Body>
            </View>
            <View style={{ flexDirection: 'row', gap: 22 }}>
              {/* Ratings, on-time and lifetime drops aren't on the server yet. */}
              {onServer ? null : <Stat value="4.9" label="rating" />}
              {onServer ? null : <Stat value="98%" label="on time" />}
              {onServer ? <Stat value={String(drops)} label={drops === 1 ? 'drop today' : 'drops today'} /> : <Stat value={String(203 + drops)} label="drops" />}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Label style={{ paddingBottom: 4 }}>Before you go</Label>
          {CHECKS.map((c, i) => (
            <Pressable
              key={c}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: checks[i] }}
              onPress={() => toggleCheck(i)}
              style={[s.check, i < CHECKS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}
            >
              {checks[i] ? (
                <View style={[s.tick, { backgroundColor: colors.forest }]}>
                  <Icon name="check" size={15} color={colors.cream} />
                </View>
              ) : (
                <View style={[s.tick, { borderWidth: 2, borderColor: colors.orange }]} />
              )}
              <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.forest }}>{c}</Text>
            </Pressable>
          ))}
          {onServer ? null : <Body style={{ paddingTop: 8, fontSize: 13, color: colors.muted }}>Phone at 82% and location on. We checked those for you.</Body>}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 18, gap: 10 }}>
        <Button height={60} size={17} style={{ borderRadius: 20 }} onPress={go}>
          Next: check my alerts
        </Button>
        {onServer ? null : <Text style={{ textAlign: 'center', fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>11:30 to 2:30 · first pickup 11:45 · 14 drops planned</Text>}
        <Text style={{ textAlign: 'center', fontFamily: fonts.regular, fontSize: 11, color: colors.chevron }}>{versionLabel()}</Text>
      </View>
    </SafeAreaView>
  );
}

async function readAlerts() {
  const p = await getAlertPermission();
  return { perm: p.status, loud: p.status === 'granted' ? await runChannelIsLoud() : null };
}

type Row = { title: string; detail: string; state: 'ok' | 'fix' | 'note'; fix?: () => void };

// Step 2, "Can you hear us?": a missed run costs the rider money, so check the phone first.
// Anything marked Fix blocks going online. Phones without the notification module yet (the first
// APK) get a note instead and run on in-app alerts.
function AlertsCheck() {
  const { goOnline, voice, setVoice, tipAlerts, setTipAlerts, shiftReminder, setShiftReminder, batterySaver, fixBatterySaver, notify, raise } = useRider();
  const [perm, setPerm] = useState<AlertPermission | null>(null);
  const [loud, setLoud] = useState<boolean | null>(null);

  const refresh = useCallback(
    () =>
      readAlerts().then((r) => {
        setPerm(r.perm);
        setLoud(r.loud);
      }),
    [],
  );

  // Check again when the rider comes back from the phone's settings.
  useEffect(() => {
    let alive = true;
    const check = () =>
      readAlerts().then((r) => {
        if (!alive) return;
        setPerm(r.perm);
        setLoud(r.loud);
      });
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const allow = async () => {
    await requestAlertPermission();
    await refresh();
  };

  const rows: Row[] = [];
  if (perm === 'unavailable') {
    rows.push({ title: 'Alerts inside the app', detail: 'Loud alerts come with the next app update. Keep Chakula open on shift.', state: 'note' });
  } else {
    const granted = perm === 'granted';
    rows.push(
      // iOS can't ring through the silent switch without critical alerts, so there it's advice, not a check.
      Platform.OS === 'ios'
        ? { title: 'Loud run alert', detail: 'Follows your ring/silent switch on iPhone', state: 'note' }
        : !granted
        ? { title: 'Loud run alert', detail: perm === null ? 'Checking your phone' : 'Needs notifications on', state: perm === null ? 'ok' : 'fix', fix: allow }
        : loud === false
          ? { title: 'Run alerts are turned down', detail: 'Turn "New runs" back up in settings', state: 'fix', fix: openAppSettings }
          : { title: 'Loud run alert', detail: 'Plays even on silent', state: 'ok' },
      granted || perm === null
        ? { title: 'Notifications on', detail: 'So a run shows on your lock screen', state: 'ok' }
        : { title: 'Notifications are off', detail: 'A run could ring without you seeing it', state: 'fix', fix: allow },
    );
  }
  rows.push(
    batterySaver
      ? {
          title: 'Battery saver is on',
          detail: 'It can delay alerts by minutes',
          state: 'fix',
          fix: async () => {
            await openBatterySettings();
            fixBatterySaver();
          },
        }
      : { title: 'Battery saver is off', detail: 'Alerts arrive on time', state: 'ok' },
  );
  // The server doesn't text riders yet, so there's no SMS backup to promise there.
  if (!onServer) rows.push({ title: `SMS backup to ${SMS_BACKUP}`, detail: 'Works when data runs out', state: 'ok' });
  const blocking = rows.filter((r) => r.state === 'fix').length;

  const test = async () => {
    if (perm === 'undetermined') await allow();
    const sent = await sendAlert({ kind: 'test', channel: 'runs', title: 'Test run alert', body: 'This is how a new run sounds. Nakawa hatch 12:50. 2 drops, UGX 5,000.' });
    if (sent) {
      notify('Test alert sent · did you hear it?');
      return;
    }
    raise({
      kicker: 'Test run alert',
      title: 'This is how a new run looks',
      body: perm === 'unavailable' ? 'This phone shows runs inside the app for now. Keep Chakula open on shift.' : 'Turn notifications on so runs ring even when the phone is locked.',
      primary: { label: 'Got it' },
    });
  };

  const start = () => {
    if (blocking > 0) {
      notify(`Fix ${blocking === 1 ? 'the item marked Fix' : `the ${blocking} items marked Fix`} first`);
      return;
    }
    goOnline();
    router.replace('/');
  };

  // Tips and the shift rota aren't on the server yet, so those switches only show on sample data.
  const prefs = [
    { title: 'Read student notes aloud', detail: 'In riding mode', on: voice, set: setVoice },
    ...(onServer
      ? []
      : [
          { title: 'Tips as they come', detail: 'Or all in tonight’s pay', on: tipAlerts, set: setTipAlerts },
          { title: 'Shift reminder', detail: '30 min before, with your runs', on: shiftReminder, set: setShiftReminder },
        ]),
  ];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 4 }}>
          <Label>Start shift · step 2 of 2</Label>
          <Headline size={32}>
            Can you <Italic>hear</Italic> us?
          </Headline>
          <Body style={{ fontSize: 14, lineHeight: 20, color: colors.body }}>A missed run costs you money. We check your phone before every shift.</Body>
        </View>

        <View style={[s.group, s.raised]}>
          {rows.map((r, i) => (
            <View key={r.title} style={[s.item, i < rows.length - 1 && s.itemLine]}>
              <View style={[s.mark, r.state === 'ok' ? { backgroundColor: colors.forest } : { backgroundColor: colors.chipBg }]}>
                {r.state === 'ok' ? <Icon name="check" size={14} color={colors.cream} /> : <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.chipText }}>!</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{r.title}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted }}>{r.detail}</Text>
              </View>
              {r.state === 'fix' && r.fix ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Fix: ${r.title}`} onPress={r.fix} style={s.fix}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.cream }}>Fix</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>

        <View style={[s.group, { marginTop: 14 }]}>
          {prefs.map((p, i) => (
            <View key={p.title} style={[s.item, i < prefs.length - 1 && s.itemLine]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>{p.title}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{p.detail}</Text>
              </View>
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel={p.title}
                accessibilityState={{ checked: p.on }}
                onPress={() => p.set(!p.on)}
                style={[s.track, { backgroundColor: p.on ? colors.forest : colors.toggleOff, justifyContent: p.on ? 'flex-end' : 'flex-start' }]}
              >
                <View style={s.knob} />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 18, gap: 10 }}>
        <Pressable accessibilityRole="button" onPress={test} style={({ pressed }) => [s.test, pressed && { opacity: 0.8 }]}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>Play a test run alert</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: blocking > 0 }}
          onPress={start}
          style={[s.go, { backgroundColor: blocking > 0 ? colors.toggleOff : colors.forest }]}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: blocking > 0 ? colors.body : colors.cream }}>
            {blocking > 0 ? `Fix ${blocking} thing${blocking > 1 ? 's' : ''} to start` : 'Go online'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.forest }}>{value}</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  member: {
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 18,
    shadowColor: colors.forest,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  gold: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.forest },
  check: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tick: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  group: { marginTop: 18, marginHorizontal: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingVertical: 4, paddingHorizontal: 16 },
  raised: { shadowColor: colors.forest, shadowOpacity: 0.07, shadowRadius: 13, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  itemLine: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  mark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  fix: { height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  track: { width: 50, height: 30, borderRadius: 15, padding: 3, flexDirection: 'row' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  test: { height: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  go: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
