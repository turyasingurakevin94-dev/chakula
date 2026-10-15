import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, Icon, Label, PrimaryButton, styles as ui } from '../components/ui';
import { places, useAccount, type Place } from '../lib/account';
import { colors, fonts } from '../lib/theme';

export default function Setup() {
  const account = useAccount();
  const [name, setName] = useState(account.name);
  const [place, setPlace] = useState<Place | null>(account.place ?? places[0]!);
  const [room, setRoom] = useState(account.room);
  const [note, setNote] = useState(account.note);
  const ok = name.trim().length > 1 && !!place;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 6 }}>
            <Label>{account.alertsPrimed ? 'Step 2 of 2' : 'Step 2 of 3'}</Label>
            <Display size={30}>Where should we bring your food?</Display>
          </View>

          <View style={s.section}>
            <Label>Your name</Label>
            <TextInput value={name} onChangeText={setName} placeholder="First and last name" placeholderTextColor="#B5AA9A" autoComplete="name" textContentType="name" autoCapitalize="words" style={[ui.card, s.input, { fontFamily: fonts.semibold }]} />
          </View>

          <View style={s.section}>
            <Label>Hostel or campus spot</Label>
            <View style={[ui.card, { borderRadius: 18, overflow: 'hidden' }]}>
              {places.map((p) => {
                const on = place?.id === p.id;
                return (
                  <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setPlace(p)} style={[s.row, s.divider, on && { backgroundColor: '#FFF4EC' }]}>
                    <View style={[s.tile, { backgroundColor: on ? colors.forest : colors.lineSoft }]}>
                      <Icon name="home" size={18} color={on ? colors.cream : colors.forest} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.strong, !on && { fontFamily: fonts.semibold }]}>{p.name}</Text>
                      <Text style={s.meta}>{p.detail}</Text>
                    </View>
                    <View style={[s.radio, on && { borderColor: colors.forest }]}>{on ? <View style={s.radioDot} /> : null}</View>
                  </Pressable>
                );
              })}
              <View style={s.row}>
                <View style={[s.tile, { backgroundColor: colors.peach }]}>
                  <Icon name="plus" size={18} color={colors.orangeText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.strong, { fontFamily: fonts.semibold }]}>Somewhere else</Text>
                  <Text style={s.meta}>More spots arrive as we grow</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={s.section}>
            <Label>Room</Label>
            <TextInput value={room} onChangeText={setRoom} placeholder="e.g. Room 12" placeholderTextColor="#B5AA9A" style={[ui.card, s.input]} />
          </View>
          <View style={s.section}>
            <Label>Note for the rider</Label>
            <TextInput value={note} onChangeText={setNote} placeholder="e.g. Call me at the gate" placeholderTextColor="#B5AA9A" style={[ui.card, s.input]} />
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, opacity: ok ? 1 : 0.45 }}>
          <PrimaryButton floating={ok} label="Start ordering" onPress={() => ok && place && account.saveProfile(name, place, room, note)}>
            <Text style={[ui.primaryText, { flex: 1, textAlign: 'center' }]}>Start ordering</Text>
          </PrimaryButton>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingTop: 18, gap: 8 },
  input: { height: 54, paddingHorizontal: 16, borderRadius: 16, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  tile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  strong: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.forest },
});
