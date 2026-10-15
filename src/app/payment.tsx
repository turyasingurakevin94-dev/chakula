import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader, Icon, Label, PrimaryButton, styles as ui } from '../components/ui';
import { useAccount } from '../lib/account';
import { setPayDefault, usePayDefault, type DefaultMethod } from '../lib/payDefault';
import { colors, fonts, formatUGX } from '../lib/theme';

// Profile › Payment: the method checkout starts on, and the MoMo number to charge.
export default function Payment() {
  const account = useAccount();
  const saved = usePayDefault();
  const [method, setMethod] = useState<DefaultMethod>(saved.method);
  const [momoPhone, setMomoPhone] = useState(saved.momoPhone);
  const digits = momoPhone.replace(/\D/g, '');
  // Empty means the student's own number; otherwise a Ugandan mobile number.
  const phoneOk = digits.length === 0 || /^(0|256)?7\d{8}$/.test(digits);
  const momo = method === 'mtn' || method === 'airtel';

  const options: { id: DefaultMethod; name: string; detail: string; badge: string; bg: string; fg: string }[] = [
    { id: 'mtn', name: 'MTN Mobile Money', detail: 'Approve on your phone', badge: 'MTN', bg: '#FFCB05', fg: colors.forest },
    { id: 'airtel', name: 'Airtel Money', detail: 'Approve on your phone', badge: 'airtel', bg: '#E40000', fg: '#FFFFFF' },
    { id: 'wallet', name: 'Chakula Wallet', detail: `Balance ${formatUGX(account.balance)}`, badge: 'C', bg: colors.forest, fg: colors.cream },
    { id: 'cash', name: 'Cash on delivery', detail: 'Pay the rider at the gate', badge: '', bg: colors.tile, fg: colors.forest },
  ];

  const save = () => {
    if (!phoneOk) return;
    setPayDefault({ method, momoPhone: digits });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <BackHeader title="Payment" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.section}>
            <Label>How you usually pay</Label>
            <View style={[ui.card, { overflow: 'hidden' }]}>
              {options.map((o, i) => (
                <Pressable
                  key={o.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: method === o.id }}
                  accessibilityLabel={o.name}
                  onPress={() => setMethod(o.id)}
                  style={({ pressed }) => [s.row, i < options.length - 1 && s.divider, pressed && { backgroundColor: colors.highlight }]}
                >
                  <View style={[s.badge, { backgroundColor: o.bg }]}>
                    {o.id === 'cash' ? <Icon name="dollar-sign" size={16} /> : <Text style={{ fontFamily: o.id === 'wallet' ? fonts.displayItalic : fonts.bold, fontSize: o.id === 'wallet' ? 16 : 10, color: o.fg }}>{o.badge}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.strong}>{o.name}</Text>
                    <Text style={s.meta}>{o.detail}</Text>
                  </View>
                  <View style={[s.radio, method === o.id && { borderColor: colors.forest, borderWidth: 7 }]} />
                </Pressable>
              ))}
            </View>
            <Text style={s.meta}>Checkout starts on this. You can still change it for one order.</Text>
          </View>

          {momo ? (
            <View style={s.section}>
              <Label>Mobile money number</Label>
              <TextInput
                value={momoPhone}
                onChangeText={setMomoPhone}
                placeholder={account.maskedPhone ? `Your own, ${account.maskedPhone}` : 'Your own number'}
                placeholderTextColor="#B5AA9A"
                keyboardType="phone-pad"
                maxLength={16}
                style={[ui.card, s.input, !phoneOk && { borderColor: colors.orangeText }]}
              />
              <Text style={[s.meta, !phoneOk && { color: colors.orangeText }]}>{phoneOk ? 'Leave it empty to pay from your own number.' : 'That doesn’t look like a Ugandan mobile number.'}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}>
          <PrimaryButton floating={phoneOk} disabled={!phoneOk} label="Save" onPress={save}>
            Save
          </PrimaryButton>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingTop: 18, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  badge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border },
  strong: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  input: { height: 54, paddingHorizontal: 16, borderRadius: 16, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
});
