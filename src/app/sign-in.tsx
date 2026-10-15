import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FoodImage, Icon, Label, PrimaryButton } from '../components/ui';
import { useAccount } from '../lib/account';
import { onServer } from '../lib/server';
import { colors, fonts, formatPhone, smallCaps } from '../lib/theme';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const [digits, setDigits] = useState(account.phone ?? '');
  // Ugandan mobile numbers are 9 digits after +256 and start with 7.
  const valid = /^7\d{8}$/.test(digits);
  const showError = digits.length === 9 && !valid;
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const send = async () => {
    if (!valid || sending) return;
    setSending(true);
    setFailed(null);
    try {
      await account.startSignIn(digits);
      router.push('/verify');
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'That didn’t work. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.cream }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 16) + 16 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[s.hero, { paddingTop: insets.top }]}>
          <FoodImage tint={colors.food} photo="rice-pan" size={190} style={[StyleSheet.absoluteFill, { bottom: 70 }]} />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
              <Defs>
                <LinearGradient id="signin-hero" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset={0} stopColor={colors.forest} stopOpacity={0.2} />
                  <Stop offset={0.4} stopColor={colors.forest} stopOpacity={0.15} />
                  <Stop offset={0.82} stopColor={colors.forest} stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="10" height="10" fill="url(#signin-hero)" />
            </Svg>
          </View>
          <Text style={s.wordmark}>Chakula</Text>
          <View style={{ flex: 1 }} />
          <View style={{ gap: 10, alignItems: 'center' }}>
            <Text style={[smallCaps, { color: colors.peachText }]}>MUBS Nakawa · delivered in minutes</Text>
            <Text style={s.headline}>
              Campus dining,{'\n'}
              <Text style={{ fontFamily: fonts.displayItalic }}>done properly.</Text>
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 26, gap: 12 }}>
          <Label>Sign in with your phone</Label>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={s.prefix}>
              <Text style={s.prefixText}>+256</Text>
            </View>
            <TextInput
              value={formatPhone(digits)}
              onChangeText={(t) => setDigits(t.replace(/\D/g, '').replace(/^0/, '').slice(0, 9))}
              onSubmitEditing={send}
              placeholder="772 123 456"
              placeholderTextColor={colors.chevron}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              accessibilityLabel="Phone number"
              style={[s.input, { borderColor: showError ? colors.orangeText : colors.forest }]}
            />
          </View>
          {showError || failed ? (
            <Text style={[s.hint, { color: colors.orangeText }]}>{failed ?? 'That doesn’t look like an MTN or Airtel number.'}</Text>
          ) : onServer ? null : (
            // The server doesn't give free deliveries yet, so the offer only shows in the sample app.
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="gift" size={15} />
              <Text style={s.hint}>Your first three deliveries are on us.</Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1, minHeight: 32 }} />

        <View style={{ paddingHorizontal: 16, gap: 18 }}>
          <PrimaryButton floating disabled={!valid} label="Continue" onPress={send}>
            Continue
          </PrimaryButton>
          <Text style={[s.hint, { textAlign: 'center', lineHeight: 17, fontSize: 12, color: colors.sub, paddingHorizontal: 8 }]}>
            By continuing you agree to our <Text style={s.link}>Terms</Text> and <Text style={s.link}>Privacy Policy</Text>.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: { height: 430, backgroundColor: colors.forest, paddingHorizontal: 24, paddingBottom: 30, overflow: 'hidden' },
  wordmark: { marginTop: 26, textAlign: 'center', fontFamily: fonts.display, fontSize: 22, letterSpacing: 0.4, color: colors.cream },
  headline: { fontFamily: fonts.displayLight, fontSize: 36, lineHeight: 38, letterSpacing: -0.5, color: colors.cream, textAlign: 'center' },
  prefix: { height: 56, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  prefixText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.forest },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderRadius: 14,
    fontFamily: fonts.semibold,
    fontSize: 17,
    letterSpacing: 1,
    color: colors.ink,
  },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  link: { fontFamily: fonts.semibold, color: colors.forest, textDecorationLine: 'underline' },
});
