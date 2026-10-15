import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, Headline, Italic, Label } from '../components/ui';
import { useRider } from '../lib/rider';
import { onServer, sendCode, verifyCode } from '../lib/server';
import { errorText } from '../lib/serverRuns';
import { colors, fonts } from '../lib/theme';
import { versionLabel } from '../lib/updates';

// Sign in with the phone number Chakula has for the rider, then the 6-digit SMS code. Only on the
// server; the sample app has no sign-in.
export default function SignIn() {
  const { user, signIn } = useRider();
  const [phone, setPhone] = useState('');
  // The number the code went to, once sent.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeInput = useRef<TextInput>(null);

  if (!onServer || user) return <Redirect href="/" />;

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await sendCode(phone, 'rider');
      setSentTo(res.phone);
      // Dev servers hand the code back instead of texting it.
      setCode(res.devCode ?? '');
      setTimeout(() => codeInput.current?.focus(), 200);
    } catch (e) {
      setError(errorText(e));
    }
    setBusy(false);
  };

  const verify = async (digits = code) => {
    if (busy || digits.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await verifyCode(sentTo ?? phone, digits, 'rider');
      signIn(res.user);
      router.replace('/');
      return;
    } catch (e) {
      setError(errorText(e));
    }
    setBusy(false);
  };

  const onCode = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError(null);
    if (digits.length === 6) verify(digits);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={s.top}>
            <Text style={s.brand}>
              Chakula <Text style={s.brandTag}>RIDER</Text>
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 26, gap: 8 }}>
            <Label>{sentTo ? 'Sign in · step 2 of 2' : 'Sign in · step 1 of 2'}</Label>
            <Headline>
              {sentTo ? 'Type the code' : 'Your rider'}
              {'\n'}
              <Italic>{sentTo ? 'we texted you.' : 'phone number.'}</Italic>
            </Headline>
            <Body style={{ color: colors.body }}>
              {sentTo ? `Six digits, sent to ${sentTo}.` : 'The number Chakula has for you. We text it a 6-digit code.'}
            </Body>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 10 }}>
            {sentTo ? (
              <>
                <Text nativeID="code-label" style={s.fieldLabel}>
                  6-digit code
                </Text>
                <TextInput
                  ref={codeInput}
                  value={code}
                  onChangeText={onCode}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor={colors.chevron}
                  accessibilityLabel="6-digit code"
                  style={[s.input, s.code, error && { borderColor: colors.danger }]}
                />
              </>
            ) : (
              <>
                <Text nativeID="phone-label" style={s.fieldLabel}>
                  Phone number
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    setError(null);
                  }}
                  onSubmitEditing={send}
                  autoFocus
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  placeholder="07XX XXX XXX"
                  placeholderTextColor={colors.chevron}
                  accessibilityLabel="Phone number"
                  style={[s.input, error && { borderColor: colors.danger }]}
                />
              </>
            )}
            {error ? (
              <Text accessibilityRole="alert" style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.danger }}>
                {error}
              </Text>
            ) : null}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: 18, gap: 10 }}>
          {sentTo ? (
            <>
              <Button height={60} size={17} style={[{ borderRadius: 20 }, (busy || code.length < 6) && { opacity: 0.6 }]} onPress={() => verify()}>
                {busy ? 'Checking…' : 'Sign in'}
              </Button>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSentTo(null);
                  setCode('');
                  setError(null);
                }}
                style={{ alignSelf: 'center', paddingVertical: 10 }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest, textDecorationLine: 'underline' }}>Use another number</Text>
              </Pressable>
            </>
          ) : (
            <Button height={60} size={17} style={[{ borderRadius: 20 }, (busy || !phone.trim()) && { opacity: 0.6 }]} onPress={send}>
              {busy ? 'Sending…' : 'Text me a code'}
            </Button>
          )}
          <Text style={{ textAlign: 'center', fontFamily: fonts.regular, fontSize: 11, color: colors.chevron }}>{versionLabel()}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 20 },
  brand: { fontFamily: fonts.displayItalic, fontSize: 20, color: colors.forest },
  brandTag: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.76, color: colors.muted },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  input: {
    height: 60,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.forest,
  },
  code: { height: 72, fontFamily: fonts.display, fontSize: 34, letterSpacing: 10, textAlign: 'center' },
});
