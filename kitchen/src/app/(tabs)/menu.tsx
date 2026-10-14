import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Display, Icon, Label, Toggle } from '../../components/ui';
import { useKitchen, type Dish } from '../../lib/kitchen';
import { colors, fonts } from '../../lib/theme';

const SECTIONS: Dish['section'][] = ['Popular', 'Mains', 'Drinks'];

function Camera({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx={12} cy={13} r={3.5} />
    </Svg>
  );
}

// Menu and stock: the switch on each dish is "on sale today".
export default function Menu() {
  const k = useKitchen();
  const missing = k.dishes.filter((d) => !d.hasPhoto);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={{ gap: 2 }}>
            <Label>Nakawa Kitchen</Label>
            <Display>Menu</Display>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Add a dish" onPress={() => k.notify('Adding dishes comes with the real menu')} style={s.add}>
            <Icon name="plus" size={18} color={colors.cream} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.cream }}>Dish</Text>
          </Pressable>
        </View>

        {missing.map((d) => (
          <View key={d.id} style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            <View style={s.prompt}>
              <View style={s.promptIcon}>
                <Camera color={colors.cream} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.cream }}>{d.name} has no photo yet</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.mint }}>Students choose with their eyes. Snap one in daylight.</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 10 }}>
          {SECTIONS.filter((sec) => k.dishes.some((d) => d.section === sec)).map((sec, n) => (
            <View key={sec} style={{ gap: 10, paddingTop: n ? 8 : 0 }}>
              <Label>{sec}</Label>
              {k.dishes
                .filter((d) => d.section === sec)
                .map((d) => (
                  <View key={d.id} style={s.row}>
                    {d.hasPhoto ? (
                      <View style={s.photo}>
                        <Text style={s.photoLabel}>Kitchen photo</Text>
                      </View>
                    ) : (
                      <Pressable accessibilityRole="button" accessibilityLabel={`Add a photo of ${d.name}`} onPress={() => k.notify('The camera opens here in the real app')} style={[s.photo, s.photoMissing]}>
                        <Camera color={colors.forest} />
                        <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.forest }}>Add</Text>
                      </Pressable>
                    )}
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={[s.name, d.soldOut && { color: colors.muted }]}>{d.name}</Text>
                      <Text style={[s.meta, d.soldOut && { color: colors.orangeText, fontFamily: fonts.semibold }]}>
                        {d.soldOut
                          ? `Sold out today${d.backTomorrow ? ' · back tomorrow' : ''}`
                          : [d.price.toLocaleString('en-US'), `${d.minutes} min`, d.extras ? `${d.extras} extra${d.extras > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Toggle label={`${d.name} available`} value={!d.soldOut} onChange={() => k.toggleDish(d.id)} />
                  </View>
                ))}
            </View>
          ))}

          <View style={{ gap: 10, paddingTop: 8 }}>
            <Label>Extras</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {k.extras.map((e) => (
                <Pressable
                  key={e.id}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: !e.soldOut }}
                  accessibilityLabel={`${e.name} on sale`}
                  onPress={() => k.toggleExtra(e.id)}
                  style={[s.extra, e.soldOut && s.extraOff]}
                >
                  <Text style={[s.extraText, e.soldOut && { color: colors.muted, textDecorationLine: 'line-through' }]}>{e.soldOut ? e.name : `${e.name} · ${e.price.toLocaleString('en-US')}`}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  add: { height: 44, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.forest },
  prompt: { backgroundColor: colors.forest, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  promptIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.forestMid, alignItems: 'center', justifyContent: 'center' },
  row: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: { width: 64, height: 64, borderRadius: 14, backgroundColor: colors.food, alignItems: 'center', justifyContent: 'center', gap: 2 },
  photoMissing: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C9B9A3' },
  photoLabel: { fontFamily: fonts.semibold, fontSize: 11, color: '#8C7F6C', textAlign: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  extra: { height: 36, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  extraOff: { backgroundColor: colors.lineSoft, borderColor: colors.lineSoft },
  extraText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.forest },
});
