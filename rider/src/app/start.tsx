import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Body, Button, Headline, Icon, Italic, Label, Num } from '../components/ui';
import { today, useRider } from '../lib/rider';
import { colors, fonts } from '../lib/theme';
import { versionLabel } from '../lib/updates';

const CHECKS = ['Delivery box clean and dry', 'Helmet and Chakula jacket on', 'Fuel for about 18 km'];

// Start your shift: the Gold Rider card and a three-tap check, then Go online.
export default function Start() {
  const { checks, toggleCheck, goOnline, notify, drops } = useRider();

  const go = () => {
    const missing = CHECKS.find((_, i) => !checks[i]);
    if (missing) {
      notify(`Tick "${missing}" first`);
      return;
    }
    goOnline();
    router.replace('/');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 26, gap: 4 }}>
          <Label>{today()} · lunch shift</Label>
          <Headline>
            Ready to ride,{'\n'}
            <Italic>Moses?</Italic>
          </Headline>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={s.member}>
            <Svg width={260} height={200} viewBox="0 0 260 200" style={{ position: 'absolute', right: -60, top: -40 }}>
              {[96, 78, 60, 42].map((r) => (
                <Circle key={r} cx={160} cy={100} r={r} fill="none" stroke={colors.lineSoft} />
              ))}
            </Svg>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ fontFamily: fonts.displayItalic, fontSize: 18, color: colors.forest }}>Chakula</Text>
              <View style={s.gold}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6, color: colors.forest }}>GOLD RIDER</Text>
              </View>
            </View>
            <View style={{ gap: 2 }}>
              <Num size={26}>Moses Kato</Num>
              <Body style={{ fontSize: 13, color: colors.muted }}>Rider 07 · Nakawa campus</Body>
            </View>
            <View style={{ flexDirection: 'row', gap: 22 }}>
              <Stat value="4.9" label="rating" />
              <Stat value="98%" label="on time" />
              <Stat value={String(203 + drops)} label="drops" />
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Label style={{ paddingBottom: 4 }}>Before you go</Label>
          {CHECKS.map((c, i) => (
            <Pressable
              key={c}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: checks[i] }}
              onPress={() => toggleCheck(i)}
              style={[s.check, i < CHECKS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}
            >
              {checks[i] ? (
                <View style={[s.tick, { backgroundColor: colors.forest }]}>
                  <Icon name="check" size={15} color={colors.cream} />
                </View>
              ) : (
                <View style={[s.tick, { borderWidth: 2, borderColor: colors.orange }]} />
              )}
              <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.forest }}>{c}</Text>
            </Pressable>
          ))}
          <Body style={{ paddingTop: 8, fontSize: 13, color: colors.muted }}>Phone at 82% and location on. We checked those for you.</Body>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 18, gap: 10 }}>
        <Button height={60} size={17} style={{ borderRadius: 20 }} onPress={go}>
          Go online
        </Button>
        <Text style={{ textAlign: 'center', fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>11:30 to 2:30 · first pickup 11:45 · 14 drops planned</Text>
        <Text style={{ textAlign: 'center', fontFamily: fonts.regular, fontSize: 11, color: colors.chevron }}>{versionLabel()}</Text>
      </View>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.forest }}>{value}</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  member: {
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 18,
    shadowColor: colors.forest,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  gold: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.forest },
  check: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tick: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
