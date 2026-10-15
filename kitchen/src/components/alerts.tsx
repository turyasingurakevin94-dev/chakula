import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';
import { hears, MORNING, PAYOUT, type Device } from '../lib/alerts';
import { clock, demoNow, ridersDue, useKitchen, type Order } from '../lib/kitchen';
import { listen, onInAppAlert, ring, scheduleDaily, setupNotifications, showInAppOnly, startRepeating, stopRepeating, type Alert, type InAppAlert } from '../lib/notify';
import { photoFor } from '../lib/photos';
import { colors, fonts } from '../lib/theme';
import { DishPhoto, Icon } from './ui';

const SEEN_WITHIN = 60_000;
// Without the native module, how often the "Didn't print" bell repeats while the app is open.
const REPEAT_IN_APP = 20_000;
const MIN = 60_000;

export const first = (o: Order) => o.student.split(' ')[0];
const itemCount = (o: Order) => o.items.reduce((n, i) => n + i.qty, 0);

// An order that needs a tap: auto-accepted, the ticket didn't print, and nobody has looked for a minute.
export function unseen(orders: Order[], now: number) {
  return orders.filter((o) => o.live && o.status === 'cooking' && !o.seenAt && now - o.inAt >= SEEN_WITHIN).sort((a, b) => a.inAt - b.inAt);
}

// The alert for a new order, e.g. "New order 4826 · 2 items · ready by 12:53".
export function newOrderAlert(o: Order): Alert {
  const n = itemCount(o);
  const head = `New order ${o.id} · ${n} item${n === 1 ? '' : 's'}`;
  if (o.status === 'incoming') return { kind: 'newOrder', title: `${head} · accept within 2 min`, body: `${o.student} · ${o.place}. Tap to accept it.`, url: '/' };
  return {
    kind: 'newOrder',
    title: `${head} · ready by ${clock(o.dueAt)}`,
    body: o.printed ? `${o.student} · ${o.place}. Ticket printed, ${first(o)} told.` : `${o.student} · ${o.place}. The ticket didn’t print: tap to see it.`,
    url: `/order/${o.id}`,
  };
}

