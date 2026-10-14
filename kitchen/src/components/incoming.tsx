import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clock, orderTotal, useKitchen } from '../lib/kitchen';
import { colors, fonts, formatUGX } from '../lib/theme';
import { Lines } from './order';
import { Button, Label, Segments } from './ui';

type Ready = '10' | '15' | '20';

// Only seen when "Accept it for me" is off: each new order waits here until someone accepts it.
export function Incoming() {
  const k = useKitchen();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState<Ready>('15');
  // The shared clock ticks every 5 seconds; the countdown needs every second.
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const o = k.orders.filter((x) => x.status === 'incoming').sort((a, b) => a.inAt - b.inAt)[0];
  if (!o) return null;

  const secs = Math.max(0, Math.round(((o.acceptBy ?? t) - t) / 1000));
  const mins = Number(ready);

  return (
    <View style={s.backdrop} accessibilityViewIsModal>
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <ScrollView contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label style={{ color: colors.orangeText }}>New order · {clock(o.inAt)}</Label>
              <Text style={s.id}>{o.id}</Text>
              <Text style={s.student}>
                {o.student} · {o.place}
              </Text>
            </View>
            <View style={s.timer} accessibilityLabel={`${Math.floor(secs / 60)} minutes ${secs % 60} seconds left to accept`}>
              <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.forest }}>
                {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
              </Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.muted }}>left to accept</Text>
            </View>
          </View>
          <View style={s.box}>
            <Lines order={o} />
            {o.note ? <Text style={s.note}>“{o.note}”</Text> : null}
            <View style={s.total}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.muted }}>Paid by {o.paid}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{formatUGX(orderTotal(o))}</Text>
            </View>
          </View>
          <Label>Ready in</Label>
          <Segments<Ready>
            value={ready}
            onChange={setReady}
            options={[
              { key: '10', label: '10 min' },
              { key: '15', label: '15 min' },
              { key: '20', label: '20 min' },
            ]}
          />
          <Button height={56} label={`Accept order ${o.id}`} onPress={() => { k.accept(o.id, mins); k.notify(`Order ${o.id} accepted${k.settings.printTicket ? ' and printed' : ''}`); }}>
            {`Accept · ready by ${clock(t + mins * 60_000)}`}
          </Button>
          <Button variant="secondary" height={48} label={`Decline order ${o.id}`} onPress={() => { k.decline(o.id); k.notify(`Order ${o.id} declined. ${o.student.split(' ')[0]} gets a full refund.`); }}>
            Decline
          </Button>
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(27,67,50,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 22, maxHeight: '92%', width: '100%', maxWidth: 560, alignSelf: 'center' },
  id: { fontFamily: fonts.display, fontSize: 44, lineHeight: 50, color: colors.forest },
  student: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  timer: { alignItems: 'center', backgroundColor: colors.peach, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  box: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 14, gap: 10 },
  note: { fontFamily: fonts.displayItalic, fontSize: 15, lineHeight: 21, color: colors.ink },
  total: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.lineSoft, paddingTop: 10 },
});
