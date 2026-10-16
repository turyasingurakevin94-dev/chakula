import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton, Headline, Icon } from '../components/ui';
import { chatOpen, loadChat, sendChat, useChat } from '../lib/chat';
import { clockTime, useRider } from '../lib/rider';
import { colors, fonts } from '../lib/theme';

// While the rider has the bag, the chat is open; afterwards it can still be read.
const OPEN = ['cooking', 'ready', 'picked_up', 'at_gate'];
const QUICK = ['I’m on my way', 'I’m at the gate', 'Please come down', 'I can’t find you'];

// Chat with the student whose bag this is (opened from the route or handover screen with ?id=).
export default function Chat() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { run } = useRider();
  const stop = run?.stops.find((x) => x.id === id);
  const { messages } = useChat(id);
  const canSend = !!stop && OPEN.includes(stop.status ?? '');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    if (!id) return;
    chatOpen(id);
    loadChat(id).catch(() => setError('Couldn’t load the messages. Check your data.'));
    return () => chatOpen(null);
  }, [id]);

  const send = async (body: string) => {
    const trimmed = body.trim();
    if (!id || !trimmed || sending) return;
    setError(null);
    setSending(true);
    try {
      await sendChat(id, trimmed);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not sent. Try again.');
    } finally {
      setSending(false);
    }
  };

  const name = stop?.first ?? 'Student';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={s.header}>
        <BackButton label="Back" />
        <Headline size={28} style={{ flex: 1 }}>
          {name}
        </Headline>
      </View>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={{ padding: 20, gap: 8, flexGrow: 1 }}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.note}>{canSend ? `Messages go to ${name} while you have their bag.` : 'This chat has closed.'}</Text>
          {messages.map((m) => {
            const mine = m.from === 'rider';
            return (
              <View key={m.id} style={[s.bubble, mine ? s.mine : s.theirs]}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 16, lineHeight: 21, color: mine ? colors.cream : colors.ink }}>{m.body}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: mine ? colors.mint : colors.muted, alignSelf: 'flex-end' }}>{clockTime(new Date(m.at))}</Text>
              </View>
            );
          })}
        </ScrollView>

        {canSend ? (
          <View style={s.bar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
              {QUICK.map((q) => (
                <Pressable key={q} accessibilityRole="button" onPress={() => void send(q)} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{q}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {error ? <Text style={[s.note, { color: colors.orangeText, paddingHorizontal: 16 }]}>{error}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, alignItems: 'flex-end' }}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={`Message ${name}`}
                placeholderTextColor={colors.sub}
                multiline
                maxLength={500}
                style={s.input}
                accessibilityLabel={`Message ${name}`}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                disabled={!text.trim() || sending}
                onPress={() => void send(text)}
                style={({ pressed }) => [s.send, (!text.trim() || sending) && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
              >
                <Icon name="send" size={20} color={colors.cream} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted, textAlign: 'center', paddingBottom: 8 },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.forest, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 6 },
  bar: { paddingTop: 10, paddingBottom: 10, gap: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.cream },
  chip: { height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, justifyContent: 'center' },
  input: { flex: 1, minHeight: 50, maxHeight: 120, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 13, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  send: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
});
