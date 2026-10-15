import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bike, Note } from '../../components/order';
import { BackHeader, Body, Chip, DishPhoto, Icon } from '../../components/ui';
import { clock, minutesUntil, useKitchen, type Status } from '../../lib/kitchen';
import { colors, fonts, smallCaps } from '../../lib/theme';

const STEPS: { key: Status; label: string }[] = [
  { key: 'incoming', label: 'Printed' },
  { key: 'cooking', label: 'Cooking' },
  { key: 'ready', label: 'Ready' },
  { key: 'picked', label: 'Picked up' },
];

function stepIndex(status: Status) {
  if (status === 'delivered' || status === 'picked') return 3;
  if (status === 'ready') return 2;
  if (status === 'cooking') return 1;
  return 0;
}

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const k = useKitchen();
  const [swapping, setSwapping] = useState(false);
  const o = k.orders.find((x) => x.id === id);

  if (!o) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
        <BackHeader title="Order not found" />
      </SafeAreaView>
    );
  }

  const step = stepIndex(o.status);
  const left = minutesUntil(o.dueAt, k.now);
  const cooking = o.status === 'cooking';
  const printed = k.settings.printTicket && k.settings.printSeal ? 'Ticket, bag seal and receipt' : k.settings.printTicket ? 'Ticket' : k.settings.printSeal ? 'Bag seal and receipt' : '';
  const riderHere = o.rider && o.rider.arrivesAt <= k.now;
  const first = o.student.split(' ')[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <BackHeader
        title={
          <>
            {o.id} <Text style={{ fontFamily: fonts.displayItalic }}>{o.student}</Text>
          </>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 14, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 8 }} accessibilityLabel={`Status: ${STEPS[step].label}`}>
          <View style={s.grid}>
            {STEPS.map((st, i) => (
              <View key={st.key} style={[s.bar, { backgroundColor: i <= step ? colors.forest : colors.toggleOff }]} />
            ))}
          </View>
          <View style={s.grid}>
            {STEPS.map((st, i) => (
              <Text key={st.key} style={{ flex: 1, fontFamily: i === step ? fonts.bold : fonts.regular, fontSize: 12, color: i === step ? colors.forest : colors.muted }}>
                {st.label}
              </Text>
            ))}
          </View>
        </View>

        {cooking ? (
          <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginTop: 2 }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={smallCaps}>Ready by</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 33, color: colors.forest }}>
                {clock(o.dueAt)} <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.orangeText }}>{left < 0 ? `${-left} min late` : `${left} min left`}</Text>
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Add five minutes" onPress={() => k.addTime(o.id)} style={s.small}>
              <Text style={s.smallText}>+5 min</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[s.card, { padding: 16, gap: 12 }]}>
          {o.items.map((i) => (
            <View key={i.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <DishPhoto name={i.name} size={48} radius={12} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.item}>
                  {i.qty}× {i.name}
                </Text>
                {i.extras?.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {i.extras.map((e) => (
                      <Chip key={e} roomy>
                        {e}
                      </Chip>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ))}
          {o.note ? <Note text={o.note} /> : null}
          {cooking ? (
            <Pressable accessibilityRole="button" onPress={() => setSwapping((v) => !v)} style={s.swap}>
              <Text style={s.smallText}>Out of something? Offer a swap</Text>
            </Pressable>
          ) : null}
          {swapping ? (
            <View style={{ gap: 8 }}>
              <Body style={{ color: colors.muted }}>Which dish has run out? We’ll ask {first} to pick something else or get a refund.</Body>
              {o.items.map((i) => (
                <Pressable
                  key={i.name}
                  accessibilityRole="button"
                  style={s.swap}
                  onPress={() => {
                    setSwapping(false);
                    k.notify(`Asked ${first} about the ${i.name.toLowerCase()}`);
                  }}
                >
                  <Text style={s.smallText}>{`Out of ${i.name.toLowerCase()}`}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={[s.card, { paddingHorizontal: 16, paddingVertical: 6 }]}>
          <View style={[s.row, o.rider && { borderBottomWidth: 1, borderBottomColor: colors.lineSoft }]}>
            <View style={s.iconWell}>
              <Icon name="printer" size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{printed ? `${printed} printed` : 'Nothing printed'}</Text>
              <Text style={s.meta}>
                {clock(o.inAt)}
                {o.posSale ? ` · sale ${o.posSale} is in your POS` : ''}
              </Text>
            </View>
            <Pressable accessibilityRole="link" accessibilityLabel={`Reprint order ${o.id}`} onPress={() => router.push(`/receipt/${o.id}`)} style={{ height: 44, justifyContent: 'center' }}>
              <Text style={s.link}>Reprint</Text>
            </Pressable>
          </View>
          {o.rider ? (
            <View style={s.row}>
              <View style={s.iconWell}>
                <Bike />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>
                  {o.status === 'picked' || o.status === 'delivered'
                    ? `${o.rider.name} picked it up at ${o.pickedAt ? clock(o.pickedAt) : ''}`
                    : riderHere
                      ? `${o.rider.name} is at the counter`
                      : `${o.rider.name} arrives at ${clock(o.rider.arrivesAt)}`}
                </Text>
                <Text style={s.meta}>{o.status === 'delivered' ? `Delivered at ${o.deliveredAt ? clock(o.deliveredAt) : ''}` : 'He scans the bag seal. Nothing for you to do.'}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
      {cooking ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Order ${o.id} is ready`}
          onPress={() => {
            k.markReady(o.id);
            router.back();
          }}
          style={({ pressed }) => [s.ready, { opacity: pressed ? 0.9 : 1 }]}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.cream }}>Ready</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20 },
  small: { height: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.toggleOff, backgroundColor: colors.card, justifyContent: 'center' },
  smallText: { fontFamily: fonts.bold, fontSize: 14, color: colors.forest },
  item: { fontFamily: fonts.bold, fontSize: 16, color: colors.forest },
  swap: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.toggleOff, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  iconWell: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.lineSoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.forest, textDecorationLine: 'underline' },
  ready: { position: 'absolute', left: 16, right: 16, bottom: 24, height: 60, borderRadius: 18, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', shadowColor: colors.forest, shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
});
