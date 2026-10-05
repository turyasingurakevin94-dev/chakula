import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, FoodImage, Icon, styles as ui, type IconName } from '../components/ui';
import { foodCategories, restaurants, student } from '../lib/data';
import { colors, fonts, formatUGX } from '../lib/theme';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const [category, setCategory] = useState('All');
  const fastest = [...restaurants].sort((a, b) => a.minutes - b.minutes);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Deliver to ${student.hostel}. Change address`} style={s.address}>
            <View style={s.pin}>
              <Icon name="map-pin" size={18} color={colors.orangeText} />
            </View>
            <View>
              <Text style={s.overline}>Deliver to</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.addressText}>Hostel · {student.hostel}</Text>
                <Icon name="chevron-down" size={16} />
              </View>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Profile" style={s.avatar}>
            <Text style={{ color: colors.cream, fontFamily: fonts.semibold, fontSize: 15 }}>{student.initials}</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.muted }}>
            {greeting()}, {student.firstName}
          </Text>
          <Display style={{ marginTop: 4 }}>What are you craving tonight?</Display>
        </View>

        <View style={s.search}>
          <Icon name="search" size={20} color={colors.muted} />
          <TextInput
            placeholder="Search rolex, pilau, juice…"
            placeholderTextColor={colors.muted}
            style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, height: '100%' }}
          />
        </View>

        <View style={s.promo}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.badge}>New on campus</Text>
            <Display size={22} style={{ color: colors.cream }}>
              Free delivery on your first {student.freeDeliveriesLeft} orders
            </Display>
          </View>
          <View style={s.promoIcon}>
            <Icon name="zap" size={32} color={colors.forest} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 20 }}>
          {foodCategories.map((c) => {
            const on = c === category;
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setCategory(c)}
                style={[s.chip, on ? { backgroundColor: colors.forest, borderColor: colors.forest } : null]}
              >
                <Text style={{ fontFamily: on ? fonts.semibold : fonts.medium, fontSize: 14, color: on ? colors.cream : colors.ink }}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.sectionHead}>
          <Display size={21}>Fastest to your hostel</Display>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.forest }}>See all</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 20 }}>
          {fastest.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`${r.name}, ${r.minutes} minutes`}
              onPress={() => router.push(`/restaurant/${r.id}`)}
              style={({ pressed }) => [ui.card, s.restaurantCard, { opacity: pressed ? 0.92 : 1 }]}
            >
              <FoodImage tint={r.tint} style={{ height: 120 }} />
              <View style={s.timeTag}>
                <Icon name="clock" size={13} />
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.forest }}>{r.minutes} min</Text>
              </View>
              <View style={{ padding: 16, paddingTop: 14, gap: 4 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>{r.name}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{r.tags}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }}>★ {r.rating}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink }}>{formatUGX(r.deliveryFee)} delivery</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>

      <TabBar />
    </SafeAreaView>
  );
}

function TabBar() {
  const tabs: { label: string; icon: IconName }[] = [
    { label: 'Home', icon: 'home' },
    { label: 'Search', icon: 'search' },
    { label: 'Orders', icon: 'file-text' },
    { label: 'Wallet', icon: 'credit-card' },
  ];
  return (
    <SafeAreaView edges={['bottom']} style={s.tabBar}>
      {tabs.map((t, i) => {
        const on = i === 0;
        return (
          <Pressable key={t.label} accessibilityRole="tab" accessibilityState={{ selected: on }} style={s.tab}>
            <Icon name={t.icon} size={22} color={on ? colors.forest : colors.muted} />
            <Text style={{ fontSize: 12, fontFamily: on ? fonts.bold : fonts.regular, color: on ? colors.forest : colors.muted }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  address: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pin: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  overline: { fontFamily: fonts.regular, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.muted },
  addressText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.forest },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  search: {
    marginHorizontal: 20,
    marginTop: 18,
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
  },
  promo: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.forest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.forest,
    backgroundColor: colors.orange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  promoIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, justifyContent: 'center' },
  sectionHead: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  restaurantCard: { width: 262, overflow: 'hidden' },
  timeTag: {
    position: 'absolute',
    left: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cream,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, height: 64 },
});
