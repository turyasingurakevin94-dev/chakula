import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader, Icon } from '../components/ui';
import { formatClock, useAccount } from '../lib/account';
import { chatOpen, loadChat, sendChat, sendSampleChat, useChat } from '../lib/chat';
import { riderFor } from '../lib/stages';
import { colors, fonts } from '../lib/theme';

// While the rider has these, the chat is open; afterwards it can still be read.
const OPEN = ['cooking', 'ready', 'picked_up', 'at_gate'];
const QUICK = ['Where are you?', 'I’m coming down', 'Please wait 2 minutes', 'Call me when you arrive'];

// Chat with the rider bringing the latest order, from the tracking screen.
export default function Chat() {
  const account = useAccount();
  const order = account.activeOrder ?? account.orders[0];
  const live = !!order?.serverId;
  const key = order ? (order.serverId ?? order.id) : undefined;
  const { messages } = useChat(key);
  const rider = order ? riderFor(order) : null;
  const canSend = !!order && (live ? !!order.riderName && OPEN.includes(order.status ?? '') : !order.delivered);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    if (!key) return;
    chatOpen(key);
    if (live) loadChat(key).catch(() => setError('Couldn’t load the messages. Check your data.'));
    return () => chatOpen(null);
  }, [key, live]);

  const send = async (body: string) => {
    const trimmed = body.trim();
    if (!key || !trimmed || sending) return;
    setError(null);
    if (!live) {
      sendSampleChat(key, trimmed);
      setText('');
      return;
    }
    setSending(true);
    try {
      await sendChat(key, trimmed);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not sent. Try again.');
    } finally {
      setSending(false);
    }
  };

  const name = (live ? order?.riderName : rider?.name) ?? 'Your rider';
  const note = !order
    ? 'No order to chat about.'
    : canSend
      ? `Messages go to ${name} while they have your order.`
      : live && !order.riderName
        ? 'You can chat once a rider takes your order.'
        : 'This chat closed when your order was delivered.';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <BackHeader title={name} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={{ padding: 20, gap: 8, flexGrow: 1 }}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.note}>{note}</Text>
          {messages.map((m) => {
            const mine = m.from === 'student';
            return (
              <View key={m.id} style={[s.bubble, mine ? s.mine : s.theirs]}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: mine ? colors.cream : colors.ink }}>{m.body}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: mine ? colors.mint : colors.muted, alignSelf: 'flex-end' }}>{formatClock(new Date(m.at).getTime())}</Text>
              </View>
            );
          })}
        </ScrollView>

        {canSend ? (
          <View style={s.bar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
              {QUICK.map((q) => (
                <Pressable key={q} accessibilityRole="button" onPress={() => void send(q)} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.ink }}>{q}</Text>
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
                <Icon name="send" size={18} color={colors.cream} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  note: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted, textAlign: 'center', paddingBottom: 8 },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, gap: 2 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.forest, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 6 },
  bar: { paddingTop: 10, paddingBottom: 10, gap: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.cream },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, justifyContent: 'center' },
  input: { flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
});
