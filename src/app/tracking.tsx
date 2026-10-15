import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Display, Icon, IconButton, PrimaryButton } from '../components/ui';
import { DELIVERY_MINUTES, formatClock, minutesLeft, useAccount, useNow } from '../lib/account';
import { useAlerts } from '../lib/alerts';
import { findRestaurant } from '../lib/data';
import { blockName, rider, stageOf } from '../lib/stages';
import { colors, fonts, smallCaps } from '../lib/theme';

const MIN = 60 * 1000;

export default function Tracking() {
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const alerts = useAlerts();
  const now = useNow();
  // Show the latest order, which stays on screen after it is delivered.
  const order = account.activeOrder ?? account.orders[0]!;
  const active = !!account.activeOrder;
  const restaurant = findRestaurant(order.restaurantId) ?? findRestaurant('nakawa-kitchen')!;
  // Prototype only: the order moves forward on a timer. The rider app will drive this for real.
  const minutes = active ? minutesLeft(order, now) : 0;
  const stage = stageOf(order, active, now);
  const waiting = stage === 0;
  const arrived = stage === 4;
  // Clock times for each step, counted in real minutes from when the kitchen starts.
  const start = order.scheduledFor ? order.scheduledFor - DELIVERY_MINUTES * MIN : order.placedAt;
  const arriveBy = order.scheduledFor ?? order.placedAt + DELIVERY_MINUTES * MIN;
  const block = blockName(account.place?.name);
  const atGate = stage === 3;
  const room = account.room || 'your door';
  const steps = [
    { label: 'Order confirmed', time: order.placedAt },
    { label: stage === 1 ? 'Being cooked' : 'Cooked and packed', time: start + 2 * MIN },
    { label: 'On the way', time: start + 3 * MIN },
    { label: `At ${block} gate`, time: arriveBy - MIN },
    { label: `At ${room}`, time: arriveBy },
  ];
  // How far along the route the rider dot is.
  const progress = stage <= 1 ? 0 : arrived ? 1 : Math.min(1, (DELIVERY_MINUTES - 2 - minutes) / (DELIVERY_MINUTES - 2) + 0.15);

  useEffect(() => {
    if (minutes === 0 && active && !waiting) account.markDelivered(order.id);
  }, [minutes, active, waiting]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={{ height: 300 + insets.top, backgroundColor: colors.map, paddingTop: insets.top }}>
          <MapSketch kitchen={restaurant.name} gate={`${block} gate`} progress={progress} />
          <IconButton icon="chevron-left" label="Back" size={40} onPress={() => router.dismissTo('/')} style={{ position: 'absolute', left: 16, top: insets.top + 16 }} />
        </View>

        <View style={s.sheet}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ gap: 4 }}>
              {waiting && order.scheduledFor ? (
                <>
                  <Text style={smallCaps}>Scheduled · kitchen starts at {formatClock(start)}</Text>
                  <Display size={34} style={{ lineHeight: 36 }}>
                    {formatClock(order.scheduledFor, true)}
                  </Display>
                </>
              ) : arrived ? (
                <>
                  <Text style={smallCaps}>Delivered {formatClock(arriveBy)}</Text>
                  <Display size={34} style={{ lineHeight: 36 }}>
                    Enjoy your food
                  </Display>
                </>
              ) : (
                <>
                  <Text style={smallCaps}>Arriving by {formatClock(arriveBy)}</Text>
                  <Display size={34} style={{ lineHeight: 36 }}>
                    {minutes} min
                  </Display>
                </>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 4 }}>
              <Icon name="check" size={13} color={colors.green} />
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.green }}>On time</Text>
            </View>
          </View>

          <View style={s.rider}>
            <View style={s.riderAvatar}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.cream }}>BK</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }} numberOfLines={1}>
                {waiting ? 'Brian will bring your food' : arrived ? 'Brian brought your food' : 'Brian is bringing your food'}
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }} numberOfLines={1}>
                ★ 4.9 · red helmet · UBF 412K
              </Text>
            </View>
            <IconButton icon="phone" label="Call Brian" variant="outline" size={42} style={{ borderColor: colors.forest }} />
          </View>

          {active && !arrived ? (
            <View style={s.codeCard} accessible accessibilityLabel={`Your handover code is ${order.code.split('').join(' ')}`}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={smallCaps}>Your code</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted }}>
                  {atGate ? `Say it to ${rider.name}` : `Show it to ${rider.name} at the gate`}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {order.code.split('').map((d, i) => (
                  <View key={i} style={s.digit}>
                    <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.forest }}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {active && !arrived && account.alertPrefs.sms && alerts.permission !== 'granted' && stage >= 2 ? (
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: -6 }}>Phone alerts are off, so we’ll also text this code to {account.maskedPhone || 'your phone'}.</Text>
          ) : null}

          {atGate && active ? (
            order.comingDownAt ? (
              <View style={s.coming} accessibilityLiveRegion="polite">
                <View style={s.comingIcon}>
                  <Icon name="check" size={18} />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{rider.name} knows you’re coming</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>He’ll wait at the {block} gate. Nobody will call you.</Text>
                </View>
              </View>
            ) : (
              <PrimaryButton floating label="I'm coming down" onPress={() => account.comingDown(order.id)}>
                I’m coming down
              </PrimaryButton>
            )
          ) : null}

          <View style={{ gap: 14, paddingHorizontal: 4 }} accessibilityRole="progressbar" accessibilityLabel={`Order status: ${steps[Math.min(stage, 4)]!.label}`}>
            {steps.map((st, i) => {
              const done = i < stage || (arrived && i === 4);
              const current = i === stage && !arrived;
              return (
                <View key={st.label} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                  {i < steps.length - 1 ? <View style={[s.rail, { backgroundColor: i < stage ? colors.forest : colors.border }]} /> : null}
                  <View style={[s.dot, done ? { backgroundColor: colors.forest } : current ? s.dotNow : s.dotTodo]} />
                  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, fontFamily: current ? fonts.bold : fonts.medium, color: done || current ? colors.forest : colors.sub }}>{st.label}</Text>
                    <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: done || current ? colors.forest : colors.sub }}>{current && i > 0 ? 'now' : formatClock(st.time)}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted }}>
            We’ll alert you when Brian reaches your block. If he’s more than 10 minutes late, your next delivery is free.
          </Text>

          {arrived && !order.rating ? <PrimaryButton floating label="Rate your order" onPress={() => router.push({ pathname: '/rate', params: { id: order.id } })}>Got it? Rate your order</PrimaryButton> : null}
        </View>
      </ScrollView>
    </View>
  );
}

