import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader, Label, PrimaryButton, styles as ui } from '../components/ui';
import { PlacePicker } from '../components/placePicker';
import { useAccount, type Place } from '../lib/account';
import { colors, fonts } from '../lib/theme';

// Profile › My place: the name, drop point, room and rider note from setup, changeable any time.
export default function MyPlace() {
  const account = useAccount();
  const { width } = useWindowDimensions();
  const [name, setName] = useState(account.name);
  const [place, setPlace] = useState<Place | null>(account.place);
  const [room, setRoom] = useState(account.room);
  const [note, setNote] = useState(account.note);
  const ok = name.trim().length > 1 && !!place;

  const save = () => {
    if (!ok || !place) return;
    account.saveProfile(name, place, room, note);
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <BackHeader title="My place" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
          <View style={s.section}>
            <Label>Your name</Label>
            <TextInput value={name} onChangeText={setName} placeholder="First and last name" placeholderTextColor="#B5AA9A" autoComplete="name" textContentType="name" autoCapitalize="words" style={[ui.card, s.input, { fontFamily: fonts.semibold }]} />
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}>
          <PrimaryButton floating={ok} disabled={!ok} label="Save" onPress={save}>
            Save
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
