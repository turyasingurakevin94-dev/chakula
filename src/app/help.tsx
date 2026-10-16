import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader, FoodImage, Icon, Label, styles as ui } from '../components/ui';
import { formatClock, formatWhen, useAccount } from '../lib/account';
import { findRestaurant, supportPhones, supportWhatsApp } from '../lib/data';
import { colors, fonts, formatUGX } from '../lib/theme';

const problems = ['Something missing', 'Arrived cold', 'Wrong order', 'Payment'];

export default function Help() {
  const account = useAccount();
  const last = account.orders[0];
  const kitchen = last ? findRestaurant(last.restaurantId) : undefined;
  const [problem, setProblem] = useState<string | null>(null);
  const [notLive, setNotLive] = useState(false);

  const openChat = (text: string) => {
    if (!supportWhatsApp) {
      setNotLive(true);
      return;
    }
    Linking.openURL(`https://wa.me/${supportWhatsApp}?text=${encodeURIComponent(text)}`).catch(() => setNotLive(true));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <BackHeader title="Help" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <View style={s.chat}>
            <View style={s.blob} />
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: fonts.displayLight, fontSize: 23, lineHeight: 26, color: colors.cream }}>Chat with a real person</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.mint }}>WhatsApp us, or call if it’s urgent.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Open WhatsApp" onPress={() => openChat('Hi Chakula, I need help.')} style={({ pressed }) => [s.whatsapp, pressed && { opacity: 0.9 }]}>
              <Icon name="message-circle" size={20} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>Open WhatsApp</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {supportPhones.map((phone) => (
                <Pressable
                  key={phone}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${phone}`}
                  onPress={() => Linking.openURL(`tel:${phone}`).catch(() => undefined)}
                  style={({ pressed }) => [s.call, pressed && { opacity: 0.8 }]}
                >
                  <Icon name="phone" size={16} color={colors.cream} />
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.cream }}>{phone}</Text>
                </Pressable>
              ))}
            </View>
            {notLive ? <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.mint }}>Couldn’t open WhatsApp on this phone. Call one of the numbers above.</Text> : null}
          </View>
        </View>

        {last && kitchen ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 8 }}>
            <Label>Problem with your last order?</Label>
            <View style={[ui.card, { padding: 14, gap: 14, borderRadius: 20 }]}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <FoodImage tint={last.lines[0]?.item.tint ?? kitchen.tint} photo={last.lines[0]?.item.photo ?? kitchen.photo} size={22} style={{ width: 52, height: 52, borderRadius: 12 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{kitchen.name}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>
                    {formatWhen(last.placedAt)}, {formatClock(last.placedAt, true)} · {formatUGX(last.total)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {problems.map((p) => {
                  const on = p === problem;
                  return (
                    <Pressable
                      key={p}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => {
                        setProblem(p);
                        openChat(`Order #${last.id} from ${kitchen.name}: ${p}`);
                      }}
                      style={[s.chip, on && { backgroundColor: colors.forest, borderColor: colors.forest }]}
                    >
                      <Text style={{ fontFamily: on ? fonts.bold : fonts.medium, fontSize: 14, color: on ? colors.cream : colors.ink }}>{p}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  chat: { backgroundColor: colors.forest, borderRadius: 22, padding: 20, gap: 14, overflow: 'hidden' },
  blob: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: colors.forestMid, right: -40, top: -50 },
  whatsapp: { height: 52, borderRadius: 16, backgroundColor: colors.cream, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  call: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  chip: { height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, justifyContent: 'center' },
});
