import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKitchen } from '../lib/kitchen';
import { sendCode, ServerError, verifyCode } from '../lib/server';
import { colors, fonts } from '../lib/theme';
import { Body, Button, Display, Icon, Italic, Label } from './ui';

// Signing the counter in to the Chakula server: the kitchen's number, then the 6 digit code from
// the text. Only shown when the app runs on the server (see lib/server.ts).
export function SignIn() {
  const { signIn } = useKitchen();
  const [phone, setPhone] = useState('');
  // The number the code went to, as the server wrote it back.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (step: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await step();
    } catch (e) {
      setError(e instanceof ServerError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      if (!phone.trim()) throw new ServerError(400, 'Type the kitchen’s phone number.');
      const res = await sendCode(phone, 'kitchen');
      setSentTo(res.phone);
      // Dev servers send the code back instead of texting it.
      setCode(res.devCode ?? '');
    });

  const verify = () =>
    run(async () => {
      if (!sentTo) return;
      if (!/^\d{6}$/.test(code.trim())) throw new ServerError(400, 'The code is 6 digits.');
      const res = await verifyCode(sentTo, code.trim(), 'kitchen');
      signIn(res.user);
    });

  const back = () => {
    setSentTo(null);
    setCode('');
    setError(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ gap: 8 }}>
            <Label>Chakula Kitchen</Label>
            {sentTo ? (
              <Display size={34}>
                Type the <Italic>code</Italic>
              </Display>
            ) : (
              <Display size={34}>
                Sign in to your <Italic>counter</Italic>
              </Display>
            )}
            <Body style={{ color: colors.muted }}>
              {sentTo ? `We texted a 6 digit code to ${sentTo}.` : 'Use the phone number Chakula set up for your kitchen. We’ll text you a code.'}
            </Body>
          </View>

          <View style={{ gap: 10 }}>
            <Label>{sentTo ? 'Code' : 'Kitchen phone'}</Label>
            {sentTo ? (
              <TextInput
                key="code"
                accessibilityLabel="6 digit code"
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                onSubmitEditing={verify}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
                placeholder="000000"
                placeholderTextColor={colors.chevron}
                style={[s.input, s.code]}
              />
            ) : (
              <TextInput
                key="phone"
                accessibilityLabel="Kitchen phone number"
                value={phone}
                onChangeText={setPhone}
                onSubmitEditing={send}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                autoFocus
                placeholder="0700 000 000"
                placeholderTextColor={colors.chevron}
                style={s.input}
              />
            )}
            {error ? (
              <View style={s.error} accessibilityLiveRegion="polite">
                <Icon name="alert-circle" size={16} color={colors.orangeText} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ gap: 6 }}>
            {sentTo ? (
              <>
                <Button onPress={verify} label="Sign in">
                  {busy ? 'Checking…' : 'Sign in'}
                </Button>
                <Pressable accessibilityRole="button" onPress={back} style={s.link}>
                  <Text style={s.linkText}>Use another number</Text>
                </Pressable>
              </>
            ) : (
              <Button onPress={send} label="Send code">
                {busy ? 'Sending…' : 'Send code'}
              </Button>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 48, paddingBottom: 24, gap: 28, maxWidth: 480, width: '100%', alignSelf: 'center' },
  input: { height: 56, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 16, fontFamily: fonts.semibold, fontSize: 18, color: colors.forest },
  code: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: 8 },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.highlight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  errorText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.orangeText },
  link: { height: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.forest, textDecorationLine: 'underline' },
});
