import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lines } from '../../components/order';
import { BackHeader, Body, Button, Card, Icon, Label } from '../../components/ui';
import { clock, minutesUntil, orderTotal, useKitchen, type Status } from '../../lib/kitchen';
import { colors, fonts, formatUGX } from '../../lib/theme';

const STEPS: { key: Status; label: string }[] = [
  { key: 'incoming', label: 'Printed' },
  { key: 'cooking', label: 'Cooking' },
  { key: 'ready', label: 'Ready' },
  { key: 'picked', label: 'Picked up' },
];

function stepIndex(status: Status) {
  if (status === 'delivered') return 3;
  if (status === 'picked') return 3;
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
  const printed = [k.settings.printTicket && 'Ticket', k.settings.printSeal && 'bag seal and receipt'].filter(Boolean).join(', ');
  const riderHere = o.rider && o.rider.arrivesAt <= k.now;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <BackHeader kicker={o.tag ?? o.place} title={`${o.id} · ${o.student}`} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={s.stepper} accessibilityLabel={`Status: ${STEPS[step].label}`}>
          {STEPS.map((st, i) => (
            <View key={st.key} style={{ flex: 1, gap: 6 }}>
              <View style={[s.bar, { backgroundColor: i <= step ? colors.forest : colors.border }]} />
              <Text style={{ fontFamily: i === step ? fonts.bold : fonts.medium, fontSize: 12, color: i <= step ? colors.forest : colors.muted }}>{st.label}</Text>
            </View>
          ))}
        </View>

        {cooking ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label>Ready by</Label>
              <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.forest }}>{clock(o.dueAt)}</Text>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: left < 0 ? colors.orangeText : colors.muted }}>{left < 0 ? `${-left} min late` : `${left} min left`}</Text>
            </View>
            <Button variant="secondary" label="Add five minutes" onPress={() => k.addTime(o.id)} height={44}>
              +5 min
            </Button>
          </Card>
        ) : null}

        <Card style={{ gap: 12 }}>
          <Lines order={o} />
          {o.note ? (
            <View style={{ gap: 2 }}>
              <Label>Note</Label>
              <Text style={{ fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 22, color: colors.ink }}>“{o.note}”</Text>
            </View>
          ) : null}
          <View style={s.totalRow}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.muted }}>{o.paid}</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{formatUGX(orderTotal(o))}</Text>
          </View>
          {cooking ? (
            <Pressable accessibilityRole="button" onPress={() => setSwapping((v) => !v)} hitSlop={6}>
              <Text style={s.link}>Out of something? Offer a swap</Text>
            </Pressable>
          ) : null}
          {swapping ? (
            <View style={{ gap: 8 }}>
              <Body style={{ color: colors.muted }}>Which dish has run out? We’ll ask {o.student.split(' ')[0]} to pick something else or get a refund.</Body>
              {o.items.map((i) => (
                <Button
                  key={i.name}
                  variant="secondary"
                  height={44}
                  onPress={() => {
                    setSwapping(false);
                    k.notify(`Asked ${o.student.split(' ')[0]} about the ${i.name.toLowerCase()}`);
                  }}
                >
                  {`Out of ${i.name.toLowerCase()}`}
                </Button>
              ))}
            </View>
          ) : null}
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={s.iconWell}>
            <Icon name="printer" size={20} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.rowTitle}>{printed ? `${printed} printed` : 'Nothing printed'}</Text>
            <Text style={s.meta}>
              {clock(o.inAt)}
              {o.posSale ? ` · sale ${o.posSale} is in your POS` : ''}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Reprint order ${o.id}`} onPress={() => router.push(`/receipt/${o.id}`)} hitSlop={8}>
            <Text style={s.link}>Reprint</Text>
          </Pressable>
        </Card>

        {o.rider ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={s.iconWell}>
              <Icon name="navigation" size={20} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.rowTitle}>
                {o.status === 'picked' || o.status === 'delivered'
                  ? `${o.rider.name} picked it up at ${o.pickedAt ? clock(o.pickedAt) : ''}`
                  : riderHere
                    ? `${o.rider.name} is at the hatch`
                    : `${o.rider.name} arrives at ${clock(o.rider.arrivesAt)}`}
              </Text>
              <Text style={s.meta}>{o.status === 'delivered' ? `Delivered at ${o.deliveredAt ? clock(o.deliveredAt) : ''}` : 'He scans the bag seal. Nothing for you to do.'}</Text>
            </View>
          </Card>
        ) : null}
      </ScrollView>
      {cooking ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Button
            height={56}
            label={`Order ${o.id} is ready`}
            onPress={() => {
              k.markReady(o.id);
              router.back();
            }}
          >
            Ready
          </Button>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  stepper: { flexDirection: 'row', gap: 6 },
  bar: { height: 4, borderRadius: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.lineSoft, paddingTop: 10 },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.forest, textDecorationLine: 'underline' },
  iconWell: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
