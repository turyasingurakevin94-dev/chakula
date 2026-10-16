import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CampusMap, mapInk } from '../components/map';
import { Display, Icon, IconButton, PrimaryButton } from '../components/ui';
import { DELIVERY_MINUTES, formatClock, minutesLeft, useAccount, useNow, type Order } from '../lib/account';
import { useAlerts } from '../lib/alerts';
import { useChat } from '../lib/chat';
import { along, dist, findDropPoint, fitView, headingAhead, kitchenAt, route } from '../lib/campus';
import { findRestaurant } from '../lib/data';
import { blockName, riderFor, stageOf, stepTimes } from '../lib/stages';
import { colors, fonts, smallCaps } from '../lib/theme';

const MIN = 60 * 1000;

export default function Tracking() {
  const account = useAccount();
  // A server order that didn't go through leaves nothing to track.
  const hasOrder = !!(account.activeOrder ?? account.orders[0]);
  // On the server, opened straight here (a reload, a tapped alert): wait for the orders first.
  const loaded = account.ordersLoaded;
  useEffect(() => {
    if (!hasOrder && loaded) router.dismissTo('/');
  }, [hasOrder, loaded]);
  return hasOrder ? <TrackOrder /> : null;
}

function TrackOrder() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const account = useAccount();
  const alerts = useAlerts();
  const now = useNow();
  // Show the latest order, which stays on screen after it is delivered.
  const order = account.activeOrder ?? account.orders[0]!;
  const active = !!account.activeOrder;
  const restaurant = findRestaurant(order.restaurantId) ?? findRestaurant('nakawa-kitchen')!;
  // Server orders move when the kitchen and rider act; sample ones on the demo timer.
  const stage = stageOf(order, active, now);
  const live = !!order.serverId;
  // Calls go straight to the rider's phone. The server only sends the number while the rider has
  // this order; the sample order has none to dial. Messages go through the in-app chat.
  const call = () => {
    if (!order.riderPhone) return alerts.show({ title: 'Sample order', body: 'On a real order this calls your rider.', icon: 'phone' });
    Linking.openURL(`tel:${order.riderPhone}`).catch(() => alerts.show({ title: 'Couldn’t open your phone app', body: `Your rider’s number is ${order.riderPhone}.`, icon: 'phone' }));
  };
  const { unread } = useChat(order.serverId ?? order.id);
  const rider = riderFor(order);
  // Clock times for each step, counted in real minutes from when the kitchen starts. On the server,
  // steps that happened show when they really did; only the ones ahead are estimates.
  const { times } = stepTimes(order);
  const start = order.scheduledFor ? order.scheduledFor - DELIVERY_MINUTES * MIN : order.placedAt;
  const arriveBy = times[4]!;
  const minutes = !active ? 0 : live ? Math.max(1, Math.ceil((arriveBy - now) / MIN)) : minutesLeft(order, now);
  const waiting = stage === 0;
  const arrived = stage === 4;
  const block = blockName(account.place?.name);
  const atGate = stage === 3;
  const room = account.room || 'your door';
  const steps = [
    { label: order.status === 'awaiting_payment' ? 'Approve the MoMo prompt' : 'Order confirmed', time: times[0]! },
    { label: stage === 1 ? 'Being cooked' : 'Cooked and packed', time: times[1]! },
    { label: 'On the way', time: times[2]! },
    { label: `At ${block}`, time: times[3]! },
    { label: `At ${room}`, time: times[4]! },
  ];
  // How far along the route the rider dot is.
  // On the server it follows the rider's GPS, or sits on the road until the first fix.
  const progress = live ? liveProgress(order, stage) : stage <= 1 ? 0 : arrived ? 1 : Math.min(1, (DELIVERY_MINUTES - 2 - minutes) / (DELIVERY_MINUTES - 2) + 0.15);

  useEffect(() => {
    if (!live && minutes === 0 && active && !waiting) account.markDelivered(order.id);
  }, [minutes, active, waiting]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={{ height: 300 + insets.top, backgroundColor: colors.map }}>
          <LiveMap restaurantId={restaurant.id} placeId={account.place?.id} progress={progress} width={width} height={300 + insets.top} top={insets.top} />
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
            {live ? null : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 4 }}>
                <Icon name="check" size={13} color={colors.green} />
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.green }}>On time</Text>
              </View>
            )}
          </View>

          <View style={s.rider}>
            <View style={s.riderAvatar}>
              {rider.initials ? <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.cream }}>{rider.initials}</Text> : <Icon name="user" size={20} color={colors.cream} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }} numberOfLines={1}>
                {live && !order.riderName
                  ? waiting
                    ? 'A rider will bring your food'
                    : `${restaurant.name} is cooking`
                  : waiting
                    ? `${rider.name} will bring your food`
                    : arrived
                      ? `${rider.name} brought your food`
                      : `${rider.name} is bringing your food`}
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }} numberOfLines={1}>
                {live ? (order.riderName ? 'Your Chakula rider' : 'A rider takes it as it cooks') : '★ 4.9 · red helmet · UBF 412K'}
              </Text>
            </View>
            {!live || order.riderName ? (
              <View>
                <IconButton icon="message-circle" label={unread ? `Chat with ${rider.name}, ${unread} new` : `Chat with ${rider.name}`} variant="outline" size={42} style={{ borderColor: colors.forest }} onPress={() => router.push('/chat')} />
                {unread ? <View style={s.unread} pointerEvents="none" /> : null}
              </View>
            ) : null}
            {!live || order.riderPhone ? (
              <IconButton icon="phone" label={`Call ${rider.name}`} variant="outline" size={42} style={{ borderColor: colors.forest }} onPress={call} />
            ) : null}
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

          {order.status === 'awaiting_payment' ? (
            <View style={s.unpaid}>
              <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted }}>Waiting for your MoMo approval. Nothing reaches the kitchen until it’s paid.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel this order" hitSlop={8} onPress={() => account.cancelOrder(order.id)}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.orangeText, textDecorationLine: 'underline' }}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}

          {!live && active && !arrived && account.alertPrefs.sms && alerts.permission !== 'granted' && stage >= 2 ? (
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
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{live ? `${rider.name} will wait` : 'He’ll wait'} at {block}. Nobody will call you.</Text>
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
            {live ? 'We’ll alert you when your rider reaches your gate.' : 'We’ll alert you when Brian reaches your gate. If your rider is more than 10 minutes late, your next delivery is free.'}
          </Text>

          {arrived && !order.rating ? <PrimaryButton floating label="Rate your order" onPress={() => router.push({ pathname: '/rate', params: { id: order.id } })}>Got it? Rate your order</PrimaryButton> : null}
        </View>
      </ScrollView>
    </View>
  );
}

