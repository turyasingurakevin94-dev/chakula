import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, Icon, IconButton, PrimaryButton, styles as ui } from '../components/ui';
import { useAccount } from '../lib/account';
import { colors, fonts, formatPhone } from '../lib/theme';

const LENGTH = 6;

export default function Verify() {
  const account = useAccount();
  const input = useRef<TextInput>(null);
  // In dev the server hands the code back, so it fills itself in.
  const [code, setCode] = useState(account.devCode ?? '');
  const [failed, setFailed] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [wait, setWait] = useState(30);

  useEffect(() => {
    if (wait === 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const complete = code.length === LENGTH;
  // The server checks the code; the prototype accepts any 6 digits.
  const submit = async (entered = code) => {
    if (entered.length !== LENGTH || checking) return;
    setChecking(true);
    const error = await account.verify(entered);
    setChecking(false);
    if (error) {
      setFailed(error);
      setCode('');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <IconButton icon="chevron-left" label="Back" variant="outline" style={{ backgroundColor: colors.card }} onPress={() => router.back()} />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 8 }}>
        <Display size={30}>Enter the code</Display>
        <Text style={s.body}>
          Sent by SMS to <Text style={{ fontFamily: fonts.bold, color: colors.ink }}>+256 {formatPhone(account.phone ?? '')}</Text>.{' '}
          <Text accessibilityRole="link" onPress={() => router.back()} style={s.link}>
            Change
          </Text>
        </Text>
      </View>

      <Pressable accessibilityLabel={`Code, ${code.length} of ${LENGTH} digits entered`} onPress={() => input.current?.focus()} style={s.boxes}>
        {Array.from({ length: LENGTH }, (_, i) => {
          const active = i === Math.min(code.length, LENGTH - 1) && !complete;
          return (
            <View key={i} style={[s.box, active && { borderWidth: 2, borderColor: colors.forest }]}>
              <Text style={s.digit}>{code[i] ?? ''}</Text>
            </View>
          );
        })}
        <TextInput
          ref={input}
          value={code}
          onChangeText={(t) => {
            const next = t.replace(/\D/g, '').slice(0, LENGTH);
            setFailed(null);
            setCode(next);
            // Move on as soon as the last digit is in, like most SMS sign-ins.
            if (next.length === LENGTH && code.length < LENGTH) void submit(next);
          }}
          onSubmitEditing={() => void submit()}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus
          maxLength={LENGTH}
          caretHidden
          style={s.hiddenInput}
        />
      </Pressable>

      {failed ? <Text style={[s.body14, { color: colors.orangeText, paddingHorizontal: 20, paddingTop: 14 }]}>{failed}</Text> : null}

      <View style={s.resend}>
        <Icon name="clock" size={16} color={colors.muted} />
        {wait > 0 ? (
          <Text style={s.body14}>
            Resend code in <Text style={{ fontFamily: fonts.bold, color: colors.forest }}>0:{String(wait).padStart(2, '0')}</Text>
          </Text>
        ) : (
          <Text
            accessibilityRole="button"
            onPress={() => {
              setWait(30);
              if (account.phone) account.startSignIn(account.phone).catch((e) => setFailed(e instanceof Error ? e.message : null));
            }}
            style={[s.body14, s.link]}
          >
            Resend code
          </Text>
        )}
      </View>

      <View style={s.notice}>
        <View style={s.noticeIcon}>
          <Icon name="lock" size={18} color={colors.cream} />
        </View>
        <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.forest }}>
          Chakula will never ask for your mobile money PIN. Only type it on your phone’s own prompt.
        </Text>
      </View>

      <View style={s.footer}>
        <View style={{ opacity: complete ? 1 : 0.45 }}>
          <PrimaryButton floating={complete} label="Verify and continue" onPress={() => void submit()}>
            <Text style={[ui.primaryText, { flex: 1, textAlign: 'center' }]}>Verify and continue</Text>
          </PrimaryButton>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.muted },
  body14: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  link: { fontFamily: fonts.semibold, color: colors.forest, textDecorationLine: 'underline' },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 28 },
  box: {
    width: 50,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontFamily: fonts.display, fontSize: 26, color: colors.forest },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  resend: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 20 },
  notice: { marginHorizontal: 20, marginTop: 32, padding: 16, borderRadius: 18, backgroundColor: colors.sage, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  noticeIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 24 },
});
