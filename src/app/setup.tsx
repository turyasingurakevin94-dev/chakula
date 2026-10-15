import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Display, Label, PrimaryButton, styles as ui } from '../components/ui';
import { PlacePicker } from '../components/placePicker';
import { useAccount, type Place } from '../lib/account';
import { colors, fonts } from '../lib/theme';

export default function Setup() {
  const account = useAccount();
  const { width } = useWindowDimensions();
  const [name, setName] = useState(account.name);
  const [place, setPlace] = useState<Place | null>(account.place);
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
            <Label>Where we meet you</Label>
            <PlacePicker value={place} onChange={setPlace} width={width - 40} />
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
});
