import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountProvider, useAccount } from '../lib/account';
import { CartProvider } from '../lib/cart';
import { colors } from '../lib/theme';
import { useApplyUpdates } from '../lib/updates';

export default function RootLayout() {
  useApplyUpdates();
  const [loaded] = useFonts({ Fraunces_600SemiBold, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold });

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  return (
    <SafeAreaProvider>
      <AccountProvider>
        <CartProvider>
          <StatusBar style="dark" />
          <Screens />
        </CartProvider>
      </AccountProvider>
    </SafeAreaProvider>
  );
}

function Screens() {
  const account = useAccount();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Protected guard={!account.verified}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="verify" />
      </Stack.Protected>
      <Stack.Protected guard={account.verified && !account.ready}>
        <Stack.Screen name="setup" />
      </Stack.Protected>
      <Stack.Protected guard={account.ready}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="restaurant/[id]" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="tracking" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="kitchens" />
        <Stack.Screen name="specials" />
        <Stack.Screen name="dish" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="rate" options={{ animation: 'slide_from_bottom' }} />
      </Stack.Protected>
    </Stack>
  );
}
