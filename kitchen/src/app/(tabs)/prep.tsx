import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, Card, Display, Italic, Label, Segments } from '../../components/ui';
import { clock, nextDrop, useKitchen } from '../../lib/kitchen';
import { colors, fonts } from '../../lib/theme';

type Tab = 'scheduled' | 'plans' | 'specials';
const MIN = 60_000;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Work that is known ahead of time: scheduled drops, meal plan suppers and the weekly special.
export default function Prep() {
  const k = useKitchen();
  const [tab, setTab] = useState<Tab>('scheduled');
  const d = new Date(k.now);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 2 }}>
          <Label style={{ color: colors.muted }}>
            {DAYS[d.getDay()]} · {clock(k.now)}
          </Label>
          <Display>Prep</Display>
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Segments<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { key: 'scheduled', label: 'Scheduled' },
              { key: 'plans', label: 'Meal plans' },
              { key: 'specials', label: 'Specials' },
            ]}
          />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 12 }}>{tab === 'scheduled' ? <Scheduled now={k.now} /> : tab === 'plans' ? <Plans now={k.now} /> : <Specials />}</View>
      </ScrollView>
    </SafeAreaView>
  );
}


function Scheduled({ now }: { now: number }) {
  const k = useKitchen();
  const drop = nextDrop(now);
  const start = drop - 20 * MIN;
  const lines = [
    { qty: 3, name: 'Chicken pilau' },
    { qty: 2, name: 'Katogo' },
    { qty: 2, name: 'Special rolex' },
    { qty: 3, name: 'Passion juice' },
  ];
  return (
    <>
      <Card highlight style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Label style={{ color: colors.orangeText }}>After lectures</Label>
            <Display size={30}>
              {clock(drop)} <Italic>drop</Italic>
            </Display>
          </View>
          <View style={s.pill}>
            <Text style={s.pillText}>Start by {clock(start)}</Text>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          {lines.map((l) => (
            <View key={l.name} style={s.prepRow}>
              <Text style={s.qty}>{l.qty}×</Text>
              <Text style={s.prepName}>{l.name}</Text>
            </View>
          ))}
        </View>
        <Body style={{ color: colors.muted }}>6 orders to Block A, Block B and the library. Extras and notes are on each order.</Body>
        <Button variant="secondary" icon="printer" height={44} onPress={() => k.notify(`All 6 tickets will print at ${clock(start)}`)}>
          {`All 6 tickets print at ${clock(start)}`}
        </Button>
      </Card>
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.rowTitle}>6:30 drop</Text>
          <Text style={s.meta}>start by 6:10</Text>
        </View>
        <Text style={s.meta}>3 orders · 2× Chicken pilau, 1× Katogo, 2× Soda</Text>
      </Card>
      <Card style={{ gap: 4 }}>
        <Text style={s.rowTitle}>Tomorrow</Text>
        <Text style={s.meta}>11 booked so far, busiest at 1:00</Text>
      </Card>
    </>
  );
}

