import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/ui';
import { colors, fonts } from '../../lib/theme';

const tabs: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  search: { label: 'Search', icon: 'search' },
  orders: { label: 'Orders', icon: 'file-text' },
  wallet: { label: 'Wallet', icon: 'credit-card' },
};

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.cream } }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="wallet" />
    </Tabs>
  );
}

function TabBar({ state, navigation }: TabBarProps) {
  return (
    <SafeAreaView edges={['bottom']} style={s.bar}>
      {state.routes.map((route, i) => {
        const tab = tabs[route.name];
        if (!tab) return null;
        const on = i === state.index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!on && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={s.tab}
          >
            <Icon name={tab.icon} size={22} color={on ? colors.forest : colors.muted} />
            <Text style={{ fontSize: 12, fontFamily: on ? fonts.bold : fonts.regular, color: on ? colors.forest : colors.muted }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, height: 64 },
});
