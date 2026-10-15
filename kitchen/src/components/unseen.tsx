import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clock, demoNow, minutesUntil, useKitchen } from '../lib/kitchen';
import { onServer } from '../lib/server';
import { colors, fonts } from '../lib/theme';
import { first, unseen } from './alerts';
import { Chip, DishPhoto } from './ui';

const SHOWN_AFTER = 60_000;
// After the full-screen ticket appears: when the owner gets a text, and when new orders would pause.
const SMS_AFTER = 60_000;
const PAUSE_AFTER = 3 * 60_000;

// "Didn't print": an auto-accepted order whose ticket never came out and that nobody has opened in a
// minute takes the whole screen, with the bell repeating, until someone taps "Seen it". As on K-PrintFail.
export function Unseen() {
  const k = useKitchen();
  const insets = useSafeAreaInsets();
  const [t, setT] = useState(demoNow);
  useEffect(() => {
    const i = setInterval(() => setT(demoNow()), 1000);
    return () => clearInterval(i);
  }, []);
  // Only one full-screen alert at a time; the accept screen wins.
  if (k.orders.some((o) => o.status === 'incoming')) return null;
  const o = unseen(k.orders, t)[0];
  if (!o) return null;

  const shownAt = o.inAt + SHOWN_AFTER;
  const ringing = Math.max(0, Math.round((t - shownAt) / 1000));
  const left = minutesUntil(o.dueAt, t);
  // The owner's text and the pause need the server to send them; it doesn't yet.
  const texted = !onServer && t >= shownAt + SMS_AFTER;
  const name = first(o);
  const printing = k.settings.printTicket;

  return (
    <View style={[StyleSheet.absoluteFill, s.screen, { paddingTop: insets.top }]} accessibilityViewIsModal>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: 250 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={s.ringing} accessibilityLabel={`Bell ringing for ${ringing} seconds`}>
            <View style={s.redDot} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#8F1D14' }}>
              Bell ringing · {Math.floor(ringing / 60)}:{String(ringing % 60).padStart(2, '0')}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.muted }}>{onServer ? 'Nobody has opened it' : printing ? 'Printer not answering' : 'Ticket printing is off'}</Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 6 }}>
          <Text style={s.kicker}>{onServer ? 'New order' : printing ? 'Didn’t print' : 'No ticket'} · cook from this screen</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 64, lineHeight: 64, color: colors.forest }}>{o.id}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: left <= 4 ? colors.orangeText : colors.forest }}>
                {Math.max(left, 0)}
                <Text style={{ fontSize: 16 }}> min</Text>
              </Text>
              <Text style={s.caps}>ready by {clock(o.dueAt)}</Text>
            </View>
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>
            {o.student} · {o.place} · paid by {o.paid === 'MTN MoMo' ? 'MoMo' : o.paid}
          </Text>
        </View>

        <View style={s.ticket}>
          {o.items.map((i, n) => (
            <View key={i.name} style={{ gap: 14 }}>
              {n > 0 ? <View style={{ height: 1, backgroundColor: colors.lineSoft }} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <DishPhoto name={i.name} size={64} radius={16} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.forest }}>
                    {i.qty}× {i.name}
                  </Text>
                  {i.extras?.length ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {i.extras.map((e) => (
                        <Chip key={e} size={14} roomy>
                          {e}
                        </Chip>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
          {o.note ? (
            <View style={{ backgroundColor: colors.noteBg, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.segmentText }}>
                <Text style={{ fontFamily: fonts.bold, color: colors.forest }}>Note</Text> · {o.note}
              </Text>
            </View>
          ) : null}
        </View>

        {texted ? (
          // Sample only: sending the SMS needs the backend.
          <View style={s.sms} accessibilityLabel="Text message sent to the owner (sample)">
            <View style={s.smsIcon}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 5h16v11H8l-4 4z" />
              </Svg>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.muted }}>SMS to the owner · sample</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{clock(shownAt + SMS_AFTER)}</Text>
              </View>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.ink }}>
                Nakawa Kitchen: order {o.id} didn’t print and nobody has tapped it. Reply 1 to pause new orders.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={[s.actions, { bottom: 26 + insets.bottom }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Seen order ${o.id}, we're cooking`}
          onPress={() => {
            k.markSeen(o.id);
            k.notify(onServer ? `Order ${o.id} seen` : `${name} now sees “Kitchen has your order”`);
          }}
          style={({ pressed }) => [s.seen, { opacity: pressed ? 0.92 : 1 }]}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.cream }}>Seen it, we’re cooking</Text>
        </Pressable>
        {onServer ? null : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable accessibilityRole="button" onPress={() => k.notify(`Sent ${o.id} to the printer again. Still no answer`)} style={s.secondary}>
              <Text style={s.secondaryText}>Print again</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => k.notify(`Write ${o.id} on the bag; the rider will check the name`)} style={s.secondary}>
              <Text style={s.secondaryText}>Bag seal by hand</Text>
            </Pressable>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2 }}>
            <Circle cx={12} cy={12} r={9} />
            <Path d="M12 7v5l3 2" />
          </Svg>
          <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted }}>
            {onServer
              ? `The bell keeps ringing until someone taps. Write ${o.id} on the bag so the rider finds it.`
              : `${name} sees “Kitchen has your order” only after you tap. ${texted ? `We texted the owner at ${clock(shownAt + SMS_AFTER)}.` : `No tap by ${clock(shownAt + SMS_AFTER)}: we text the owner.`} ${clock(shownAt + PAUSE_AFTER)}: new orders pause.`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { backgroundColor: colors.cream },
  ringing: { height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: '#FDECEA', flexDirection: 'row', alignItems: 'center', gap: 8 },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#B42318', shadowColor: '#B42318', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  kicker: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.76, textTransform: 'uppercase', color: colors.orangeText },
  caps: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.88, textTransform: 'uppercase', color: colors.muted },
  ticket: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    padding: 16,
    gap: 14,
    shadowColor: colors.forest,
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  sms: { marginHorizontal: 16, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  smsIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.segmentText, alignItems: 'center', justifyContent: 'center' },
  actions: { position: 'absolute', left: 16, right: 16, gap: 10 },
  seen: { height: 64, borderRadius: 20, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', shadowColor: colors.forest, shadowOpacity: 0.25, shadowRadius: 26, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  secondary: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
});
