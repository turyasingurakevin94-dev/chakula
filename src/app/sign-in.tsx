import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Display, Label, PrimaryButton, styles as ui } from '../components/ui';
import { useAccount } from '../lib/account';
import { colors, fonts, formatPhone } from '../lib/theme';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const [digits, setDigits] = useState(account.phone ?? '');
  // Ugandan mobile numbers are 9 digits after +256 and start with 7.
  const valid = /^7\d{8}$/.test(digits);
  const showError = digits.length === 9 && !valid;

  const send = () => {
    if (!valid) return;
    account.startSignIn(digits);
    router.push('/verify');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.cream }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 16) + 16 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[s.hero, { paddingTop: insets.top + 20 }]}>
          <Svg width="100%" height="100%" viewBox="0 0 390 330" preserveAspectRatio="xMaxYMid slice" style={StyleSheet.absoluteFill}>
            <Circle cx={40} cy={300} r={90} fill="#24573F" />
            <Circle cx={300} cy={150} r={72} fill={colors.orange} />
            <Path d="M222 178h156a78 78 0 0 1-156 0z" fill={colors.cream} />
            <Path d="M210 178h180" stroke={colors.cream} strokeWidth={8} strokeLinecap="round" />
            <Path d="M282 150c0-12 10-12 10-24s-10-12-10-24M310 150c0-12 10-12 10-24s-10-12-10-24" stroke={colors.forest} strokeWidth={5} fill="none" strokeLinecap="round" />
          </Svg>
          <Display size={24} style={{ color: colors.cream }}>Chakula</Display>
          <View style={{ flex: 1 }} />
          <View style={{ gap: 8, paddingRight: 130 }}>
            <Text style={s.badge}>MUBS Nakawa</Text>
            <Display size={30} style={{ color: colors.cream }}>Hot food to your hostel, fast.</Display>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 28, gap: 6 }}>
          <Display size={26}>Sign in with your phone</Display>
          <Text style={s.body}>We'll text you a code. No password to remember.</Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 8 }}>
          <Label>Phone number</Label>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[ui.card, s.prefix]}>
              <Text style={s.prefixText}>🇺🇬 +256</Text>
            </View>
            <TextInput
              value={formatPhone(digits)}
              onChangeText={(t) => setDigits(t.replace(/\D/g, '').replace(/^0/, '').slice(0, 9))}
              onSubmitEditing={send}
              placeholder="772 123 456"
              placeholderTextColor="#B5AA9A"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              accessibilityLabel="Phone number"
              style={[s.input, { borderColor: showError ? colors.orangeText : colors.forest }]}
            />
          </View>
          <Text style={[s.hint, showError && { color: colors.orangeText }]}>
            {showError ? 'That doesn’t look like an MTN or Airtel number.' : 'Use the number you pay with on MTN or Airtel.'}
          </Text>
        </View>

        <View style={{ flex: 1, minHeight: 32 }} />

        <View style={{ paddingHorizontal: 16, gap: 18 }}>
          <View style={{ opacity: valid ? 1 : 0.45 }}>
            <PrimaryButton floating={valid} label="Send code" onPress={send}>
              <Text style={[ui.primaryText, { flex: 1, textAlign: 'center' }]}>Send code</Text>
            </PrimaryButton>
          </View>
          <Text style={[s.hint, { textAlign: 'center', lineHeight: 19 }]}>
            By continuing you agree to our <Text style={s.link}>Terms</Text> and <Text style={s.link}>Privacy Policy</Text>.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: { height: 330, backgroundColor: colors.forest, paddingHorizontal: 24, paddingBottom: 28, overflow: 'hidden' },
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
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.muted },
  prefix: { height: 56, paddingHorizontal: 14, borderRadius: 16, justifyContent: 'center' },
  prefixText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.forest },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderRadius: 16,
    fontFamily: fonts.semibold,
    fontSize: 17,
    letterSpacing: 0.6,
    color: colors.ink,
  },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  link: { fontFamily: fonts.semibold, color: colors.forest, textDecorationLine: 'underline' },
});
