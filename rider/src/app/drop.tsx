import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton, Body, Button, Headline, Icon, Label, Num } from '../components/ui';
import { useRider } from '../lib/rider';
import { colors, fonts, money } from '../lib/theme';

// Hand over: collect any cash, then type the student's 4-digit code. The last digit completes the drop.
export default function Drop() {
  const { run, stop, stopIndex, completeStop, backToRoute, notify } = useRider();
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const input = useRef<TextInput>(null);
  const [shake] = useState(() => new Animated.Value(0));

  // Coming back from "isn't answering", the keyboard should be ready for the code again.
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => input.current?.focus(), 300);
      return () => clearTimeout(t);
    }, []),
  );

  if (!run || !stop) return <Redirect href="/" />;

  const last = stopIndex + 1 >= run.stops.length;

  const finish = () => {
    completeStop('delivered');
    if (last) router.dismissAll();
    else router.back();
  };

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    setWrong(false);
    setCode(digits);
    if (digits.length < 4) return;
    if (digits === stop.code) {
      finish();
      return;
    }
    setWrong(true);
    Animated.sequence(
      [10, -10, 8, -8, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 60, useNativeDriver: true })),
    ).start(() => setCode(''));
  };

  const back = () => {
    backToRoute();
    router.back();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <BackButton label="Back to route" onPress={back} />
          <Label style={{ flex: 1 }}>
            Stop {stopIndex + 1} of {run.stops.length} · arrived {stop.eta}
          </Label>
          <View style={s.offline}>
            <Icon name="wifi" size={14} color={colors.body} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.body }}>Works offline</Text>
          </View>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 6 }}>
            <Headline size={38}>{stop.student}</Headline>
            <Body style={{ fontSize: 16, lineHeight: 22, color: colors.body }}>
              {stop.place}
              {stop.floor ? ` · ${stop.floor}` : ''}
            </Body>
            {stop.note ? <Text style={s.note}>&ldquo;{stop.note}&rdquo;</Text> : null}
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', gap: 10 }}>
            <Button variant="secondary" icon="phone" height={48} style={{ flex: 1, borderRadius: 16, gap: 8 }} onPress={() => notify(`Calling ${stop.first} through Chakula`)}>
              Call
            </Button>
            <Button variant="secondary" icon="message-square" height={48} size={14} style={{ flex: 1, borderRadius: 16, paddingHorizontal: 8, gap: 8 }} onPress={() => notify(`Sent "I'm here" to ${stop.first}`)}>
              Send &quot;I&apos;m here&quot;
            </Button>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
            {stop.cash > 0 ? (
              <View style={s.cash}>
                <View style={{ gap: 2 }}>
                  <Label style={{ color: colors.orangeText }}>Collect cash first</Label>
                  <Num size={30}>UGX {money(stop.cash)}</Num>
                </View>
                <Text style={s.cashNote}>Exactly what{'\n'}the receipt says</Text>
              </View>
            ) : (
              <View style={s.cash}>
                <View style={{ gap: 2 }}>
                  <Label>Paid in the app</Label>
                  <Num size={24}>Nothing to collect</Num>
                </View>
                <Icon name="check-circle" size={26} color={colors.sealed} />
              </View>
            )}
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 12 }}>
            <Text nativeID="code-label" style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>
              {stop.first}&apos;s 4-digit code
            </Text>
            <Pressable accessible={false} onPress={() => input.current?.focus()}>
              <Animated.View style={[s.boxes, { transform: [{ translateX: shake }] }]}>
                {[0, 1, 2, 3].map((i) => {
                  const filled = i < code.length;
                  const current = i === code.length;
                  return (
                    <View
                      key={i}
                      style={[
                        s.box,
                        filled && { borderColor: wrong ? colors.danger : colors.forest },
                        current && { borderWidth: 2.5, borderColor: colors.orange },
                      ]}
                    >
                      <Text style={{ fontFamily: fonts.display, fontSize: 34, color: colors.forest }}>{code[i] ?? ''}</Text>
                    </View>
                  );
                })}
              </Animated.View>
            </Pressable>
            <TextInput
              ref={input}
              value={code}
              onChangeText={onChange}
              autoFocus
              keyboardType="number-pad"
              maxLength={4}
              accessibilityLabel={`${stop.first}'s 4-digit code`}
              caretHidden
              style={s.hidden}
            />
            <Body style={{ fontSize: 13, lineHeight: 19, color: wrong ? colors.danger : colors.muted }}>
              {wrong ? `That code doesn't match. Ask ${stop.first} to read it from the Chakula app.` : 'The last digit completes the drop. The code proves the food reached the right person.'}
            </Body>
          </View>
        </ScrollView>

        <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="shield" size={16} color={colors.sealed} />
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>
              Bag {stop.bag} · sealed {stop.sealedAt} · scanned {run.pickupAt}
            </Text>
          </View>
          <Pressable accessibilityRole="link" onPress={() => router.push('/help')}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest, textDecorationLine: 'underline' }}>{stop.first} isn&apos;t answering</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  offline: { height: 28, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { marginTop: 6, fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 22, color: colors.ink },
  cash: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: colors.forest,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cashNote: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'right' },
  boxes: { flexDirection: 'row', gap: 10 },
  box: { flex: 1, height: 72, borderRadius: 18, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