// Watches the (sample) kitchen and rings each alert once, in the app and through the system.
// Mounted once, in the root layout.
export function AlertHost() {
  const k = useKitchen();
  const pathname = usePathname();
  const device: Device = pathname === '/display' ? 'tablet' : 'phone';
  const [banner, setBanner] = useState<InAppAlert | null>(null);
  const [sheet, setSheet] = useState<'morning' | 'payout' | null>(null);
  const [nativeOn, setNativeOn] = useState(false);
  const [tick, setTick] = useState(0);
  const rung = useRef(new Set<string>());
  const repeating = useRef(new Map<string, number>());

  // Permission, channels and the tap handler.
  useEffect(() => {
    let alive = true;
    setupNotifications().then((s) => alive && setNativeOn(s === 'native'));
    const stop = listen({
      onTap: (url) => router.push(url as never),
      onReceived: (a) => {
        if ((a.kind === 'morning' || a.kind === 'payout') && AppState.currentState === 'active') setSheet(a.kind);
      },
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);

  // In-app alerts: reminders open their card, the rest a banner.
  useEffect(
    () =>
      onInAppAlert((a) => {
        if (a.kind === 'morning' || a.kind === 'payout') setSheet(a.kind);
        else setBanner(a);
      }),
    [],
  );
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), banner.loud ? 8000 : 5000);
    return () => clearTimeout(t);
  }, [banner]);

  // The 8 am prep list and the 9:30 pm payout, on this phone.
  const wantMorning = hears(k.hears, 'morning', 'phone');
  const wantPayout = hears(k.hears, 'payout', 'phone');
  useEffect(() => {
    if (!nativeOn) return;
    scheduleDaily([...(wantMorning ? [MORNING] : []), ...(wantPayout ? [PAYOUT] : [])]);
  }, [nativeOn, wantMorning, wantPayout]);

  // Seconds matter for "not seen in 60 s" and the rider countdown; the shared clock ticks every 5.
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const now = demoNow();
    const once = (key: string, fire: () => void) => {
      if (rung.current.has(key)) return;
      rung.current.add(key);
      fire();
    };
    const on = (key: Parameters<typeof hears>[1]) => hears(k.hears, key, device);

    // 1. New orders. Locked on, so no check.
    for (const o of k.orders) if (o.live) once(`new-${o.id}`, () => ring(newOrderAlert(o)));

    // 2. Not seen: rings until someone taps "Seen it".
    for (const o of unseen(k.orders, now)) {
      const alert: Alert = { kind: 'notSeen', title: k.settings.printTicket ? `Order ${o.id} didn’t print` : `Order ${o.id} needs a look`, body: `Nobody has seen it yet. Tap “Seen it” so ${first(o)} knows you’re cooking.`, url: `/order/${o.id}` };
      const last = repeating.current.get(o.id);
      if (last === undefined) {
        ring(alert);
        // The system repeats it, even with the app in the background. Without it, we repeat while open.
        repeating.current.set(o.id, startRepeating(o.id, alert) ? Infinity : now);
      } else if (now - last >= REPEAT_IN_APP) {
        ring(alert);
        repeating.current.set(o.id, now);
      }
    }
    for (const id of [...repeating.current.keys()]) {
      const o = k.orders.find((x) => x.id === id);
      if (!o || o.seenAt || o.status !== 'cooking') {
        stopRepeating(id);
        repeating.current.delete(id);
      }
    }

    // 3. A rider 2 minutes from the hatch, naming the bags that aren't sealed.
    for (const r of ridersDue(k.orders, now)) {
      if (!r.unready.length) continue;
      once(`rider-${r.key}`, () => {
        if (!on('riderSoon')) return;
        const ids = r.unready.map((o) => o.id);
        ring({ kind: 'riderSoon', title: `${r.name} arrives in 2 min`, body: `${ids.join(' and ')} ${ids.length === 1 ? 'isn’t' : 'aren’t'} ready yet. Seal ${ids.length === 1 ? 'it' : 'them'} first and ${r.name} leaves on time.`, url: `/order/${ids[0]}` });
      });
    }

    // 4. A ticket running over its time: soft chime, the card turns orange.
    for (const o of k.orders) {
      if (o.status !== 'cooking' || now < o.dueAt + MIN) continue;
      once(`late-${o.id}-${o.dueAt}`, () => {
        if (!on('runningOver')) return;
        const over = Math.max(1, Math.round((now - o.dueAt) / MIN));
        ring({ kind: 'runningOver', title: `${o.id} is ${over} min over`, body: `${first(o)} has been told the new time.`, url: `/order/${o.id}` });
      });
    }

    // 5. The student picked a swap after "Something ran out".
    for (const o of k.orders) {
      if (!o.swap?.chose) continue;
      once(`swap-${o.id}-${o.swap.askedAt}`, () => {
        if (!on('swap')) return;
        ring({ kind: 'swap', title: `${first(o)} chose ${o.swap!.chose!.toLowerCase()}`, body: `Instead of the ${o.swap!.item.toLowerCase()} on ${o.id}.`, url: `/order/${o.id}` });
      });
    }

    // 6. Without the system scheduler, the daily reminders still show if the app is open at the time.
    if (!nativeOn) {
      const real = new Date();
      const day = real.toDateString();
      for (const r of [MORNING, PAYOUT]) {
        if (real.getHours() === r.hour && real.getMinutes() === r.minute && hears(k.hears, r.kind as 'morning' | 'payout', 'phone')) once(`${r.kind}-${day}`, () => showInAppOnly(r));
      }
    }
  }, [k.orders, k.hears, k.settings.printTicket, device, nativeOn, tick]);

  const covered = pathname === '/display' || k.orders.some((o) => o.status === 'incoming') || unseen(k.orders, demoNow()).length > 0;
  return (
    <>
      {banner && !covered ? <Banner alert={banner} onClose={() => setBanner(null)} /> : null}
      {sheet ? <Reminder kind={sheet} onClose={() => setSheet(null)} /> : null}
    </>
  );
}