function Plans({ now }: { now: number }) {
  const k = useKitchen();
  const close = new Date(now);
  close.setHours(15, 0, 0, 0);
  const left = Math.max(0, Math.round((close.getTime() - now) / MIN));
  const picks = [
    { name: 'Chicken pilau', n: 14 },
    { name: 'Katogo', n: 10 },
    { name: 'Special rolex', n: 7 },
    { name: 'Not picked yet', n: 7 },
  ];
  return (
    <>
      <Card style={{ gap: 12 }}>
        <View>
          <Label>Tonight’s supper</Label>
          <Display size={30}>
            38 <Italic>meals</Italic>
          </Display>
        </View>
        <View style={s.closeRow}>
          <Text style={s.meta}>Picks close at</Text>
          <Text style={s.rowTitle}>3:00</Text>
          <Text style={[s.meta, { marginLeft: 'auto' }]}>{left > 0 ? `in ${Math.floor(left / 60)} h ${left % 60} m` : 'closed'}</Text>
        </View>
        <View style={{ gap: 8 }}>
          {picks.map((p) => (
            <View key={p.name} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[s.prepName, p.name === 'Not picked yet' && { color: colors.muted }]}>{p.name}</Text>
                <Text style={s.rowTitle}>{p.n}</Text>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${(p.n / 38) * 100}%`, backgroundColor: p.name === 'Not picked yet' ? colors.border : colors.forest }]} />
              </View>
            </View>
          ))}
        </View>
        <Body style={{ color: colors.muted }}>
          Anyone who doesn’t pick gets your choice, <Text style={{ fontFamily: fonts.bold, color: colors.forest }}>Chicken pilau</Text>. 3 skipped tonight; those meals went back to their plans.
        </Body>
        <View style={s.dropBox}>
          <Text style={s.rowTitle}>One drop at 7:00 pm</Text>
          <Text style={s.meta}>Block A · 12   Block B · 15   Library · 11</Text>
        </View>
      </Card>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.rowTitle}>Lunch · 46 meals</Text>
          <Text style={s.meta}>Picks closed 9:00 · drop at 12:45</Text>
        </View>
        <View style={[s.pill, { backgroundColor: colors.sage }]}>
          <Text style={[s.pillText, { color: colors.forest }]}>Cooking</Text>
        </View>
      </Card>
      <Button variant="secondary" height={48} onPress={() => k.notify('Students start picking at 6:00 pm')}>
        Choose tomorrow’s 3 dishes
      </Button>
    </>
  );
}

function Specials() {
  const k = useKitchen();
  const [portions, setPortions] = useState(40);
  const [closed, setClosed] = useState(false);
  const taken = 28;
  const slots = [
    { time: '12:00', n: 12 },
    { time: '1:00', n: 10 },
    { time: '6:30', n: 6 },
  ];
  return (
    <>
      <Card style={{ gap: 12 }}>
        <Label style={{ color: colors.orangeText }}>This Sunday’s special</Label>
        <Display size={32}>
          Chicken <Italic>luwombo</Italic>
        </Display>
        <Text style={s.meta}>UGX 15,000 · steamed in banana leaves</Text>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.prepName}>
              {taken} of {portions} portions taken
            </Text>
            <Text style={[s.rowTitle, { color: colors.orangeText }]}>{closed ? 'Closed' : `${portions - taken} left`}</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: `${(taken / portions) * 100}%`, backgroundColor: colors.orange }]} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {slots.map((sl) => (
            <View key={sl.time} style={s.slot}>
              <Text style={s.meta}>{sl.time}</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.forest }}>{sl.n}</Text>
            </View>
          ))}
        </View>
        <Body style={{ color: colors.muted }}>Pre-orders close Saturday at 8:00 pm, so you can shop on Saturday night.</Body>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            variant="secondary"
            height={44}
            style={{ flex: 1 }}
            onPress={() => {
              setClosed(true);
              k.notify('Pre-orders closed for Sunday');
            }}
          >
            Close early
          </Button>
          <Button
            height={44}
            style={{ flex: 1 }}
            onPress={() => {
              setPortions((p) => p + 5);
              setClosed(false);
              k.notify('5 more portions added');
            }}
          >
            Add portions
          </Button>
        </View>
      </Card>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.rowTitle}>Last Sunday · Goat pilau</Text>
          <Text style={s.meta}>40 of 40 sold by Friday · 4.9 stars</Text>
        </View>
        <View style={[s.pill, { backgroundColor: colors.peach }]}>
          <Text style={[s.pillText, { color: colors.orangeText }]}>Sold out</Text>
        </View>
      </Card>
      <Button variant="secondary" height={48} onPress={() => k.notify("Next week's special opens on Monday")}>
        Plan next week’s special
      </Button>
    </>
  );
}

const s = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.peach },
  pillText: { fontFamily: fonts.bold, fontSize: 13, color: colors.orangeText },
  prepRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  qty: { fontFamily: fonts.display, fontSize: 22, color: colors.forest, minWidth: 34 },
  prepName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  rowTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  closeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.well, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.tile, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  dropBox: { backgroundColor: colors.well, borderRadius: 12, padding: 12, gap: 2 },
  slot: { flex: 1, alignItems: 'center', backgroundColor: colors.well, borderRadius: 12, paddingVertical: 8 },
});
