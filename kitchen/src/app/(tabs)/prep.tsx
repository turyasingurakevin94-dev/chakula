import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, Display, Icon, Label, Segments, type IconName } from '../../components/ui';
import { clock, nextDrop, useKitchen } from '../../lib/kitchen';
import { onServer } from '../../lib/server';
import { colors, fonts } from '../../lib/theme';

type Tab = 'scheduled' | 'plans' | 'specials';
const MIN = 60_000;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const mint = '#CFE0D3';

// Work that is known ahead of time: scheduled drops, meal plan suppers and the weekly special.
export default function Prep() {
  const k = useKitchen();
  const [tab, setTab] = useState<Tab>('scheduled');
  const d = new Date(k.now);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 2 }}>
          <Label>
            {DAYS[d.getDay()]} · {clock(k.now)}
          </Label>
          <Display>Prep</Display>
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
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
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
          {onServer ? (
            // The server has no scheduled orders, meal plans or specials yet: say so rather than show samples.
            tab === 'scheduled' ? (
              <Empty icon="calendar" title="No scheduled orders yet" text="Orders students book ahead for a set drop time will show here, with what to start and when." />
            ) : tab === 'plans' ? (
              <Empty icon="users" title="No meal plans yet" text="When students subscribe to your lunches or suppers, their picks will add up here." />
            ) : (
              <Empty icon="star" title="No specials yet" text="Weekend specials students pre-order will show here, with portions taken." />
            )
          ) : tab === 'scheduled' ? (
            <Scheduled now={k.now} />
          ) : tab === 'plans' ? (
            <Plans now={k.now} />
          ) : (
            <Specials />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Empty({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 20 }}>
      <Icon name={icon} size={26} color={colors.sub} />
      <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.forest, textAlign: 'center' }}>{title}</Text>
      <Body style={{ textAlign: 'center', color: colors.muted, maxWidth: 280 }}>{text}</Body>
    </Card>
  );
}

function Hero({ children }: { children: ReactNode }) {
  return <View style={s.hero}>{children}</View>;
}

