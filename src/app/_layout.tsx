import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fraunces_400Regular, Fraunces_500Medium_Italic, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaySheet } from '../components/pay-sheet';
import { AccountProvider, useAccount } from '../lib/account';
import { AlertsProvider } from '../lib/alerts';
import { CartProvider } from '../lib/cart';
import { colors } from '../lib/theme';
import { useApplyUpdates } from '../lib/updates';

// Shown instead of a blank screen if a screen crashes, so the error can be read and reported.
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
      <AccountProvider>
        <CartProvider>
          <AlertsProvider>
            <StatusBar style="dark" />
            <Screens />
            <PaySheet />
          </AlertsProvider>
        </CartProvider>
      </AccountProvider>
    </SafeAreaProvider>
  );
}

function Screens() {
  const account = useAccount();
  // On the server, a saved sign-in is checked first, so sign-in doesn't flash before Home.
  if (account.restoring) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Protected guard={!account.verified}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="verify" />
      </Stack.Protected>
      <Stack.Protected guard={account.verified && !account.ready}>
        <Stack.Screen name="setup" />
      </Stack.Protected>
      {/* Once, after setup: ask for alerts. Skipped when the phone can't show them or already does. */}
      <Stack.Protected guard={account.ready && !account.alertsPrimed}>
        <Stack.Screen name="allow" />
      </Stack.Protected>
      <Stack.Protected guard={account.ready && account.alertsPrimed}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="restaurant/[id]" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="tracking" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="place" />
        <Stack.Screen name="payment" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="help" />
        <Stack.Screen name="search" />
        <Stack.Screen name="supper" />
        <Stack.Screen name="kitchens" />
        <Stack.Screen name="specials" />
        <Stack.Screen name="dish" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="rate" options={{ animation: 'slide_from_bottom' }} />
      </Stack.Protected>
    </Stack>
  );
}
