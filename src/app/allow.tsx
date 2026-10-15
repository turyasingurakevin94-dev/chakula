import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, FoodImage, Icon, Italic, Label, PrimaryButton, Scrim, type IconName } from '../components/ui';
import { formatClock, useAccount } from '../lib/account';
import { useAlerts } from '../lib/alerts';
import { blockName, rider } from '../lib/stages';
import { colors, fonts } from '../lib/theme';

// Asked once, after setup, as on the S-Allow board. "Not now" carries on; the code goes by text instead.
export default function Allow() {
  const account = useAccount();
  const alerts = useAlerts();
  const [busy, setBusy] = useState(false);
  const [clock] = useState(() => formatClock(Date.now()));
  const block = blockName(account.place?.name);

  const turnOn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await alerts.requestPermission();
    } finally {
      account.primeAlerts();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 6 }}>
          <Label>Last step · 3 of 3</Label>
          <Display size={32} style={{ lineHeight: 35, letterSpacing: -0.4 }}>
            Know the moment your food is <Italic>at the gate.</Italic>
          </Display>
        </View>

        {/* A lock screen with the gate alert on it. */}
        <View style={s.hero} accessible accessibilityLabel={`Example alert: ${rider.name} is at the ${block} gate, code 7415`}>
          <FoodImage tint={colors.sand} photo="rolex-special" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(24,22,18,0.25)' }]} />
          <Scrim id="allow-scrim" from={0} color="#181612" opacity={0.45} />
          <Text style={s.clock}>{clock}</Text>
          <View style={s.lockCard}>
            <View style={s.appTile}>
              <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.cream }}>C</Text>
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange }} />
                <Text style={s.eyebrow}>AT YOUR GATE</Text>
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.forest }} numberOfLines={2}>
                {rider.name} is at the {block} gate
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.codeLabel}>CODE</Text>
              <Text style={s.code}>7415</Text>
            </View>
          </View>
        </View>

        <View style={{ marginHorizontal: 20, marginTop: 22, gap: 16 }}>
          <Point mark="2" title="Two sounds per order" text={`When ${rider.name} picks it up, and when he’s at your gate. The rest updates quietly.`} />
          <Point icon="moon" title="Quiet after 10 pm" text="Only your own late-night order can reach you." />
          <Point icon="shield" title="No spam, ever" text="Offers only if you ask for them, and never more than one a week." />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8, gap: 4 }}>
        <PrimaryButton floating label="Turn on alerts" disabled={busy} onPress={turnOn}>
          Turn on alerts
        </PrimaryButton>
        <Pressable accessibilityRole="button" onPress={account.primeAlerts} style={({ pressed }) => [s.notNow, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.forest }}>Not now</Text>
        </Pressable>
        <Text style={{ textAlign: 'center', fontFamily: fonts.regular, fontSize: 12, color: colors.sub }}>Without alerts, we’ll text your handover code instead.</Text>
      </View>
    </SafeAreaView>
  );
}

function Point({ mark, icon, title, text }: { mark?: string; icon?: IconName; title: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
      <View style={s.pointMark}>{icon ? <Icon name={icon} size={18} /> : <Text style={{ fontFamily: fonts.display, fontSize: 17, color: colors.forest }}>{mark}</Text>}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{title}</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted }}>{text}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    marginHorizontal: 20,
    marginTop: 20,
    height: 236,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: colors.food,
    shadowColor: colors.forest,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },
  clock: { position: 'absolute', left: 0, right: 0, top: 18, textAlign: 'center', fontFamily: fonts.displayLight, fontSize: 40, lineHeight: 44, color: '#FFFFFF' },
  lockCard: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: 'rgba(255,248,240,0.97)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  appTile: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4, color: colors.orangeText },
  codeLabel: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.26, color: colors.muted },
  code: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1.3, color: colors.forest },
  pointMark: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  notNow: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
