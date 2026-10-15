import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader, Body, Icon, Label, ToggleRow } from '../components/ui';
import { clock, useKitchen } from '../lib/kitchen';
import { colors, fonts } from '../lib/theme';
import { versionLabel } from '../lib/updates';

// Printer and POS. With every switch on, the team only ever taps Ready.
export default function Setup() {
  const k = useKitchen();
  const st = k.settings;
  const lastSale = Math.max(...k.orders.filter((o) => o.posSale).map((o) => o.inAt));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <BackHeader title="Printer and POS" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: 26, lineHeight: 30, color: colors.cream }}>
            Orders run <Text style={{ fontFamily: fonts.displayItalic }}>themselves</Text>
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.mint }}>Each order is accepted, printed and added to your POS the moment it comes in. Your team only taps Ready.</Text>
        </View>

        <View style={{ paddingTop: 16, gap: 10 }}>
          <Label>Connected</Label>
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
          <View style={s.card}>
            <View style={s.iconWell}>
              <Icon name="monitor" size={20} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.rowTitle}>[Your POS]</Text>
              <View style={s.status}>
                <View style={[s.dot, !st.addToPOS && { backgroundColor: colors.toggleOff }]} />
                <Text style={s.meta}>{st.addToPOS ? `Last sale added ${clock(lastSale)}` : 'Not adding sales'}</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" onPress={() => k.notify('Choosing a POS comes once we know which one you use')} style={{ height: 44, paddingHorizontal: 8, justifyContent: 'center' }}>
              <Text style={[s.smallText, { textDecorationLine: 'underline' }]}>Change</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ paddingTop: 18, gap: 10 }}>
          <Label>When an order comes in</Label>
          <View style={[s.list]}>
            <ToggleRow title="Accept it for me" sub="Pauses if the printer goes offline" value={st.autoAccept} onChange={(v) => k.setSetting('autoAccept', v)} />
            <ToggleRow title="Print kitchen ticket" sub="Big order number, extras in black bars" value={st.printTicket} onChange={(v) => k.setSetting('printTicket', v)} />
            <ToggleRow title="Print bag seal and receipt" sub="The seal closes the bag; the rider scans it" value={st.printSeal} onChange={(v) => k.setSetting('printSeal', v)} />
            <ToggleRow title="Add the sale to my POS" sub="Your POS issues the EFRIS receipt number" value={st.addToPOS} onChange={(v) => k.setSetting('addToPOS', v)} last />
          </View>
          {!st.autoAccept ? <Body style={{ color: colors.muted }}>New orders will pop up for someone to accept, with two minutes to answer.</Body> : null}
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
  smallText: { fontFamily: fonts.bold, fontSize: 14, color: colors.forest },
});
