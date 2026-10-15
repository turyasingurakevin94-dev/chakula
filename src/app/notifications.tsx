import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, Icon, IconButton, Label, styles as ui, type IconName } from '../components/ui';
import { useAccount, type AlertPrefs } from '../lib/account';
import { useAlerts } from '../lib/alerts';
import { rider } from '../lib/stages';
import { colors, fonts } from '../lib/theme';

const WEEK = 7 * 24 * 60 * 60 * 1000;

type Toggle = { key: keyof AlertPrefs; title: string; detail: string };

// Profile > Notifications, as on the S-Settings board. Order updates can't be turned off.
export default function Notifications() {
  const account = useAccount();
  const alerts = useAlerts();
  const prefs = account.alertPrefs;
  // Two sounds per order placed this week.
  const [weekAgo] = useState(() => Date.now() - WEEK);
  const sent = account.orders.filter((o) => o.placedAt > weekAgo).length * 2;

  const groups: { name: string; rows: Toggle[] }[] = [
    { name: 'If your data is off', rows: [{ key: 'sms', title: 'Text me my code', detail: `To ${account.maskedPhone || 'your phone'}, only if the push isn’t seen in a minute.` }] },
    { name: 'If you miss the rider', rows: [{ key: 'callFriend', title: 'Call a friend if I miss the rider', detail: `If you don’t reach ${rider.name} in 3 minutes, we call them so your food isn’t sent back.` }] },
    {
      name: 'Meal plan',
      rows: [
        { key: 'planReminders', title: 'Time to choose your meal', detail: 'At 1:30 pm, 1 h 30 before supper choices close.' },
        { key: 'quietHours', title: 'Quiet from 10 pm to 7 am', detail: 'Reminders wait till morning. Your order still reaches you.' },
      ],
    },
    {
      name: 'Extras',
      rows: [
        { key: 'celebrations', title: 'Celebrations', detail: 'Your 25th meal, a full plan week. A few a term.' },
        { key: 'fridaySpecial', title: 'Friday special', detail: 'One a week at most. Off until you turn it on.' },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.top}>
          <IconButton icon="chevron-left" label="Back" variant="outline" onPress={() => router.back()} />
          <Label>Profile</Label>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 4 }}>
            <Display size={30}>Notifications</Display>
            <Text style={s.meta}>
              This week we sent you <Text style={{ fontFamily: fonts.bold, color: colors.forest }}>{sent} alerts</Text>. That’s all.
            </Text>
          </View>

          <View style={[s.card, { marginTop: 16 }]}>
            <View style={s.iconCircle}>
              <Icon name="lock" size={18} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.strong15}>Your order updates</Text>
              <Text style={s.detail}>Always on. A live card, plus two sounds: picked up, and at your gate.</Text>
            </View>
          </View>

          <PhoneStatus />

          {groups.map((g) => (
            <View key={g.name} style={{ paddingHorizontal: 20, paddingTop: 16, gap: 8 }}>
              <Label>{g.name}</Label>
              <View style={[ui.card, { borderRadius: 18, overflow: 'hidden' }]}>
                {g.rows.map((r, i) => {
                  const on = prefs[r.key] === true;
                  const last = i === g.rows.length - 1;
                  return (
                    <View key={r.key}>
                      <View style={[s.row, !last && s.divider]}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[s.strong15, { fontFamily: fonts.semibold }]}>{r.title}</Text>
                          <Text style={s.detail}>{r.detail}</Text>
                        </View>
                        <Switch on={on} label={r.title} onToggle={() => account.setAlertPrefs({ [r.key]: !on })} />
                      </View>
                      {r.key === 'callFriend' && on ? <FriendFields /> : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          <Pressable accessibilityRole="button" onPress={alerts.sendTest} style={({ pressed }) => [s.test, { opacity: pressed ? 0.7 : 1 }]}>
            <Icon name="volume-2" size={18} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>Send me a test alert</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Says whether the phone itself can ring, and how to change that.
function PhoneStatus() {
  const alerts = useAlerts();
  const p = alerts.permission;
  if (p === 'granted' || p === 'checking') return null;

  let icon: IconName = 'bell-off';
  let title = 'Phone alerts are off';
  let text = `Turn them on to hear ${rider.name} at the gate, even with the app closed.`;
  let action: { label: string; onPress: () => void } | null = { label: 'Turn on', onPress: () => void alerts.requestPermission() };
  if (p === 'blocked') {
    text = 'Turn them on for Chakula in your phone’s settings.';
    action = { label: 'Settings', onPress: () => void Linking.openSettings().catch(() => {}) };
  } else if (p === 'unavailable') {
    icon = 'smartphone';
    title = 'Alerts show in the app for now';
    text = Platform.OS === 'web' ? 'While this page is open, alerts slide in at the top.' : 'While Chakula is open, alerts slide in at the top. Phone alerts come with the next app update.';
    action = null;
  }

  return (
    <View style={[s.card, { marginTop: 10, backgroundColor: colors.well, borderColor: colors.line }]}>
      <View style={[s.iconCircle, { backgroundColor: colors.card }]}>
        <Icon name={icon} size={18} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.strong15}>{title}</Text>
        <Text style={s.detail}>{text}</Text>
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} style={({ pressed }) => [s.smallButton, { opacity: pressed ? 0.85 : 1 }]}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.cream }}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FriendFields() {
  const account = useAccount();
  const prefs = account.alertPrefs;
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
      <TextInput
        value={prefs.friendName}
        onChangeText={(friendName) => account.setAlertPrefs({ friendName })}
        placeholder="Friend’s name"
        placeholderTextColor={colors.chevron}
        autoCapitalize="words"
        accessibilityLabel="Friend’s name"
        style={s.input}
      />
      <TextInput
        value={prefs.friendPhone}
        onChangeText={(friendPhone) => account.setAlertPrefs({ friendPhone: friendPhone.replace(/[^\d+ ]/g, '') })}
        placeholder="Their phone, e.g. 0772 123 456"
        placeholderTextColor={colors.chevron}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        accessibilityLabel="Friend’s phone number"
        style={s.input}
      />
    </View>
  );
}

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} hitSlop={6} onPress={onToggle} style={[s.track, { backgroundColor: on ? colors.forest : '#D8CDBE', justifyContent: on ? 'flex-end' : 'flex-start' }]}>
      <View style={s.thumb} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  card: { marginHorizontal: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  strong15: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  detail: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  track: { width: 50, height: 30, borderRadius: 15, padding: 3, flexDirection: 'row' },
  thumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  input: { height: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cream, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  smallButton: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  test: { marginHorizontal: 20, marginTop: 24, height: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
