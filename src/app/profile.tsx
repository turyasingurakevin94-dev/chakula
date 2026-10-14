import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader, Display, Icon, styles as ui, type IconName } from '../components/ui';
import { useAccount } from '../lib/account';
import { student } from '../lib/data';
import { colors, fonts, formatPhone, formatUGX } from '../lib/theme';
import { versionLabel } from '../lib/updates';

type Row = { icon: IconName; title: string; detail?: string; value?: string; accent?: boolean; onPress?: () => void };

export default function Profile() {
  const account = useAccount();

  const accountRows: Row[] = [
    { icon: 'credit-card', title: 'Wallet', detail: 'Top up and see activity', value: formatUGX(account.balance), onPress: () => router.push('/wallet') },
    { icon: 'map-pin', title: 'Saved places', detail: account.note ? `${account.address} · ${account.note}` : account.address },
    { icon: 'smartphone', title: 'Payment methods', detail: 'MTN Mobile Money' },
  ];
  const moreRows: Row[] = [
    { icon: 'gift', title: 'Invite a friend, get UGX 3,000', detail: 'They get free delivery too', accent: true },
    { icon: 'help-circle', title: 'Help', detail: 'Chat with us on WhatsApp', onPress: () => router.push('/help') },
  ];
  const left = student.freeDeliveriesLeft;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <BackHeader title="Profile" />

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

        {left > 0 ? (
          <View style={s.banner}>
            <Icon name="truck" size={22} color={colors.orangeText} />
            <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.forest }}>
              <Text style={{ fontFamily: fonts.bold }}>
                {left} free {left === 1 ? 'delivery' : 'deliveries'} left.
              </Text>{' '}
              They’re applied for you at checkout.
            </Text>
          </View>
        ) : null}

        <View style={s.section}>
          <Group rows={accountRows} />
        </View>
        <View style={[s.section, { paddingTop: 14 }]}>
          <Group rows={moreRows} />
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={account.signOut} style={s.signOut}>
          <Icon name="log-out" size={18} color={colors.orangeText} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.orangeText }}>Sign out</Text>
        </Pressable>

        <Text style={[s.meta, { paddingHorizontal: 20, paddingTop: 18, fontSize: 12, color: colors.sub }]}>{versionLabel()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ rows }: { rows: Row[] }) {
  return (
    <View style={[ui.card, { overflow: 'hidden' }]}>
      {rows.map((r, i) => (
        <Pressable key={r.title} accessibilityRole="button" accessibilityLabel={r.value ? `${r.title}, ${r.value}` : r.title} onPress={r.onPress} style={({ pressed }) => [s.row, i < rows.length - 1 && s.divider, pressed && { backgroundColor: colors.highlight }]}>
          <View style={[s.tile, { backgroundColor: r.accent ? colors.tile : colors.lineSoft }]}>
            <Icon name={r.icon} size={18} color={r.accent ? colors.orangeText : colors.forest} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.strong}>{r.title}</Text>
            {r.detail ? (
              <Text style={s.meta} numberOfLines={1}>
                {r.detail}
              </Text>
            ) : null}
          </View>
          {r.value ? <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{r.value}</Text> : null}
          <Icon name="chevron-right" size={18} color={colors.chevron} />
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  person: { paddingHorizontal: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  banner: { marginHorizontal: 20, marginTop: 18, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, backgroundColor: colors.tile, flexDirection: 'row', alignItems: 'center', gap: 12 },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  tile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  strong: { fontFamily: fonts.semibold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  meta14: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  signOut: { marginHorizontal: 20, marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 6 },
});
