import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors, fonts, smallCaps } from '../lib/theme';

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

export function Italic({ children }: { children: ReactNode }) {
  return <Text style={{ fontFamily: fonts.displayItalic }}>{children}</Text>;
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

export function Card({ children, style, highlight }: { children: ReactNode; style?: StyleProp<ViewStyle>; highlight?: boolean }) {
  return <View style={[s.card, highlight && s.cardHighlight, style]}>{children}</View>;
}

export function BackHeader({ title, kicker, right }: { title: string; kicker?: string; right?: ReactNode }) {
  return (
    <View style={s.backHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={4} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.round}>
        <Icon name="chevron-left" size={22} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        {kicker ? <Label>{kicker}</Label> : null}
        <Display size={24} numberOfLines={1}>
          {title}
        </Display>
      </View>
      {right}
    </View>
  );
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  label,
  icon,
  style,
  height = 52,
}: {
  children: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  label?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  height?: number;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        { height, backgroundColor: primary ? colors.forest : colors.card, borderWidth: primary ? 0 : 1, borderColor: colors.line, opacity: pressed ? 0.88 : 1 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={primary ? colors.cream : colors.forest} /> : null}
      <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: primary ? colors.cream : colors.forest }}>{children}</Text>
    </Pressable>
  );
}

// A row with a title, a line of help and a switch, as on the Printer and POS screen.
export function ToggleRow({ title, sub, value, onChange, last }: { title: string; sub?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <View style={[s.toggleRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.lineSoft }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{title}</Text>
        {sub ? <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted }}>{sub}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.forest }}
        thumbColor={colors.card}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

// Grey-then-white segmented control.
export function Segments<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.segments} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.key)} style={[s.segment, on && s.segmentOn]}>
            <Text style={{ fontFamily: on ? fonts.bold : fonts.semibold, fontSize: 14, color: on ? colors.forest : colors.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Extras and requests on an order line, e.g. "+ Extra egg" or "No pepper".
export function Chip({ children }: { children: string }) {
  const no = children.startsWith('No ');
  return (
    <View style={[s.chip, no ? { backgroundColor: colors.tile } : { backgroundColor: colors.peach }]}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: no ? colors.ink : '#8A3412' }}>{no ? children : `+ ${children}`}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 14 },
  cardHighlight: { borderWidth: 2, borderColor: colors.orange, padding: 13 },
  backHeader: { paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  button: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  segments: { flexDirection: 'row', backgroundColor: colors.tile, borderRadius: 16, padding: 4, gap: 4 },
  segment: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.card, shadowColor: colors.forest, shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
});