function Row({ title, sub, subStyle, right, onPress }: { title: string; sub: string; subStyle?: object; right?: ReactNode; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress} style={s.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={[s.meta, subStyle]}>{sub}</Text>
      </View>
      {right ?? (onPress ? <Icon name="chevron-right" size={20} color={colors.chevron} /> : null)}
    </Pressable>
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
      <Hero>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 2 }}>
            <Text style={s.heroLabel}>After lectures</Text>
            <Text style={s.heroTitle}>
              {clock(drop)} <Text style={{ fontFamily: fonts.displayItalic }}>drop</Text>
            </Text>
          </View>
          <View style={s.startBy}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#2B1408' }}>Start by {clock(start)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {lines.map((l) => (
            <View key={l.name} style={[s.tile, { width: '48.5%' }]}>
              <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.cream }}>{l.qty}×</Text>
              <Text style={s.tileText}>{l.name}</Text>
            </View>
          ))}
        </View>
        <Text style={s.heroText}>6 orders to Block A, Block B and the library. Extras and notes are on each order.</Text>
        <Pressable accessibilityRole="button" onPress={() => k.notify(`All 6 tickets will print at ${clock(start)}`)} style={[s.outline, { height: 52, borderRadius: 16 }]}>
          <Icon name="printer" size={18} color={colors.cream} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.cream }}>All 6 tickets print at {clock(start)}</Text>
        </Pressable>
      </Hero>
      <View style={[s.card, { paddingHorizontal: 16, paddingVertical: 14, gap: 6 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.forest }}>6:30 drop</Text>
          <Text style={s.meta}>start by 6:10</Text>
        </View>
        <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.segmentText }}>3 orders · 2× Chicken pilau, 1× Katogo, 2× Soda</Text>
      </View>
      <Row title="Tomorrow" sub="11 booked so far, busiest at 1:00" onPress={() => k.notify('Tomorrow’s bookings open here')} />
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
    { name: 'Not picked yet', n: 7, open: true },
  ];
  return (
    <>
      <View style={[s.card, { borderRadius: 24, padding: 18, gap: 14 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Label>{"Tonight's supper · 38 meals"}</Label>
            <Text style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.forest }}>
              Picks close at <Text style={{ fontFamily: fonts.displayItalic }}>3:00</Text>
            </Text>
          </View>
          <View style={[s.pill, { backgroundColor: colors.lineSoft, height: 30, borderRadius: 15, paddingHorizontal: 12 }]}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.forest }}>{left > 0 ? `in ${Math.floor(left / 60)} h ${left % 60} m` : 'closed'}</Text>
          </View>
        </View>
        <View style={{ gap: 10 }}>
          {picks.map((p) => (
            <View key={p.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ flex: 1, fontFamily: p.open ? fonts.regular : fonts.semibold, fontSize: 14, color: p.open ? colors.segmentText : colors.ink }}>{p.name}</Text>
              <View style={s.track}>
                <View style={[s.fill, { width: `${(p.n / 38) * 100}%`, backgroundColor: p.open ? colors.orange : colors.forest }]} />
              </View>
              <Text style={{ width: 28, textAlign: 'right', fontFamily: fonts.bold, fontSize: 14, color: p.open ? colors.orangeText : colors.forest }}>{p.n}</Text>
            </View>
          ))}
        </View>
        <View style={{ backgroundColor: colors.lineSoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.segmentText }}>
            {"Anyone who doesn't pick gets your choice,"} <Text style={{ fontFamily: fonts.bold, color: colors.forest }}>Chicken pilau</Text>. 3 skipped tonight; those meals went back to their plans.
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.forest }}>One drop at 7:00 pm</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {['Block A · 12', 'Block B · 15', 'Library · 11'].map((b) => (
              <View key={b} style={s.place}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink }}>{b}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <Row
        title="Lunch · 46 meals"
        sub="Picks closed 9:00 · drop at 12:45"
        right={
          <View style={[s.pill, { backgroundColor: colors.forest }]}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.cream }}>Cooking</Text>
          </View>
        }
      />
      <Row title="Choose tomorrow's 3 dishes" sub="Students start picking at 6:00 pm" subStyle={{ color: colors.orangeText, fontFamily: fonts.semibold }} onPress={() => k.notify('Students start picking at 6:00 pm')} />
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
      <Hero>
        <View style={{ gap: 2 }}>
          <Text style={s.heroLabel}>{"This Sunday's special"}</Text>
          <Text style={s.heroTitle}>
            Chicken <Text style={{ fontFamily: fonts.displayItalic }}>luwombo</Text>
          </Text>
          <Text style={s.heroText}>UGX 15,000 · steamed in banana leaves</Text>
        </View>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.cream }}>
              {taken} of {portions} portions taken
            </Text>
            <Text style={s.heroText}>{closed ? 'Closed' : `${portions - taken} left`}</Text>
          </View>
          <View style={[s.track, { width: '100%', backgroundColor: '#2F5E48' }]}>
            <View style={[s.fill, { width: `${(taken / portions) * 100}%`, backgroundColor: colors.orange }]} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {slots.map((sl) => (
            <View key={sl.time} style={[s.tile, { flex: 1 }]}>
              <Text style={s.tileText}>{sl.time}</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.cream }}>{sl.n}</Text>
            </View>
          ))}
        </View>
        <Text style={s.heroText}>Pre-orders close Saturday at 8:00 pm, so you can shop on Saturday night.</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setClosed(true);
              k.notify('Pre-orders closed for Sunday');
            }}
            style={[s.outline, { flex: 1 }]}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.cream }}>Close early</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPortions((p) => p + 5);
              setClosed(false);
              k.notify('5 more portions added');
            }}
            style={[s.outline, { flex: 1, backgroundColor: colors.cream, borderWidth: 0 }]}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>Add portions</Text>
          </Pressable>
        </View>
      </Hero>
      <Row
        title="Last Sunday · Goat pilau"
        sub="40 of 40 sold by Friday · 4.9 stars"
        right={
          <View style={[s.pill, { backgroundColor: colors.lineSoft }]}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.forest }}>Sold out</Text>
          </View>
        }
      />
      <Pressable accessibilityRole="button" onPress={() => k.notify("Next week's special opens on Monday")} style={s.dashed}>
        <Icon name="plus" size={18} />
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{"Plan next week's special"}</Text>
      </Pressable>
    </>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.forest, borderRadius: 24, padding: 18, gap: 14 },
  heroLabel: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.96, textTransform: 'uppercase', color: mint },
  heroTitle: { fontFamily: fonts.displayMedium, fontSize: 30, lineHeight: 33, color: colors.cream },
  heroText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: mint },
  startBy: { height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.orange, justifyContent: 'center' },
  tile: { backgroundColor: colors.forestMid, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  tileText: { fontFamily: fonts.regular, fontSize: 13, color: mint },
  outline: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#4F7A65', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18 },
  row: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  pill: { height: 28, paddingHorizontal: 10, borderRadius: 14, justifyContent: 'center' },
  track: { width: 120, height: 10, borderRadius: 5, backgroundColor: colors.lineSoft, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  place: { height: 30, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
  dashed: { height: 56, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C9B9A3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
