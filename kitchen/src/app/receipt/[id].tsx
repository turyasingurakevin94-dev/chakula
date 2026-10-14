import { useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader, Body, Button, Label } from '../../components/ui';
import { clock, cookingQueue, ordinal, orderTotal, useKitchen } from '../../lib/kitchen';
import { colors } from '../../lib/theme';

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const n = (v: number) => v.toLocaleString('en-US');

// What the 58 mm printer puts out for one order: kitchen ticket, bag seal, student's receipt.
export default function Receipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const k = useKitchen();
  const o = k.orders.find((x) => x.id === id);
  if (!o) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
        <BackHeader title="Order not found" />
      </SafeAreaView>
    );
  }
  const first = o.student.split(' ')[0];
  const rank = cookingQueue(k.orders).findIndex((x) => x.id === o.id);
  const d = new Date(o.inAt);
  const sealedAt = o.readyAt ?? o.dueAt - 60_000;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <BackHeader kicker="58 mm · black ink only" title={`Prints for ${o.id}`} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
        <Piece n="1" title="Kitchen ticket">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Text style={[t.mono, { fontSize: 40, fontWeight: '700' }]}>{o.id}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[t.mono, { fontSize: 11 }]}>DUE</Text>
              <Text style={[t.mono, { fontSize: 22, fontWeight: '700' }]}>{clock(o.dueAt)}</Text>
            </View>
          </View>
          <Text style={t.mono}>
            {first} · {o.place.split(',')[0]}
            {rank >= 0 ? `   ${ordinal(rank + 1)} in line` : ''}
          </Text>
          <Rule />
          {o.items.map((i) => (
            <View key={i.name} style={{ gap: 4 }}>
              <Text style={[t.mono, { fontSize: 18, fontWeight: '700' }]}>
                {i.qty}  {i.name}
              </Text>
              {(i.extras ?? []).map((e) => (
                <View key={e} style={t.bar}>
                  <Text style={[t.mono, { color: '#fff', fontWeight: '700' }]}>{e.startsWith('No ') ? e.toUpperCase() : `+ ${e.toUpperCase()}`}</Text>
                </View>
              ))}
            </View>
          ))}
          {o.note ? (
            <>
              <Rule />
              <Text style={[t.mono, { fontWeight: '700' }]}>NOTE</Text>
              <Text style={t.mono}>{o.note}</Text>
            </>
          ) : null}
          <Rule />
          <Text style={[t.mono, { fontSize: 11 }]}>
            PRINTED {clock(o.inAt)}
            {o.rider ? `   RIDER ${clock(o.rider.arrivesAt)}` : ''}
          </Text>
        </Piece>

        <Piece n="2" title="Bag seal sticker">
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={t.code} accessibilityLabel="Scan code">
              {Array.from({ length: 25 }, (_, i) => (
                <View key={i} style={{ width: 12, height: 12, backgroundColor: (i * 7 + Number(o.id)) % 3 ? '#111' : '#fff' }} />
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.mono, { fontSize: 11 }]}>SEALED FOR</Text>
              <Text style={[t.mono, { fontSize: 16, fontWeight: '700' }]}>{o.student}</Text>
              <Text style={t.mono}>{o.place}</Text>
              <Text style={[t.mono, { fontSize: 26, fontWeight: '700' }]}>{o.id}</Text>
            </View>
          </View>
          <Rule />
          <Text style={[t.mono, { fontWeight: '700' }]}>Rider scans to pick up</Text>
          <Text style={[t.mono, { fontSize: 11 }]}>Sealed at Nakawa Kitchen, {clock(sealedAt)}. If this seal is broken, tell us in the app.</Text>
        </Piece>

        <Piece n="3" title="Student's receipt">
          <Text style={[t.mono, { fontSize: 20, fontWeight: '700', textAlign: 'center' }]}>Chakula</Text>
          <Text style={[t.mono, { fontSize: 11, textAlign: 'center' }]}>Campus dining, done properly.</Text>
          <Rule />
          <Row a="KITCHEN" b="Nakawa Kitchen" />
          <Row a="ORDER" b={o.id} />
          <Row a="DATE" b={`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${clock(o.inAt)}`} />
          <Row a="PAID" b={o.paid} />
          <Rule />
          {o.items.map((i) => {
            const extras = (i.extras ?? []).filter((e) => !e.startsWith('No '));
            const extraEach = extras.length ? (i.price - (k.dishes.find((x) => x.name === i.name)?.price ?? i.price)) / extras.length : 0;
            return (
              <View key={i.name}>
                <Row a={`${i.qty} ${i.name}`} b={n((i.price - extraEach * extras.length) * i.qty)} />
                {extras.map((e) => (
                  <Row key={e} a={`  ${e} × ${i.qty}`} b={n(extraEach * i.qty)} />
                ))}
                {(i.extras ?? [])
                  .filter((e) => e.startsWith('No '))
                  .map((e) => (
                    <Row key={e} a={`  ${e}`} b="" />
                  ))}
              </View>
            );
          })}
          <Rule />
          <Row a="TOTAL UGX" b={n(orderTotal(o))} bold />
          <Text style={[t.mono, { fontSize: 11 }]}>EFRIS FDN {o.posSale ? `from your POS, sale ${o.posSale}` : '[from your POS]'}</Text>
          <Rule />
          <Text style={[t.mono, { textAlign: 'center' }]}>Thank you, {first}.</Text>
          <Text style={[t.mono, { fontSize: 11, textAlign: 'center' }]}>Rate your meal in the Chakula app</Text>
        </Piece>
        <Body style={{ color: colors.muted, textAlign: 'center', maxWidth: 320 }}>One print run, three pieces. The cook reads the ticket, the seal closes the bag, the student keeps the receipt.</Body>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Button icon="printer" height={56} onPress={() => k.notify(`Order ${o.id} sent to the printer again`)}>
          Reprint all three
        </Button>
      </View>
    </SafeAreaView>
  );
}

function Piece({ n: num, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <View style={{ width: '100%', maxWidth: 340, gap: 8 }}>
      <Label>
        {num} · {title}
      </Label>
      <View style={t.paper}>{children}</View>
    </View>
  );
}

function Rule() {
  return <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#555', marginVertical: 4 }} />;
}

function Row({ a, b, bold }: { a: string; b: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={[t.mono, { flex: 1 }, bold && { fontWeight: '700' }]}>{a}</Text>
      <Text style={[t.mono, bold && { fontWeight: '700' }]}>{b}</Text>
    </View>
  );
}

const t = StyleSheet.create({
  paper: { backgroundColor: '#FFFFFF', padding: 16, gap: 6, borderRadius: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  mono: { fontFamily: mono, fontSize: 13, color: '#111' },
  bar: { alignSelf: 'flex-start', backgroundColor: '#111', paddingHorizontal: 6, paddingVertical: 2 },
  code: { width: 60, height: 60, flexDirection: 'row', flexWrap: 'wrap' },
});
