import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Polygon, Rect } from 'react-native-svg';
import { QrCode, bagCode } from '../../components/qr';
import { Icon } from '../../components/ui';
import { clock, cookingQueue, ordinal, orderTotal, useKitchen } from '../../lib/kitchen';
import { onServer } from '../../lib/server';
import { colors, fonts } from '../../lib/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const n = (v: number) => v.toLocaleString('en-US');
const ink = '#111111';
const sage = '#A9C4B2';
const QR =
  'M0 0h7v7H0zM1 1v5h5V1zM2 2h3v3H2zM14 0h7v7h-7zM15 1v5h5V1zM16 2h3v3h-3zM0 14h7v7H0zM1 15v5h5v-5zM2 16h3v3H2zM8 0h2v2H8zM11 1h2v3h-2zM8 3h2v2H8zM9 6h3v2H9zM8 9h2v3H8zM11 9h3v2h-3zM15 8h2v2h-2zM18 9h3v2h-3zM0 8h3v2H0zM4 9h3v2H4zM12 12h2v2h-2zM16 12h3v2h-3zM8 14h3v2H8zM12 15h2v3h-2zM15 15h2v2h-2zM18 15h3v3h-3zM8 18h3v3H8zM15 19h3v2h-3zM13 19h1v2h-1z';

// What the 58 mm printer puts out for one order: kitchen ticket, bag seal, student's receipt.
export default function Receipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const k = useKitchen();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const o = k.orders.find((x) => x.id === id);
  if (!o) return null;

  const first = o.student.split(' ')[0];
  const rank = cookingQueue(k.orders).findIndex((x) => x.id === o.id);
  const d = new Date(o.inAt);
  const sealedAt = o.readyAt ?? o.dueAt - 60_000;
  const riderAt = o.rider?.arrivesAt ?? o.dueAt + 2 * 60_000;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.forest }} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ padding: wide ? 40 : 20, gap: 28 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'flex-end' : 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <View style={{ gap: 6, flexShrink: 1 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.back}>
              <Icon name="chevron-left" size={22} color={colors.cream} />
            </Pressable>
            <Text style={s.kicker}>Printed for every order · 58 mm thermal · black ink only</Text>
            <Text style={{ fontFamily: fonts.displayMedium, fontSize: wide ? 40 : 32, lineHeight: wide ? 44 : 36, color: colors.cream }}>
              The paper is part of <Text style={{ fontFamily: fonts.displayItalic }}>the meal</Text>
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: sage, maxWidth: 300, textAlign: wide ? 'right' : 'left' }}>
            One print run, three pieces. The cook reads the ticket, the bag is sealed shut, the student keeps the receipt.
          </Text>
        </View>

        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 32, alignItems: wide ? 'flex-start' : 'stretch' }}>
          <Piece label="1 · Kitchen ticket" wide={wide}>
            <Paper>
              <View style={s.ticketHead}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 54, lineHeight: 56, letterSpacing: -1, color: '#FFFFFF' }}>{o.id}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.3, color: '#FFFFFF' }}>DUE</Text>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: '#FFFFFF' }}>{clock(o.dueAt)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.caps}>
                  {first} · {o.place.split(',')[0]}
                </Text>
                {rank >= 0 ? (
                  <View style={{ borderWidth: 2, borderColor: ink, paddingHorizontal: 6 }}>
                    <Text style={s.caps}>{ordinal(rank + 1)} in line</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ borderTopWidth: 2, borderTopColor: ink }} />
              {o.items.map((i) => (
                <View key={i.name} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <View style={{ width: 18, height: 18, borderWidth: 2, borderColor: ink, marginTop: 4, marginRight: 4 }} />
                  <Text style={{ width: 30, fontFamily: fonts.bold, fontSize: 24, lineHeight: 26, color: ink }}>{i.qty}</Text>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 18, lineHeight: 21, textTransform: 'uppercase', color: ink }}>{i.name}</Text>
                    {(i.extras ?? []).map((e) => (
                      <View key={e} style={{ alignSelf: 'flex-start', backgroundColor: ink, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontFamily: fonts.bold, fontSize: 14, letterSpacing: 0.56, color: '#FFFFFF' }}>{e.startsWith('No ') ? e.toUpperCase() : `+ ${e.toUpperCase()}`}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              {o.note ? (
                <View style={{ borderWidth: 3, borderColor: ink, padding: 2 }}>
                  <View style={{ borderWidth: 1, borderColor: ink, paddingHorizontal: 8, paddingVertical: 6 }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 14, letterSpacing: 0.84, color: ink }}>NOTE</Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: ink }}>{o.note}</Text>
                  </View>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.tiny}>PRINTED {clock(o.inAt)}</Text>
                <Text style={s.tiny}>RIDER {clock(riderAt)}</Text>
              </View>
            </Paper>
          </Piece>

          <Piece label="2 · Bag seal sticker" wide={wide}>
            <View style={s.seal}>
              <View style={s.logo}>
                <Text style={{ fontFamily: fonts.displayItalic, fontSize: 30, lineHeight: 34, color: ink }}>C</Text>
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.76, color: ink }}>SEALED FOR</Text>
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: 36, lineHeight: 40, color: ink }}>{o.student}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: ink }}>{o.place}</Text>
              <View style={{ alignSelf: 'stretch', borderTopWidth: 1, borderTopColor: ink }} />
              <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {o.serverId ? (
                  <QrCode value={bagCode(o.serverId)} size={84} />
                ) : (
                  <Svg width={84} height={84} viewBox="0 0 21 21" accessibilityLabel="Pickup code">
                    <Rect width={21} height={21} fill="#FFFFFF" />
                    <Path fill={ink} d={QR} />
                  </Svg>
                )}
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 32, lineHeight: 34, color: ink }}>{o.id}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: ink }}>Rider scans to pick up</Text>
                </View>
              </View>
              <View style={{ alignSelf: 'stretch', borderTopWidth: 1, borderTopColor: ink }} />
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: ink, textAlign: 'center' }}>
                Sealed at {k.kitchenName}, {clock(sealedAt)}.{'\n'}If this seal is broken, tell us in the app.
              </Text>
            </View>
          </Piece>

          <Piece label="3 · Student's receipt" wide={wide}>
            <Paper top={24} side={18}>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' }}>
                  <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: ink }} />
                  <Text style={{ fontFamily: fonts.displayItalic, fontSize: 34, lineHeight: 38, color: ink }}>Chakula</Text>
                  <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: ink }} />
                </View>
                <Text style={{ fontFamily: fonts.displayItalic, fontSize: 13, color: ink }}>Campus dining, done properly.</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, paddingTop: 4 }}>
                <Field k="KITCHEN" v={k.kitchenName} />
                <Field k="ORDER" v={o.id} />
                <Field k="DATE" v={`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${clock(o.inAt)}`} />
                <Field k="PAID" v={o.paid} />
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: ink }} />
              <View style={{ gap: 6 }}>
                {o.items.map((i) => {
                  const extras = (i.extras ?? []).filter((e) => !e.startsWith('No '));
                  const base = k.dishes.find((x) => x.name === i.name)?.price ?? (extras.length ? i.price - 500 * extras.length : i.price);
                  const extraEach = extras.length ? (i.price - base) / extras.length : 0;
                  return (
                    <View key={i.name} style={{ gap: 6 }}>
                      <Line a={`${i.qty} ${i.name}`} b={n(base * i.qty)} bold />
                      {extras.map((e) => (
                        <Line key={e} a={`${e} × ${i.qty}`} b={n(extraEach * i.qty)} indent />
                      ))}
                      {(i.extras ?? [])
                        .filter((e) => e.startsWith('No '))
                        .map((e) => (
                          <Line key={e} a={e} b="" indent />
                        ))}
                    </View>
                  );
                })}
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: ink }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.3, color: ink }}>TOTAL UGX</Text>
                <Text style={{ fontFamily: fonts.display, fontSize: 28, color: ink }}>{n(orderTotal(o))}</Text>
              </View>
              <Text style={{ fontFamily: fonts.regular, fontSize: 10, letterSpacing: 0.4, color: ink }}>EFRIS FDN [FROM YOUR POS]</Text>
              <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: ink }} />
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text style={{ fontFamily: fonts.displayItalic, fontSize: 20, color: ink }}>Thank you, {first}.</Text>
                <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel="Five empty stars">
                  {[0, 1, 2, 3, 4].map((x) => (
                    <Svg key={x} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={1.8} strokeLinejoin="round">
                      <Path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />
                    </Svg>
                  ))}
                </View>
                <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: ink }}>Rate your meal in the Chakula app</Text>
              </View>
            </Paper>
          </Piece>
        </View>

        <Pressable accessibilityRole="button" onPress={() => (onServer ? k.print(o.id) : k.notify(`Order ${o.id} sent to the printer again`))} style={s.reprint}>
          <Icon name="printer" size={18} />
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>Reprint all three</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Piece({ label, wide, children }: { label: string; wide: boolean; children: ReactNode }) {
  return (
    <View style={[{ gap: 12 }, wide ? { flex: 1 } : { width: '100%', maxWidth: 340, alignSelf: 'center' }]}>
      <Text style={s.kicker}>{label}</Text>
      {children}
    </View>
  );
}

