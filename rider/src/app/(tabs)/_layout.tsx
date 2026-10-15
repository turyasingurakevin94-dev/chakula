import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useRider } from '../../lib/rider';
import { colors, fonts } from '../../lib/theme';

type TabIcon = 'run' | 'shift' | 'money';

const tabs: Record<string, { label: string; icon: TabIcon }> = {
  index: { label: 'Run', icon: 'run' },
  shift: { label: 'Shift', icon: 'shift' },
  money: { label: 'Money', icon: 'money' },
};

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export default function TabsLayout() {
  const { online } = useRider();
  // Offline riders start with the shift check.
  if (!online) return <Redirect href="/start" />;
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.cream } }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="shift" />
      <Tabs.Screen name="money" />
    </Tabs>
  );
}

function Glyph({ name, color }: { name: TabIcon; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {name === 'run' ? (
        <>
          <Circle cx={6} cy={17} r={3} />
          <Circle cx={18} cy={17} r={3} />
          <Path d="M6 17l4-8h5l3 8M10 9H7" />
        </>
      ) : name === 'shift' ? (
        <>
          <Rect x={4} y={5} width={16} height={16} rx={2} />
          <Path d="M4 10h16M9 3v4M15 3v4" />
        </>
      ) : (
        <>
          <Rect x={3} y={6} width={18} height={13} rx={2} />
          <Path d="M16 12h2" />
        </>
      )}
    </Svg>
  );
}

function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { height: 70 + Math.max(insets.bottom, 14), paddingBottom: Math.max(insets.bottom, 14) }]}>
      {state.routes.map((route, i) => {
        const tab = tabs[route.name];
        if (!tab) return null;
        const on = i === state.index;
        const color = on ? colors.forest : colors.muted;
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
            <Text style={[s.label, { color, fontFamily: on ? fonts.bold : fonts.regular }]}>{tab.label}</Text>
            <View style={[s.dot, on && { backgroundColor: colors.orange }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 12 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
