import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader, Body, Card, Display, Icon, Italic, Label, ToggleRow } from '../components/ui';
import { clock, useKitchen } from '../lib/kitchen';
import { colors, fonts } from '../lib/theme';

// Printer and POS. With every switch on, the team only ever taps Ready.
export default function Setup() {
  const k = useKitchen();
  const st = k.settings;
  const lastSale = Math.max(...k.orders.filter((o) => o.posSale).map((o) => o.inAt));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <BackHeader title="Printer and POS" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 6 }}>
          <Display size={34}>
            Orders run <Italic>themselves</Italic>
          </Display>
          <Body style={{ color: colors.muted }}>Each order is accepted, printed and added to your POS the moment it comes in. Your team only taps Ready.</Body>
        </View>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={s.iconWell}>
            <Icon name="printer" size={20} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={s.dot} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.green }}>Connected</Text>
            </View>
            <Text style={s.rowTitle}>Receipt printer</Text>
            <Text style={s.meta}>58 mm · Bluetooth</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => k.notify('Test page sent to the printer')} style={s.small}>
            <Text style={s.smallText}>Test print</Text>
          </Pressable>
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={s.iconWell}>
            <Icon name="server" size={20} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.rowTitle}>[Your POS]</Text>
            <Text style={s.meta}>{st.addToPOS ? `Last sale added ${clock(lastSale)}` : 'Not adding sales'}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => k.notify('Choosing a POS comes once we know which one you use')} style={s.small}>
            <Text style={s.smallText}>Change</Text>
          </Pressable>
        </Card>

        <Label>When an order comes in</Label>
        <Card style={{ paddingVertical: 0 }}>
          <ToggleRow title="Accept it for me" sub="Pauses if the printer goes offline" value={st.autoAccept} onChange={(v) => k.setSetting('autoAccept', v)} />
          <ToggleRow title="Print kitchen ticket" sub="Big order number, extras in black bars" value={st.printTicket} onChange={(v) => k.setSetting('printTicket', v)} />
          <ToggleRow title="Print bag seal and receipt" sub="The seal closes the bag; the rider scans it" value={st.printSeal} onChange={(v) => k.setSetting('printSeal', v)} />
          <ToggleRow title="Add the sale to my POS" sub="Your POS issues the EFRIS receipt number" value={st.addToPOS} onChange={(v) => k.setSetting('addToPOS', v)} last />
        </Card>
        {!st.autoAccept ? <Body style={{ color: colors.muted }}>New orders will pop up for someone to accept, with two minutes to answer.</Body> : null}

        <Pressable accessibilityRole="link" onPress={() => router.push('/display')} style={s.link}>
          <Icon name="monitor" size={18} />
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>Counter display</Text>
            <Text style={s.meta}>Put a tablet on the wall so the whole team sees the line</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.chevron} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  iconWell: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2E9E5B' },
  rowTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  small: { height: 40, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
  smallText: { fontFamily: fonts.bold, fontSize: 13, color: colors.forest },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
});