// How far along the road the rider is, from their last GPS point: the share of the straight-line
// distance already covered. Rough, but it only places the dot.
function liveProgress(order: Order, stage: number) {
  if (stage <= 1) return 0;
  if (stage >= 4) return 1;
  const from = kitchenAt(order.restaurantId);
  const to = findDropPoint(order.dropPointId)?.at;
  if (!order.riderAt || !to) return stage === 3 ? 0.97 : 0.1;
  const total = dist(from, to) || 1;
  return Math.min(0.97, Math.max(0.03, 1 - dist(order.riderAt, to) / total));
}

// The real road from the kitchen to the student's drop point, on our own map.
// Until riders send GPS, the rider moves along it with the order's timer.
function LiveMap({ restaurantId, placeId, progress, width, height, top }: { restaurantId: string; placeId: string | undefined; progress: number; width: number; height: number; top: number }) {
  const from = kitchenAt(restaurantId);
  const to = findDropPoint(placeId)?.at ?? findDropPoint('main-gate')!.at;
  const road = useMemo(() => route(from, to), [from, to]);
  const view = useMemo(() => fitView(road.points, width, height, [top + 70, 34, 64, 34], 1.7), [road, width, height, top]);
  const { at, done, ahead } = along(road.points, progress);
  const moving = progress > 0 && progress < 1;
  return (
    <CampusMap
      width={width}
      height={height}
      view={view}
      accessibilityLabel={`Map: the road from the kitchen to your drop point, ${Math.round(road.metres / 10) * 10} metres`}
      lines={[
        ...(moving ? [{ points: done, color: mapInk.done }] : []),
        { points: moving ? ahead : road.points, color: colors.forest },
      ]}
      pins={[
        { id: 'kitchen', at: from, label: 'K', tone: 'kitchen' },
        { id: 'drop', at: to, big: true, selected: progress >= 1 },
      ]}
      rider={moving ? { at, heading: headingAhead(ahead) } : undefined}
    />
  );
}

const s = StyleSheet.create({
  unread: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.orange, borderWidth: 2, borderColor: colors.card },
  sheet: { marginTop: -28, backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  unpaid: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
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