// The in-app version of a notification, at the top of the screen.
function Banner({ alert, onClose }: { alert: InAppAlert; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const loud = alert.loud;
  return (
    <View style={{ position: 'absolute', left: 12, right: 12, top: insets.top + 8 }} accessibilityLiveRegion={loud ? 'assertive' : 'polite'}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${alert.title}. ${alert.body}`}
        onPress={() => {
          onClose();
          if (alert.url) router.push(alert.url as never);
        }}
        style={({ pressed }) => [s.banner, loud && s.bannerLoud, { opacity: pressed ? 0.94 : 1 }]}
      >
        <View style={[s.bannerIcon, loud && { backgroundColor: colors.orange }]}>
          <Icon name={alert.kind === 'riderSoon' ? 'navigation' : alert.kind === 'runningOver' ? 'clock' : alert.kind === 'swap' ? 'repeat' : 'bell'} size={18} color={loud ? '#2B1408' : colors.forest} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }} numberOfLines={2}>
            {alert.title}
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.segmentText }} numberOfLines={2}>
            {alert.body}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10} onPress={onClose}>
          <Icon name="x" size={18} color={colors.muted} />
        </Pressable>
      </Pressable>
    </View>
  );
}

// The 8 am prep list and the nightly payout, drawn like the K-Morning and K-Night boards: a cream
// card over the dimmed app. Shown when the reminder arrives with the app open, or from Who hears what.
export function Reminder({ kind, onClose }: { kind: 'morning' | 'payout'; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const k = useKitchen();
  const go = (url: string) => {
    onClose();
    router.push(url as never);
  };
  const morning = kind === 'morning';
  return (
    <View style={[StyleSheet.absoluteFill, s.dim, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]} accessibilityViewIsModal>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={s.sheet}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={s.appIcon}>
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.cream }}>K</Text>
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.segmentText }}>Chakula Kitchen · {morning ? 'Today’s prep' : 'Tonight’s payout'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose}>
            <Icon name="x" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {morning ? (
          <>
            <View style={{ paddingHorizontal: 16, paddingTop: 10, gap: 2 }}>
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: 26, lineHeight: 29, color: colors.forest }}>Good morning, Nakawa Kitchen</Text>
              <Text style={s.text}>
                <Text style={{ fontFamily: fonts.bold, color: colors.forest }}>84 meals</Text> are already paid for today. Start lunch at 11:00.
              </Text>
            </View>
            <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.caps}>Lunch plans · 12:30 drop</Text>
                <Text style={s.caps}>46</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { n: 20, name: 'Chicken pilau' },
                  { n: 14, name: 'Special rolex' },
                  { n: 12, name: 'Katogo' },
                ].map((d) => (
                  <View key={d.name} style={{ flex: 1, gap: 4 }}>
                    <View>
                      <DishPhoto name={d.name} size={64} radius={12} style={{ width: '100%' }} />
                      <View style={s.count}>
                        <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.forest }}>{d.n}</Text>
                      </View>
                    </View>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.forest }}>{d.name}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ marginHorizontal: 16, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Line left="After-lectures drop, 1:20" right="6 orders" />
              <Line left="Supper plans, 7:00 drop" right="38 meals" />
              <Line left="Sausage ran out at 1:10 yesterday" right="Make more" warn last />
            </View>
            <Actions
              a={{ label: 'Open Prep', onPress: () => go('/prep') }}
              b={{
                label: 'Print the list',
                onPress: () => {
                  onClose();
                  k.notify('Prep list sent to the printer');
                },
              }}
            />
          </>
        ) : (
          <>
            <View style={s.payout}>
              <Svg width={340} height={140} viewBox="0 0 340 140" style={{ position: 'absolute', right: -40, top: -10, opacity: 0.5 }}>
                <G fill="none" stroke={colors.line} strokeWidth={1}>
                  {[30, 44, 58, 72, 86].map((r) => (
                    <Circle key={r} cx={250} cy={70} r={r} />
                  ))}
                </G>
              </Svg>
              <Text style={[s.caps, { color: colors.orangeText, letterSpacing: 1.76 }]}>Sending · 10:00 pm</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 38, lineHeight: 42, color: colors.forest }}>UGX 437,400</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.segmentText }}>To MoMo ••• 418 · guaranteed, in one transfer</Text>
            </View>
            <View style={{ paddingHorizontal: 16, paddingTop: 14, flexDirection: 'row' }}>
              <Stat n="56" label="orders" />
              <Stat n="4.8" label="12 new ratings" />
              <Stat n="97%" label="on time" />
            </View>
            <View style={{ marginHorizontal: 16, marginTop: 12, paddingTop: 10, paddingBottom: 4, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {photoFor('Special rolex') ? <Image source={photoFor('Special rolex')} style={{ width: 40, height: 40, borderRadius: 10 }} accessibilityIgnoresInvertColors /> : null}
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>Best seller: special rolex ×41</Text>
                <Text style={{ fontFamily: fonts.displayItalic, fontSize: 14, color: colors.segmentText }}>“Best rolex in Nakawa” · Brian K.</Text>
              </View>
            </View>
            <Actions a={{ label: 'See the day', onPress: () => go('/money') }} b={{ label: 'Tomorrow’s prep', onPress: () => go('/prep') }} />
          </>
        )}
      </View>
    </View>
  );
}

function Line({ left, right, warn, last }: { left: string; right: string; warn?: boolean; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.lineSoft }}>
      <Text style={{ fontFamily: warn ? fonts.semibold : fonts.regular, fontSize: 14, color: warn ? colors.chipText : colors.segmentText }}>{left}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: warn ? colors.chipText : colors.forest }}>{right}</Text>
    </View>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.forest }}>{n}</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{label}</Text>
    </View>
  );
}

function Actions({ a, b }: { a: { label: string; onPress: () => void }; b: { label: string; onPress: () => void } }) {
  return (
    <View style={{ marginTop: 6, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line }}>
      <Pressable accessibilityRole="button" onPress={a.onPress} style={[s.action, { borderRightWidth: 1, borderRightColor: colors.line }]}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{a.label}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={b.onPress} style={s.action}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.forest }}>{b.label}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: colors.forest,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bannerLoud: { borderWidth: 2, borderColor: colors.orange, paddingHorizontal: 13, paddingVertical: 11 },
  bannerIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.lineSoft, alignItems: 'center', justifyContent: 'center' },
  dim: { backgroundColor: 'rgba(24,22,18,0.58)', paddingHorizontal: 12, justifyContent: 'flex-start' },
  sheet: { backgroundColor: colors.cream, borderRadius: 26, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 40, shadowOffset: { width: 0, height: 16 }, elevation: 12, maxWidth: 420, width: '100%', alignSelf: 'center' },
  appIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.segmentText },
  caps: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.54, textTransform: 'uppercase', color: colors.muted },
  count: { position: 'absolute', left: 6, bottom: 6, minWidth: 26, height: 26, paddingHorizontal: 6, borderRadius: 13, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  payout: { marginHorizontal: 14, marginTop: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18, paddingVertical: 16, overflow: 'hidden', gap: 4 },
  action: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center' },
});
