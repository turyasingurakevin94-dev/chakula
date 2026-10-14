import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors, fonts, radius, shadow, smallCaps } from '../lib/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

export function Icon({ name, size = 20, color = colors.forest }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}

export function Display({ children, size = 32, style, numberOfLines }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: fonts.display, fontSize: size, lineHeight: Math.round(size * 1.12), color: colors.forest }, style]}>
      {children}
    </Text>
  );
}

// The one italic word in a headline. Nest it inside <Display>.
export function Italic({ children }: { children: ReactNode }) {
  return <Text style={{ fontFamily: fonts.displayItalic }}>{children}</Text>;
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'light',
  size = 44,
  style,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  variant?: 'light' | 'dark' | 'outline' | 'glass';
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'dark' ? colors.forest : variant === 'outline' ? colors.card : variant === 'glass' ? 'rgba(255,248,240,0.92)' : colors.cream;
  const fg = variant === 'dark' ? colors.cream : colors.forest;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, opacity: pressed ? 0.8 : 1 },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.line },
        style,
      ]}
    >
      <Icon name={icon} size={20} color={fg} />
    </Pressable>
  );
}

// Back button and screen title, as on the Checkout, Profile and Wallet boards.
export function BackHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.backHeader}>
      <IconButton icon="chevron-left" label="Back" variant="outline" onPress={onBack ?? (() => router.back())} />
      <Display size={26} style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Display>
      {right}
    </View>
  );
}

// Stand-in for food photography until vendors upload real photos.
export function FoodImage({ tint, size = 44, style, children }: { tint: string; size?: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <View style={[{ backgroundColor: tint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(184,68,26,0.45)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 12h18a9 9 0 0 1-18 0z" />
        <Path d="M8 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4" />
      </Svg>
      {children}
    </View>
  );
}

// Darkens the bottom of a food picture so cream text on it stays readable.
export function Scrim({ from = 0.35, color = colors.forestDeep, opacity = 0.88, id = 'scrim' }: { from?: number; color?: string; opacity?: number; id?: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={from} stopColor={color} stopOpacity={0} />
            <Stop offset={1} stopColor={color} stopOpacity={opacity} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="10" height="10" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function PrimaryButton({
  children,
  onPress,
  label,
  floating,
  disabled,
}: {
  children: ReactNode;
  onPress?: () => void;
  label?: string;
  floating?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, floating && !disabled && shadow, { opacity: disabled ? 0.5 : pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
    >
      {typeof children === 'string' ? <Text style={[styles.primaryText, { flex: 1, textAlign: 'center' }]}>{children}</Text> : children}
    </Pressable>
  );
}

// The round + on a dish picture, which becomes a − 1 + pill once the dish is in the basket.
export function Stepper({ quantity, onAdd, onRemove, name }: { quantity: number; onAdd: () => void; onRemove: () => void; name: string }) {
  if (quantity === 0) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${name}`} hitSlop={6} onPress={onAdd} style={[styles.addButton, styles.addRound]}>
        <Icon name="plus" size={18} color={colors.cream} />
      </Pressable>
    );
  }
  return (
    <View style={[styles.addButton, styles.addPill]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove one ${name}`} onPress={onRemove} style={styles.stepperHit}>
        <Icon name="minus" size={16} color={colors.cream} />
      </Pressable>
      <Text style={{ color: colors.cream, fontFamily: fonts.bold, fontSize: 15 }}>{quantity}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Add one ${name}`} onPress={onAdd} style={styles.stepperHit}>
        <Icon name="plus" size={16} color={colors.cream} />
      </Pressable>
    </View>
  );
}

const STAR = 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z';

export function StarIcon({ filled, size = 24 }: { filled: boolean; size?: number }) {
  const c = filled ? colors.orange : colors.border;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR} fill={c} stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

// A row of stars. With onPick each star is a button.
export function Stars({ value, size = 13, gap = 1, onPick }: { value: number; size?: number; gap?: number; onPick?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap }} accessibilityLabel={onPick ? undefined : `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onPick ? (
          <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} ${n === 1 ? 'star' : 'stars'}`} accessibilityState={{ selected: n <= value }} hitSlop={4} onPress={() => onPick(n)}>
            <StarIcon filled={n <= value} size={size} />
          </Pressable>
        ) : (
          <StarIcon key={n} filled={n <= value} size={size} />
        ),
      )}
    </View>
  );
}

// "View basket" bar that floats over a screen.
export function BasketBar({ count, total, onPress }: { count: number; total: string; onPress: () => void }) {
  return (
    <PrimaryButton floating label={`View basket, ${count} items, ${total}`} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <View style={styles.count}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.cream }}>{count}</Text>
        </View>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.cream, flex: 1 }}>View basket</Text>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.cream }}>{total}</Text>
      </View>
    </PrimaryButton>
  );
}

export const styles = StyleSheet.create({
  label: smallCaps,
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backHeader: { paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: {
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  primaryText: { color: colors.cream, fontFamily: fonts.semibold, fontSize: 16, letterSpacing: 0.3 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md + 2,
  },
  addButton: {
    position: 'absolute',
    right: -6,
    bottom: -8,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.forest,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addRound: { width: 36 },
  addPill: { flexDirection: 'row', paddingHorizontal: 4, gap: 6 },
  stepperHit: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  count: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
});
