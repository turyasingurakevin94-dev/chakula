import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Reminder } from '../components/alerts';
import { BackHeader, Label } from '../components/ui';
import { DEVICES, isLocked, ROWS, type Cell, type Device, type RowKey } from '../lib/alerts';
import { useKitchen } from '../lib/kitchen';
import { notifyStatus, ring, setupNotifications, type NotifyStatus } from '../lib/notify';
import { colors, fonts } from '../lib/theme';

const lockedBg = '#7C9A88';

// Who hears what: each alert on the counter tablet, the kitchen phone and the owner's phone.
// The ones that keep orders from being missed are locked on. As on the K-Settings board.
export default function Alerts() {
  const k = useKitchen();
  const [status, setStatus] = useState<NotifyStatus>(notifyStatus);
  const [preview, setPreview] = useState<'morning' | 'payout' | null>(null);
  useEffect(() => {
    let alive = true;
    setupNotifications().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <BackHeader title="Who hears what" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={s.bell}>
          <View style={s.bellIcon}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.cream} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
              <Path d="M10 21h4" />
            </Svg>
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.forest }}>Kitchen bell</Text>
            <Text style={s.meta}>Loud, even on silent. Heard over a busy kitchen.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Play the kitchen bell" onPress={() => ring({ kind: 'bell', title: 'Kitchen bell', body: 'This is how a new order sounds.' })} style={s.play}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>Play</Text>
          </Pressable>
        </View>

        <View style={s.table}>
          <View style={[s.grid, { backgroundColor: colors.segment, paddingTop: 12, paddingBottom: 8, alignItems: 'flex-end' }]}>
            <Text style={[s.caps, { flex: 1 }]}>Alert</Text>
            {DEVICES.map((d) => (
              <Text key={d.key} style={s.colHead}>
                {d.label.replace(' ', '\n')}
              </Text>
            ))}
          </View>
          {ROWS.map((r) => (
            <View key={r.key} style={[s.grid, { borderTopWidth: 1, borderTopColor: colors.lineSoft, paddingVertical: 8 }]}>
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>{r.title}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{r.detail}</Text>
              </View>
              {DEVICES.map((d) => (
                <View key={d.key} style={{ width: 58, alignItems: 'center' }}>
                  <Dot cell={r.cells[d.key]} on={k.hears[r.key][d.key]} label={`${r.title} on ${d.label}`} onChange={(v) => k.setHears(r.key as RowKey, d.key as Device, v)} />
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: lockedBg }} />
          <Text style={[s.meta, { flex: 1, fontSize: 12, lineHeight: 17 }]}>Always on: these keep orders from being missed.</Text>
        </View>

        <View style={{ gap: 10, paddingTop: 4 }}>
          <Label>See them now</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityRole="button" onPress={() => setPreview('morning')} style={s.try}>
              <Text style={s.tryText}>Morning prep list</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setPreview('payout')} style={s.try}>
              <Text style={s.tryText}>Tonight’s payout</Text>
            </Pressable>
          </View>
          <Text style={[s.meta, { paddingHorizontal: 4, fontSize: 12, lineHeight: 17 }]}>
            {status === 'native'
              ? 'This phone rings on the lock screen. The prep list comes at 8:00 am and the payout at 9:30 pm.'
              : status === 'denied'
                ? 'Notifications are off for Chakula Kitchen in this phone’s settings, so alerts only show while the app is open.'
                : 'This version shows alerts inside the app only. Install the latest Kitchen app to hear them on the lock screen.'}{' '}
            The owner’s phone and texts start once Chakula’s servers are connected.
          </Text>
        </View>
      </ScrollView>
      {preview ? <Reminder kind={preview} onClose={() => setPreview(null)} /> : null}
    </SafeAreaView>
  );
}

function Dot({ cell, on, label, onChange }: { cell: Cell; on: boolean; label: string; onChange: (v: boolean) => void }) {
  if (cell === 'none') return <View style={[s.dot, { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }]} accessibilityLabel={`${label}: not offered`} />;
  if (isLocked(cell))
    return (
      <View style={[s.dot, { backgroundColor: lockedBg }]} accessibilityLabel={`${label}: always on${cell === 'sms' ? ', by text message' : ''}`}>
        {cell === 'sms' ? <Text style={{ fontFamily: fonts.bold, fontSize: 9, color: '#FFFFFF' }}>SMS</Text> : <Tick color="#FFFFFF" />}
      </View>
    );
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      hitSlop={8}
      onPress={() => onChange(!on)}
      style={[s.dot, on ? { backgroundColor: colors.forest } : { borderWidth: 1.5, borderColor: '#CFC3B3', backgroundColor: colors.card }]}
    >
      {on ? <Tick color={colors.cream} /> : null}
    </Pressable>
  );
}

function Tick({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

const s = StyleSheet.create({
  bell: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.forest,
    shadowOpacity: 0.06,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  bellIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  play: { height: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  table: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, overflow: 'hidden' },
  grid: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 12 },
  caps: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.32, textTransform: 'uppercase', color: colors.muted },
  colHead: { width: 58, fontFamily: fonts.bold, fontSize: 11, lineHeight: 13, color: colors.forest, textAlign: 'center' },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  try: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  tryText: { fontFamily: fonts.bold, fontSize: 14, color: colors.forest },
});
