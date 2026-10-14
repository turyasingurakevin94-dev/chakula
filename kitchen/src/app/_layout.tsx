import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fraunces_400Regular, Fraunces_500Medium_Italic, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Incoming } from '../components/incoming';
import { Icon } from '../components/ui';
import { KitchenProvider, useKitchen } from '../lib/kitchen';
import { colors, fonts } from '../lib/theme';
import { useApplyUpdates } from '../lib/updates';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, padding: 24, paddingTop: 80, gap: 14 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.forest }}>Something went wrong</Text>
      <Text style={{ fontSize: 15, lineHeight: 21, color: colors.ink }}>Please take a screenshot of this and send it to the Chakula team.</Text>
      <Text selectable style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>
        {error.name}: {error.message}
      </Text>
      <Pressable accessibilityRole="button" onPress={retry} style={{ alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.forest }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.cream }}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  useApplyUpdates();
  const [loaded] = useFonts({ Fraunces_400Regular, Fraunces_500Medium_Italic, Fraunces_600SemiBold, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold });

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  return (
    <SafeAreaProvider>
      <KitchenProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="order/[id]" />
          <Stack.Screen name="receipt/[id]" />
          <Stack.Screen name="setup" />
          <Stack.Screen name="display" />
        </Stack>
        <Incoming />
        <Toast />
      </KitchenProvider>
    </SafeAreaProvider>
  );
}

// "New order 4824 accepted and printed", shown briefly at the top.
function Toast() {
  const { toast } = useKitchen();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8, alignItems: 'center' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: colors.forest,
          shadowOpacity: 0.16,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <Icon name="printer" size={18} />
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.forest }}>{toast}</Text>
      </View>
    </View>
  );
}
