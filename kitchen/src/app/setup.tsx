import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader, Body, Icon, Label, ToggleRow } from '../components/ui';
import { clock, useKitchen } from '../lib/kitchen';
import { available as canPrint, pairedPrinters, type PairedDevice } from '../lib/printer';
import { onServer } from '../lib/server';
import { colors, fonts } from '../lib/theme';
import { versionLabel } from '../lib/updates';

// Printer and POS. With every switch on, the team only ever taps Ready.
export default function Setup() {
  const k = useKitchen();
  const st = k.settings;
  const sales = k.orders.filter((o) => o.posSale).map((o) => o.inAt);
  const lastSale = sales.length ? Math.max(...sales) : null;
  // On the server: the phone's paired Bluetooth devices, while picking the printer.
  const [devices, setDevices] = useState<PairedDevice[] | null>(null);
  const [looking, setLooking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const findPrinters = async () => {
    setLooking(true);
    setProblem(null);
    try {
      setDevices(await pairedPrinters());
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Couldn’t list Bluetooth devices.');
    } finally {
      setLooking(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <BackHeader title="Printer and POS" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: 26, lineHeight: 30, color: colors.cream }}>
            Orders run <Text style={{ fontFamily: fonts.displayItalic }}>themselves</Text>
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.mint }}>
            {onServer ? 'Each order prints the moment it comes in: ticket, bag seal and receipt. Your team only taps Ready.' : 'Each order is accepted, printed and added to your POS the moment it comes in. Your team only taps Ready.'}
          </Text>
        </View>

        <View style={{ paddingTop: 16, gap: 10 }}>
          <Label>Connected</Label>
          {onServer ? (
            <View style={[s.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={s.iconWell}>
                  <Icon name="printer" size={20} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.rowTitle}>{k.printer ? k.printer.name : 'No printer yet'}</Text>
                  <View style={s.status}>
                    <View style={[s.dot, !k.printer && { backgroundColor: colors.orange }]} />
                    <Text style={s.meta}>{!canPrint ? 'Install the new Kitchen app to print' : k.printer ? '58 mm · Bluetooth' : 'Pick your Bluetooth printer'}</Text>
                  </View>
                </View>
                {k.printer ? (
                  <Pressable accessibilityRole="button" onPress={k.testPrint} style={s.small}>
                    <Text style={s.smallText}>Test print</Text>
                  </Pressable>
                ) : null}
              </View>
              {canPrint ? (
                devices ? (
                  <View style={{ paddingTop: 10, gap: 6 }}>
                    {devices.length ? (
                      devices.map((d) => {
                        const on = k.printer?.address === d.address;
                        return (
                          <Pressable
                            key={d.address}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: on }}
                            onPress={() => {
                              k.setPrinter(d);
                              setDevices(null);
                            }}
                            style={[s.device, on && { borderColor: colors.forest }]}
                          >
                            <Icon name={on ? 'check-circle' : 'bluetooth'} size={18} />
                            <Text style={[s.rowTitle, { flex: 1 }]}>{d.name}</Text>
                          </Pressable>
                        );
                      })
                    ) : (
                      <Text style={s.meta}>Nothing paired yet. Turn the printer on, pair it in the phone’s Bluetooth settings (the PIN is usually 0000 or 1234), then come back.</Text>
                    )}
                  </View>
                ) : (
                  <Pressable accessibilityRole="button" onPress={() => void findPrinters()} disabled={looking} style={[s.small, { marginTop: 10, alignItems: 'center' }]}>
                    {looking ? <ActivityIndicator color={colors.forest} /> : <Text style={s.smallText}>{k.printer ? 'Change printer' : 'Choose printer'}</Text>}
                  </Pressable>
                )
              ) : null}
              {problem ? <Text style={[s.meta, { color: colors.orangeText, paddingTop: 8 }]}>{problem}</Text> : null}
            </View>
          ) : (
            <View style={s.card}>
              <View style={s.iconWell}>
                <Icon name="printer" size={20} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.rowTitle}>Receipt printer</Text>
                <View style={s.status}>
                  <View style={s.dot} />
                  <Text style={s.meta}>58 mm · Bluetooth</Text>
                </View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => k.notify('Test page sent to the printer')} style={s.small}>
                <Text style={s.smallText}>Test print</Text>
              </Pressable>
            </View>
          )}
          {onServer ? null : (
            <View style={s.card}>
              <View style={s.iconWell}>
                <Icon name="monitor" size={20} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.rowTitle}>[Your POS]</Text>
                <View style={s.status}>
                  <View style={[s.dot, !st.addToPOS && { backgroundColor: colors.toggleOff }]} />
                  <Text style={s.meta}>{!st.addToPOS ? 'Not adding sales' : lastSale ? `Last sale added ${clock(lastSale)}` : 'No sales added yet'}</Text>
                </View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => k.notify('Choosing a POS comes once we know which one you use')} style={{ height: 44, paddingHorizontal: 8, justifyContent: 'center' }}>
                <Text style={[s.smallText, { textDecorationLine: 'underline' }]}>Change</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={{ paddingTop: 18, gap: 10 }}>
          <Label>When an order comes in</Label>
          <View style={[s.list]}>
            {onServer ? null : <ToggleRow title="Accept it for me" sub="Pauses if the printer goes offline" value={st.autoAccept} onChange={(v) => k.setSetting('autoAccept', v)} />}
            <ToggleRow title="Print kitchen ticket" sub="Big order number, extras in black bars" value={st.printTicket} onChange={(v) => k.setSetting('printTicket', v)} />
            <ToggleRow title="Print bag seal and receipt" sub="The seal closes the bag; the rider scans it" value={st.printSeal} onChange={(v) => k.setSetting('printSeal', v)} last={onServer} />
            {onServer ? null : <ToggleRow title="Add the sale to my POS" sub="Your POS issues the EFRIS receipt number" value={st.addToPOS} onChange={(v) => k.setSetting('addToPOS', v)} last />}
          </View>
          {!onServer && !st.autoAccept ? <Body style={{ color: colors.muted }}>New orders will pop up for someone to accept, with two minutes to answer.</Body> : null}
        </View>

        <View style={{ paddingTop: 18, gap: 10 }}>
          <Label>Alerts</Label>
          <Pressable accessibilityRole="link" onPress={() => router.push('/alerts')} style={s.card}>
            <View style={s.iconWell}>
              <Icon name="bell" size={20} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.rowTitle}>Who hears what</Text>
              <Text style={s.meta}>Kitchen bell, riders, late tickets, prep list and payout</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.chevron} />
          </Pressable>
        </View>

        {/* Not on the canvas: the only way into the counter display on a phone. */}
        <Pressable accessibilityRole="link" onPress={() => router.push('/display')} style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44 }}>
          <Icon name="monitor" size={16} color={colors.muted} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.muted, textDecorationLine: 'underline' }}>Open the counter display</Text>
        </Pressable>
        <Text style={[s.meta, { textAlign: 'center', marginTop: 6 }]}>{versionLabel()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.forest, borderRadius: 24, padding: 18, gap: 6 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  list: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 4 },
  iconWell: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.lineSoft, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E9E5B' },
  rowTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  small: { height: 44, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.toggleOff, backgroundColor: colors.card, justifyContent: 'center' },
  device: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  smallText: { fontFamily: fonts.bold, fontSize: 14, color: colors.forest },
});