// Thermal paper with a torn bottom edge.
function Paper({ children, top = 14, side = 14 }: { children: ReactNode; top?: number; side?: number }) {
  const teeth = Array.from({ length: 60 }, (_, i) => `${i * 12},0 ${i * 12 + 6},12 ${i * 12 + 12},0`).join(' ');
  return (
    <View style={s.shadow}>
      <View style={{ backgroundColor: '#FFFFFF', paddingTop: top, paddingHorizontal: side, paddingBottom: 18, gap: 12 }}>{children}</View>
      <View style={{ height: 12, overflow: 'hidden' }}>
        <Svg width={720} height={12}>
          <Polygon points={`0,0 ${teeth} 720,0`} fill="#FFFFFF" />
        </Svg>
      </View>
    </View>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ width: '50%', paddingRight: 12 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2, color: ink }}>{k}</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: ink }}>{v}</Text>
    </View>
  );
}

function Line({ a, b, bold, indent }: { a: string; b: string; bold?: boolean; indent?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: indent ? 14 : 0 }}>
      <Text style={{ fontFamily: bold ? fonts.bold : fonts.regular, fontSize: 13, color: ink }}>{a}</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: ink }}>{b}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#4F7A65', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kicker: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.44, textTransform: 'uppercase', color: sage },
  ticketHead: { backgroundColor: ink, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caps: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.78, textTransform: 'uppercase', color: ink },
  tiny: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 0.44, color: ink },
  seal: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 20, paddingVertical: 22, alignItems: 'center', gap: 12, transform: [{ rotate: '-1.5deg' }], shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 28, shadowOffset: { width: 0, height: 18 }, elevation: 10 },
  logo: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: ink, alignItems: 'center', justifyContent: 'center' },
  shadow: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 28, shadowOffset: { width: 0, height: 18 } },
  reprint: { height: 56, borderRadius: 18, backgroundColor: colors.cream, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
