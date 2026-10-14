import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { clock, demoNow, orderTotal, useKitchen } from '../lib/kitchen';
import { colors, fonts } from '../lib/theme';
import { Note } from './order';
import { Chip } from './ui';

const OPTIONS = [10, 15, 20];
const ACCEPT_WINDOW = 2 * 60_000;
const mint = '#CFE0D3';

// Only seen when "Accept it for me" is off: each new order takes the whole screen until someone answers.
export function Incoming() {
  const k = useKitchen();
  const insets = useSafeAreaInsets();
  const [mins, setMins] = useState(15);
  // The shared clock ticks every 5 seconds; the countdown needs every second.
  const [t, setT] = useState(demoNow);
  useEffect(() => {
    const i = setInterval(() => setT(demoNow()), 1000);
    return () => clearInterval(i);
  }, []);
  const o = k.orders.filter((x) => x.status === 'incoming').sort((a, b) => a.inAt - b.inAt)[0];
  if (!o) return null;

  const leftMs = Math.max(0, (o.acceptBy ?? t) - t);
  const secs = Math.round(leftMs / 1000);
  const readyBy = t + mins * 60_000;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]} accessibilityViewIsModal>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 150 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingTop: 28, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={mint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
                <Path d="M10 21h4" />
              </Svg>
              <Text style={s.kicker}>New order · #{o.id}</Text>
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: mint }}>{clock(o.inAt)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }} accessibilityLabel={`${Math.floor(secs / 60)} minutes ${secs % 60} seconds left to accept`}>
            <Text style={s.countdown}>
              {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: mint }}>left to accept</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: `${(leftMs / ACCEPT_WINDOW) * 100}%` }]} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 22, gap: 4 }}>
          <Text style={{ fontFamily: fonts.displayItalic, fontSize: 28, color: colors.cream }}>{o.student}</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: mint }}>
            {o.place} · rider arrives {clock(readyBy + 2 * 60_000)}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={s.ticket}>
            {o.items.map((i, n) => (
              <View key={i.name} style={{ gap: 14 }}>
                {n > 0 ? <View style={{ height: 1, backgroundColor: colors.line }} /> : null}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Text style={s.item}>
                      {i.qty}× {i.name}
                    </Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.muted }}>{(i.qty * i.price).toLocaleString('en-US')}</Text>
                  </View>
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
            ))}
            {o.note ? <Note text={o.note} /> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.segmentText }}>Paid by {o.paid === 'MTN MoMo' ? 'MoMo' : o.paid}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.forest }}>UGX {orderTotal(o).toLocaleString('en-US')}</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 20, gap: 10 }}>
          <Text style={s.kicker}>Ready in</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {OPTIONS.map((m) => {
              const on = m === mins;
              return (
                <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setMins(m)} style={[s.option, on ? s.optionOn : null]}>
                  <Text style={{ fontFamily: on ? fonts.bold : fonts.semibold, fontSize: 15, color: on ? colors.forest : colors.cream }}>{m} min</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[s.actions, { bottom: 24 + insets.bottom }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Accept order ${o.id}`}
          onPress={() => {
            k.accept(o.id, mins);
            k.notify(`Order ${o.id} accepted${k.settings.printTicket ? ' and printed' : ''}`);
          }}
          style={({ pressed }) => [s.accept, { opacity: pressed ? 0.92 : 1 }]}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.forest }}>Accept · ready by {clock(readyBy)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decline order ${o.id}`}
          onPress={() => {
            k.decline(o.id);
            k.notify(`Order ${o.id} declined. ${o.student.split(' ')[0]} gets a full refund.`);
          }}
          style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: mint }}>Decline</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.forest },
  kicker: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.96, textTransform: 'uppercase', color: mint },
  countdown: { fontFamily: fonts.displayMedium, fontSize: 64, lineHeight: 68, color: colors.cream },
  track: { height: 6, borderRadius: 3, backgroundColor: '#2F5E48', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.orange },
  ticket: { backgroundColor: colors.cream, borderRadius: 22, padding: 18, gap: 14 },
  item: { fontFamily: fonts.bold, fontSize: 17, color: colors.forest },
  option: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#4F7A65', alignItems: 'center', justifyContent: 'center' },
  optionOn: { backgroundColor: colors.cream, borderWidth: 0 },
  actions: { position: 'absolute', left: 16, right: 16, gap: 6 },
  accept: { height: 60, borderRadius: 18, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
});
