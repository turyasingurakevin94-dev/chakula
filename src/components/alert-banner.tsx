import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../lib/theme';
import { Icon, type IconName } from './ui';

export type BannerAlert = {
  // Changes for every alert, so the same text twice still slides in again.
  key: number;
  title: string;
  body: string;
  icon: IconName;
  href?: string;
};

// How long a banner stays before it slides away.
export const BANNER_MS = 4000;

const native = Platform.OS !== 'web';

// The quiet banner that stands in for a notification while the app is open, as on the S-Home board.
// `alert` is the latest one and stays set while it slides away; `visible` says whether it is showing.
export function AlertBanner({ alert, visible, onPress, onDone }: { alert: BannerAlert | null; visible: boolean; onPress: (a: BannerAlert) => void; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(-160));

  useEffect(() => {
    if (!visible) {
      Animated.timing(y, { toValue: -160 - insets.top, duration: 220, useNativeDriver: native }).start();
      return;
    }
    Animated.spring(y, { toValue: 0, useNativeDriver: native, speed: 16, bounciness: 4 }).start();
    const t = setTimeout(onDone, BANNER_MS);
    return () => clearTimeout(t);
  }, [alert?.key, visible, y, onDone, insets.top]);

  const a = alert;
  if (!a) return null;

  return (
    <Animated.View pointerEvents={visible ? 'box-none' : 'none'} style={[s.wrap, { top: insets.top + 8, transform: [{ translateY: y }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${a.title}. ${a.body}`}
        accessibilityHint={a.href ? 'Opens the screen' : undefined}
        onPress={() => onPress(a)}
        style={({ pressed }) => [s.card, { opacity: pressed ? 0.94 : 1 }]}
      >
        <View style={s.icon}>
          <Icon name={a.icon} size={18} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {a.title}
          </Text>
          <Text style={s.body} numberOfLines={2}>
            {a.body}
          </Text>
        </View>
        <Text style={s.now}>now</Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 100, elevation: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.forest,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 14, color: colors.forest },
  body: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted },
  now: { alignSelf: 'flex-start', fontFamily: fonts.regular, fontSize: 11, color: colors.sub },
});
