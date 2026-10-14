import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, Display, Icon, Label } from '../../components/ui';
import { useKitchen, type Dish } from '../../lib/kitchen';
import { colors, fonts } from '../../lib/theme';

const SECTIONS: Dish['section'][] = ['Popular', 'Mains', 'Drinks'];

// Menu and stock: the switch on each dish is "on sale today".
export default function Menu() {
  const k = useKitchen();
  const missing = k.dishes.filter((d) => !d.hasPhoto);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Label style={{ color: colors.muted }}>Nakawa Kitchen</Label>
            <Display>Menu</Display>
          </View>
          <Pressable accessibilityRole="button" onPress={() => k.notify('Adding dishes comes with the real menu')} style={s.add}>
            <Icon name="plus" size={18} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>Dish</Text>
          </Pressable>
        </View>

        {missing.map((d) => (
          <View key={d.id} style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            <Card highlight style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[s.photo, { backgroundColor: colors.peach }]}>
                <Icon name="camera" size={20} color={colors.orangeText} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.name}>{d.name} has no photo yet</Text>
                <Text style={s.meta}>Students choose with their eyes. Snap one in daylight.</Text>
              </View>
            </Card>
          </View>
        ))}

        {SECTIONS.map((sec) => (
          <View key={sec} style={{ paddingHorizontal: 20, paddingTop: 18, gap: 8 }}>
            <Label>{sec}</Label>
            <Card style={{ paddingVertical: 4 }}>
              {k.dishes
                .filter((d) => d.section === sec)
                .map((d, i, list) => (
                  <View key={d.id} style={[s.row, i < list.length - 1 && s.divider]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={d.hasPhoto ? `${d.name} photo` : `Add a photo of ${d.name}`}
                      onPress={() => !d.hasPhoto && k.notify('The camera opens here in the real app')}
                      style={[s.photo, !d.hasPhoto && s.photoMissing]}
                    >
                      {d.hasPhoto ? <Text style={s.photoLabel}>Kitchen photo</Text> : <Text style={[s.photoLabel, { color: colors.orangeText }]}>Add</Text>}
                    </Pressable>
                    <View style={{ flex: 1, gap: 2, opacity: d.soldOut ? 0.6 : 1 }}>
                      <Text style={s.name}>{d.name}</Text>
                      <Text style={[s.meta, d.soldOut && { color: colors.orangeText, fontFamily: fonts.semibold }]}>
                        {d.soldOut
                          ? `Sold out today${d.backTomorrow ? ' · back tomorrow' : ''}`
                          : [d.price.toLocaleString('en-US'), `${d.minutes} min`, d.extras ? `${d.extras} extra${d.extras > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel={`${d.name} on sale today`}
                      value={!d.soldOut}
                      onValueChange={() => k.toggleDish(d.id)}
                      trackColor={{ false: colors.border, true: colors.forest }}
                      thumbColor={colors.card}
                      ios_backgroundColor={colors.border}
                    />
                  </View>
                ))}
            </Card>
          </View>
        ))}

        <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 8 }}>
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
          <Body style={{ color: colors.muted }}>Tap an extra to mark it sold out. Students stop seeing it straight away.</Body>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  add: { height: 44, borderRadius: 22, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  photo: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.food, alignItems: 'center', justifyContent: 'center' },
  photoMissing: { backgroundColor: colors.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.orange },
  photoLabel: { fontFamily: fonts.semibold, fontSize: 9, color: colors.sub, textAlign: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  extra: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.forest },
  extraOff: { borderColor: colors.line, backgroundColor: colors.tile },
  extraText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.forest },
});
