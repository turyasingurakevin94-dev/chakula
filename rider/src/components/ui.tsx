import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { colors, fonts, smallCaps } from '../lib/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

export function Icon({ name, size = 20, color = colors.forest }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}

// Fraunces headline, 500 weight as on the canvas, with an optional italic word inside.
export function Headline({ children, size = 34, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: fonts.displayMedium, fontSize: size, lineHeight: Math.round(size * 1.08), color: colors.forest }, style]}>{children}</Text>;
}

export function Italic({ children }: { children: ReactNode }) {
  return <Text style={{ fontFamily: fonts.displayItalic }}>{children}</Text>;
}

// Fraunces 600 numerals and titles.
export function Num({ children, size = 18, style, color = colors.forest }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle>; color?: string }) {
  return <Text style={[{ fontFamily: fonts.display, fontSize: size, lineHeight: Math.round(size * 1.12), color }, style]}>{children}</Text>;
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[smallCaps, style]}>{children}</Text>;
}

export function Body({ children, style, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink }, style]}>
      {children}
    </Text>
  );
}

export function Bold({ children, size = 15, color = colors.forest, style }: { children: ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: fonts.bold, fontSize: size, color }, style]}>{children}</Text>;
}

// White card with the canvas's soft forest shadow.
export function Card({ children, style, raised }: { children: ReactNode; style?: StyleProp<ViewStyle>; raised?: boolean }) {
  return <View style={[s.card, raised && s.raised, style]}>{children}</View>;
}

// The round 44 px back button from the canvas.
export function BackButton({ label = 'Back', onPress }: { label?: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={4} onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} style={s.round}>
      <Icon name="chevron-left" size={20} />
    </Pressable>
  );
}

export function RoundButton({ icon, label, onPress, active }: { icon: IconName; label: string; onPress?: () => void; active?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} hitSlop={4} onPress={onPress} style={[s.round, active && { backgroundColor: colors.sand }]}>
      <Icon name={icon} size={20} />
    </Pressable>
  );
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  icon,
  style,
  height = 56,
  size = 15,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  height?: number;
  size?: number;
}) {
  const bg = variant === 'primary' ? colors.forest : variant === 'danger' ? colors.danger : colors.card;
  const fg = variant === 'primary' ? colors.cream : variant === 'danger' ? '#FFFFFF' : colors.forest;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        { height, backgroundColor: bg, borderWidth: variant === 'secondary' ? 1 : 0, borderColor: colors.line, opacity: pressed ? 0.88 : 1 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={variant === 'secondary' ? 18 : 20} color={fg} /> : null}
      <Text style={{ fontFamily: fonts.bold, fontSize: size, color: fg }}>{children}</Text>
    </Pressable>
  );
}

// The ticket tear line: a dashed rule with two half-circle notches cut into the card's edges.
export function TearLine({ notch = colors.cream }: { notch?: string }) {
  return (
    <View style={{ height: 22, justifyContent: 'center' }}>
      <Svg height={2} width="100%" style={{ marginHorizontal: 18 }}>
        <Line x1={0} y1={1} x2="100%" y2={1} stroke={colors.line} strokeWidth={2} strokeDasharray="6 4" />
      </Svg>
      <View style={[s.notch, { left: -12, backgroundColor: notch }]} />
      <View style={[s.notch, { right: -12, backgroundColor: notch }]} />
    </View>
  );
}

// A thin rule between list rows.
export function Rule() {
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}

export const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18 },
  raised: {
    shadowColor: colors.forest,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  button: { borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  notch: { position: 'absolute', top: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.line },
});