// The route from the board, as two cubic curves: kitchen (60,60) to the gate (300,225).
const route: [number, number][][] = [
  [
    [60, 60],
    [90, 90],
    [90, 140],
    [150, 138],
  ],
  [
    [150, 138],
    [210, 136],
    [260, 150],
    [300, 225],
  ],
];

function pointOnRoute(t: number): [number, number] {
  const seg = t < 0.5 ? route[0]! : route[1]!;
  const u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const [p0, p1, p2, p3] = seg as [[number, number], [number, number], [number, number], [number, number]];
  const k = (i: 0 | 1) => (1 - u) ** 3 * p0[i] + 3 * (1 - u) ** 2 * u * p1[i] + 3 * (1 - u) * u ** 2 * p2[i] + u ** 3 * p3[i];
  return [k(0), k(1)];
}

// Placeholder map, drawn. A real map replaces this once rider GPS exists.
function MapSketch({ kitchen, gate, progress }: { kitchen: string; gate: string; progress: number }) {
  const [rx, ry] = pointOnRoute(progress);
  return (
    <Svg width="100%" height={300} viewBox="0 0 390 300" preserveAspectRatio="xMidYMid slice">
      <Rect width="390" height="300" fill={colors.map} />
      <G stroke={colors.cream} strokeWidth={14} fill="none" strokeLinecap="round">
        <Path d="M-10 70 H400" />
        <Path d="M-10 210 H400" />
        <Path d="M90 -10 V310" />
        <Path d="M280 -10 V310" />
        <Path d="M90 140 Q190 120 280 150" />
      </G>
      <G fill="#DCD2C1">
        <Rect x="110" y="88" width="70" height="40" rx="6" />
        <Rect x="200" y="160" width="60" height="34" rx="6" />
        <Rect x="300" y="90" width="70" height="44" rx="6" />
        <Rect x="20" y="230" width="56" height="50" rx="6" />
      </G>
      <Path d="M60 60 C90 90 90 140 150 138 S260 150 300 225" stroke={colors.forest} strokeWidth={4} fill="none" strokeDasharray="2 8" strokeLinecap="round" />
      <Circle cx="60" cy="60" r="8" fill={colors.forest} />
      <SvgText x="74" y="50" fontFamily={fonts.bold} fontSize="11" fontWeight="700" fill={colors.forest}>
        {kitchen}
      </SvgText>
      <Circle cx="300" cy="225" r="9" fill={colors.cream} stroke={colors.forest} strokeWidth={4} />
      <SvgText x="300" y="256" textAnchor="middle" fontFamily={fonts.bold} fontSize="11" fontWeight="700" fill={colors.forest}>
        {gate}
      </SvgText>
      <Circle cx={rx} cy={ry} r="15" fill={colors.orange} stroke={colors.cream} strokeWidth={4} />
    </Svg>
  );
}

const s = StyleSheet.create({
  sheet: { marginTop: -28, backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  rider: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  riderAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  rail: { position: 'absolute', left: 5.5, top: 16, bottom: -14, width: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  // Orange dot with a soft halo, sized so the row still lines up with the 12px dots.
  dotNow: { width: 22, height: 22, borderRadius: 11, borderWidth: 5, borderColor: '#FBE3D4', backgroundColor: colors.orange, marginHorizontal: -5, marginTop: -1, marginBottom: -5 },
  dotTodo: { backgroundColor: colors.cream, borderWidth: 2, borderColor: '#C9BBA6' },
  codeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  digit: { width: 38, height: 48, borderRadius: 12, backgroundColor: colors.well, alignItems: 'center', justifyContent: 'center' },
  coming: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  comingIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
});
