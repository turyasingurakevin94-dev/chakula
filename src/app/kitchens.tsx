import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader, Display, FoodImage, Icon } from '../components/ui';
import { restaurants } from '../lib/data';
import { colors, fonts } from '../lib/theme';

type Sort = 'Fastest first' | 'Top rated';

export default function Kitchens() {
  const [openOnly, setOpenOnly] = useState(true);
  const [sort, setSort] = useState<Sort>('Fastest first');
  const popular = [...restaurants].sort((a, b) => b.ratingCount - a.ratingCount)[0]?.id;

  const shown = restaurants
    .filter((r) => !openOnly || !r.opensAt)
    .sort((a, b) => {
      // Closed kitchens always sit at the bottom.
      if (!!a.opensAt !== !!b.opensAt) return a.opensAt ? 1 : -1;
      return sort === 'Fastest first' ? a.minutes - b.minutes : b.rating - a.rating;
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <BackHeader title="All kitchens" />

      <View style={s.filters}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: openOnly }}
          onPress={() => setOpenOnly((x) => !x)}
          style={[s.chip, openOnly && { backgroundColor: colors.forest, borderColor: colors.forest }]}
        >
          {openOnly ? <Icon name="check" size={14} color={colors.cream} /> : null}
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: openOnly ? colors.cream : colors.forest }}>Open now</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sorted ${sort}. Change sort`}
          hitSlop={8}
          onPress={() => setSort((x) => (x === 'Fastest first' ? 'Top rated' : 'Fastest first'))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.forest }}>{sort}</Text>
          <Icon name="chevron-down" size={16} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 18 }} showsVerticalScrollIndicator={false}>
        {shown.map((r) => {
          const closed = !!r.opensAt;
          return (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={closed ? `${r.name}, closed, opens ${r.opensAt}` : `${r.name}, ${r.minutes} minutes`}
              onPress={() => router.push(`/restaurant/${r.id}`)}
              style={({ pressed }) => [{ gap: 10, opacity: pressed ? 0.92 : 1 }]}
            >
              <FoodImage tint={closed ? colors.track : r.tint} photo={r.photo} size={56} style={[s.image, closed && { opacity: 0.6 }]}>
                {r.id === popular && !closed ? <Text style={s.badge}>Popular</Text> : null}
              </FoodImage>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: closed ? colors.muted : colors.forest }}>{r.name}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{r.tags}</Text>
                </View>
                {closed ? (
                  <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.orangeText }}>Opens {r.opensAt}</Text>
                ) : (
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink }}>
                    ★ {r.rating} · {r.minutes} min
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
        {shown.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Display size={21}>No kitchens open right now</Display>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  filters: { paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  image: { height: 128, borderRadius: 20 },
  badge: {
    position: 'absolute',
    left: 8,
    top: 8,
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.cream,
    backgroundColor: colors.forest,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
