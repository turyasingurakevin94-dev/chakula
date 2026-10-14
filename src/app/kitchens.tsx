import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, FoodImage, Icon, IconButton, styles as ui, type IconName } from '../components/ui';
import { useAccount } from '../lib/account';
import { restaurants, type Restaurant } from '../lib/data';
import { colors, fonts, formatUGX } from '../lib/theme';

type Filter = { id: string; label: string; icon?: IconName; test: (r: Restaurant) => boolean };

const filters: Filter[] = [
  { id: 'open', label: 'Open now', test: (r) => !r.opensAt },
  { id: 'fast', label: 'Under 15 min', icon: 'clock', test: (r) => r.minutes < 15 },
  { id: 'free', label: 'Free delivery', test: (r) => r.deliveryFee === 0 },
  { id: 'top', label: 'Top rated', icon: 'star', test: (r) => r.rating >= 4.7 },
];

type Sort = 'Fastest' | 'Top rated';

export default function Kitchens() {
  const account = useAccount();
  const [query, setQuery] = useState('');
  const [on, setOn] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>('Fastest');
  const q = query.trim().toLowerCase();
  const popular = [...restaurants].sort((a, b) => b.ratingCount - a.ratingCount)[0]?.id;

  const shown = restaurants
    .filter((r) => !q || `${r.name} ${r.tags}`.toLowerCase().includes(q))
    .filter((r) => filters.every((f) => !on.includes(f.id) || f.test(r)))
    .sort((a, b) => {
      // Closed kitchens always sit at the bottom.
      if (!!a.opensAt !== !!b.opensAt) return a.opensAt ? 1 : -1;
      return sort === 'Fastest' ? a.minutes - b.minutes : b.rating - a.rating;
    });
  const toggle = (id: string) => setOn((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={s.header}>
        <IconButton icon="chevron-left" label="Back" variant="outline" style={{ backgroundColor: colors.card }} onPress={() => router.back()} />
        <Display size={26}>All kitchens</Display>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[ui.card, s.search]}>
          <Icon name="search" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search kitchens"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={{ flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 15, color: colors.ink }}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 14 }}>
          {filters.map((f) => {
            const active = on.includes(f.id);
            const icon = active ? 'check' : f.icon;
            return (
              <Pressable
                key={f.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                onPress={() => toggle(f.id)}
                style={[s.chip, active && { backgroundColor: colors.forest, borderColor: colors.forest }]}
              >
                {icon ? <Icon name={icon} size={15} color={active ? colors.cream : colors.forest} /> : null}
                <Text style={{ fontFamily: active ? fonts.bold : fonts.medium, fontSize: 14, color: active ? colors.cream : colors.ink }}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.countRow}>
          <Text style={s.meta14}>
            <Text style={{ fontFamily: fonts.bold, color: colors.forest }}>
              {shown.length} {shown.length === 1 ? 'kitchen' : 'kitchens'}
            </Text>{' '}
            deliver to {account.place?.name.replace(' Hostel', '') ?? 'you'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sorted by ${sort}. Change sort`}
            hitSlop={8}
            onPress={() => setSort((x) => (x === 'Fastest' ? 'Top rated' : 'Fastest'))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>{sort}</Text>
            <Icon name="chevron-down" size={16} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {shown.map((r) => {
            const closed = !!r.opensAt;
            return (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={closed ? `${r.name}, closed, opens ${r.opensAt}` : `${r.name}, ${r.minutes} minutes`}
                onPress={() => router.push(`/restaurant/${r.id}`)}
                style={({ pressed }) => [ui.card, s.row, closed && { backgroundColor: '#FFFCF8' }, { opacity: pressed ? 0.92 : 1 }]}
              >
                <View style={{ opacity: closed ? 0.55 : 1 }}>
                  <FoodImage tint={closed ? colors.track : r.tint} size={30} style={s.thumb} />
                  {r.id === popular && !closed ? <Text style={s.popular}>Popular</Text> : null}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[s.strong, closed && { color: '#8A9A90' }]}>{r.name}</Text>
                  <Text style={[s.meta, closed && { color: '#A8A49B' }]}>{r.tags}</Text>
                  {closed ? (
                    <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.orangeText }}>Opens {r.opensAt}</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.forest }}>★ {r.rating}</Text>
                      <Text style={s.ink13}>{r.minutes} min</Text>
                      <Text style={s.ink13}>{r.deliveryFee === 0 ? 'Free delivery' : formatUGX(r.deliveryFee)}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}

          {shown.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 40, gap: 6 }}>
              <Display size={21}>No kitchens match</Display>
              <Pressable onPress={() => { setOn([]); setQuery(''); }} hitSlop={8}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.forest, textDecorationLine: 'underline' }}>Clear filters</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  search: { marginHorizontal: 20, marginTop: 16, height: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16 },
  chip: { height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 6 },
  countRow: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 20 },
  thumb: { width: 84, height: 84, borderRadius: 14 },
  popular: {
    position: 'absolute',
    left: 6,
    top: 6,
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.forest,
    backgroundColor: colors.orange,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  strong: { fontFamily: fonts.bold, fontSize: 16, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  meta14: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  ink13: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink },
});
