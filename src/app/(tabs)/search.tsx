import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, FoodImage, Icon, Label, styles as ui } from '../../components/ui';
import { restaurants } from '../../lib/data';
import { colors, fonts, formatUGX } from '../../lib/theme';

export default function Search() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const dishes = restaurants.flatMap((r) => r.menu.map((item) => ({ item, restaurant: r })));
  const matches = q ? dishes.filter(({ item, restaurant }) => `${item.name} ${item.description} ${restaurant.name}`.toLowerCase().includes(q)) : [];
  const places = q ? restaurants.filter((r) => `${r.name} ${r.tags}`.toLowerCase().includes(q)) : restaurants;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Display>Search</Display>
      </View>
      <View style={[ui.card, s.search]}>
        <Icon name="search" size={20} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoFocus
          placeholder="Search rolex, pilau, juice…"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={{ flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 15, color: colors.ink }}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery('')}>
            <Icon name="x" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 10 }} keyboardShouldPersistTaps="handled">
        {matches.length > 0 ? <Label style={{ marginTop: 18 }}>Dishes</Label> : null}
        {matches.map(({ item, restaurant }) => (
          <Pressable key={`${restaurant.id}-${item.id}`} onPress={() => router.push(`/restaurant/${restaurant.id}`)} style={[ui.card, s.row]}>
            <FoodImage tint={item.tint} size={24} style={s.thumb} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.strong}>{item.name}</Text>
              <Text style={s.meta}>
                {restaurant.name} · {formatUGX(item.price)}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color="#B5AA9A" />
          </Pressable>
        ))}

        {places.length > 0 ? <Label style={{ marginTop: 18 }}>{q ? 'Kitchens' : 'All kitchens near you'}</Label> : null}
        {places.map((r) => (
          <Pressable key={r.id} onPress={() => router.push(`/restaurant/${r.id}`)} style={[ui.card, s.row]}>
            <FoodImage tint={r.tint} size={24} style={s.thumb} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.strong}>{r.name}</Text>
              <Text style={s.meta}>
                {r.tags} · {r.minutes} min
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color="#B5AA9A" />
          </Pressable>
        ))}

        {q && matches.length === 0 && places.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 48, gap: 6 }}>
            <Display size={21}>Nothing for “{query.trim()}” yet</Display>
            <Text style={s.meta}>Try rolex, pilau or juice.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  search: { marginHorizontal: 20, marginTop: 18, height: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18 },
  thumb: { width: 48, height: 48, borderRadius: 12 },
  strong: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
