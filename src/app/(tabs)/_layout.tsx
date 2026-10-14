import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, fonts } from '../../lib/theme';

type TabIcon = 'home' | 'orders' | 'plans';

const tabs: Record<string, { label: string; icon: TabIcon }> = {
  index: { label: 'Home', icon: 'home' },
  orders: { label: 'Orders', icon: 'orders' },
  plans: { label: 'Plans', icon: 'plans' },
};

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.cream } }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="plans" />
    </Tabs>
  );
}

// Thin 1.6 stroke icons drawn to match the boards.
function Glyph({ name, color }: { name: TabIcon; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {name === 'home' ? (
        <>
          <Path d="M3 11 12 4l9 7" />
          <Path d="M5 10v10h14V10" />
        </>
      ) : name === 'orders' ? (
        <>
          <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
          <Path d="M9 8h6M9 12h6" />
        </>
      ) : (
        <>
          <Rect x={4} y={5} width={16} height={16} rx={2} />
          <Path d="M4 10h16M9 3v4M15 3v4" />
        </>
      )}
    </Svg>
  );
}

function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      {state.routes.map((route, i) => {
        const tab = tabs[route.name];
        if (!tab) return null;
        const on = i === state.index;
        const color = on ? colors.forest : colors.sub;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: on }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!on && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={s.tab}
          >
            <Glyph name={tab.icon} color={color} />
            <Text style={[s.label, { color, fontFamily: on ? fonts.bold : fonts.medium }]}>{tab.label}</Text>
            <View style={[s.dot, on && { backgroundColor: colors.orange }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: colors.divider },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 12 },
  label: { fontSize: 11, letterSpacing: 0.66, textTransform: 'uppercase' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
});
