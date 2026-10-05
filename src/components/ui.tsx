import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, radius, shadow } from '../lib/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

export function Icon({ name, size = 20, color = colors.forest }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}

export function Display({ children, size = 32, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.12, color: colors.forest }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'light',
  style,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  variant?: 'light' | 'dark' | 'outline';
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'dark' ? colors.forest : colors.cream;
  const fg = variant === 'dark' ? colors.cream : colors.forest;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: bg, opacity: pressed ? 0.8 : 1 },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.line },
        style,
      ]}
    >
      <Icon name={icon} size={20} color={fg} />
    </Pressable>
  );
}

// Stand-in for food photography until vendors upload real photos.
export function FoodImage({ tint, size = 44, style }: { tint: string; size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(184,68,26,0.45)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 12h18a9 9 0 0 1-18 0z" />
        <Path d="M8 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4" />
      </Svg>
    </View>
  );
}

export function PrimaryButton({
  children,
  onPress,
  label,
  floating,
}: {
  children: ReactNode;
  onPress?: () => void;
  label?: string;
  floating?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, floating && shadow, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
    >
      {children}
    </Pressable>
  );
}

export function Stepper({ quantity, onAdd, onRemove, name }: { quantity: number; onAdd: () => void; onRemove: () => void; name: string }) {
  if (quantity === 0) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${name}`} onPress={onAdd} style={styles.addButton}>
        <Icon name="plus" size={18} color={colors.cream} />
      </Pressable>
    );
  }
  return (
    <View style={[styles.addButton, { width: 'auto', flexDirection: 'row', paddingHorizontal: 2 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove one ${name}`} onPress={onRemove} style={styles.stepperHit}>
        <Icon name="minus" size={16} color={colors.cream} />
      </Pressable>
      <Text style={{ color: colors.cream, fontFamily: fonts.bold, fontSize: 14 }}>{quantity}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Add one ${name}`} onPress={onAdd} style={styles.stepperHit}>
        <Icon name="plus" size={16} color={colors.cream} />
      </Pressable>
    </View>
  );
}

export const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  primaryText: { color: colors.cream, fontFamily: fonts.bold, fontSize: 17 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
  addButton: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.cream,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperHit: { width: 30, height: 34, alignItems: 'center', justifyContent: 'center' },
});
