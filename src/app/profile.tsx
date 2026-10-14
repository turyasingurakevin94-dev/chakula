import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, Icon, IconButton, Label, styles as ui, type IconName } from '../components/ui';
import { useAccount } from '../lib/account';
import { student } from '../lib/data';
import { colors, fonts, formatPhone } from '../lib/theme';

type Row = { icon: IconName; title: string; detail?: string; accent?: boolean };

export default function Profile() {
  const account = useAccount();

  const accountRows: Row[] = [
    { icon: 'map-pin', title: 'Saved places', detail: account.note ? `${account.address} · ${account.note}` : account.address },
    { icon: 'credit-card', title: 'Payment methods', detail: `MTN Mobile Money · ${account.maskedPhone}` },
    { icon: 'bell', title: 'Notifications' },
  ];
  const moreRows: Row[] = [
    { icon: 'gift', title: 'Invite a friend, get UGX 3,000', detail: 'They get free delivery too', accent: true },
    { icon: 'help-circle', title: 'Help and support', detail: 'Chat with us on WhatsApp' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={s.header}>
        <IconButton icon="chevron-left" label="Back" variant="outline" style={{ backgroundColor: colors.card }} onPress={() => router.back()} />
        <Display size={26}>Profile</Display>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={s.person}>
          <View style={s.avatar}>
            <Display size={24} style={{ color: colors.cream }}>
              {account.initials}
            </Display>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Display size={22}>{account.name}</Display>
            <Text style={s.meta14}>+256 {formatPhone(account.phone ?? '')}</Text>
          </View>
        </View>

        <View style={s.stats}>
          <View style={[ui.card, s.stat]}>
            <Display size={24}>{account.orders.length}</Display>
            <Text style={s.meta}>Orders</Text>
          </View>
          <View style={[ui.card, s.stat]}>
            <Display size={24}>{student.freeDeliveriesLeft} left</Display>
            <Text style={s.meta}>Free deliveries</Text>
          </View>
        </View>

        <View style={s.section}>
          <Label>Account</Label>
          <Group rows={accountRows} />
        </View>
        <View style={[s.section, { paddingTop: 16 }]}>
          <Group rows={moreRows} />
        </View>

        <Pressable accessibilityRole="button" onPress={account.signOut} style={s.signOut}>
          <Icon name="log-out" size={18} color={colors.orangeText} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.orangeText }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ rows }: { rows: Row[] }) {
  return (
    <View style={[ui.card, { borderRadius: 18, overflow: 'hidden' }]}>
      {rows.map((r, i) => (
        <Pressable key={r.title} accessibilityRole="button" style={({ pressed }) => [s.row, i < rows.length - 1 && s.divider, pressed && { backgroundColor: '#FFF4EC' }]}>
          <View style={[s.tile, { backgroundColor: r.accent ? colors.peach : colors.lineSoft }]}>
            <Icon name={r.icon} size={18} color={r.accent ? colors.orangeText : colors.forest} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={s.strong}>{r.title}</Text>
            {r.detail ? (
              <Text style={s.meta} numberOfLines={1}>
                {r.detail}
              </Text>
            ) : null}
          </View>
          <Icon name="chevron-right" size={18} color="#B5AA9A" />
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  person: { paddingHorizontal: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  stats: { paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 14, gap: 2, borderRadius: 18 },
  section: { paddingHorizontal: 20, paddingTop: 18, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  tile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  strong: { fontFamily: fonts.semibold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  meta14: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  signOut: { marginHorizontal: 20, marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 6 },
});
