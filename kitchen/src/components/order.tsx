import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { minutesUntil, type Order } from '../lib/kitchen';
import { colors, fonts } from '../lib/theme';
import { Chip } from './ui';

// "1× Chicken pilau  + Avocado", one row per dish, as on the Orders board.
export function Lines({ order }: { order: Order }) {
  return (
    <View style={{ gap: 4 }}>
      {order.items.map((i) => (
        <View key={i.name} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.ink }}>
            {i.qty}× {i.name}
          </Text>
          {(i.extras ?? []).map((e) => (
            <Chip key={e}>{e}</Chip>
          ))}
        </View>
      ))}
    </View>
  );
}

// "Note  Not too much cabbage, please." in a sand box.
export function Note({ text }: { text: string }) {
  return (
    <View style={{ backgroundColor: colors.noteBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.segmentText }}>
        <Text style={{ fontFamily: fonts.bold, color: colors.forest }}>Note</Text> {text}
      </Text>
    </View>
  );
}

export function Bike({ size = 18, color = colors.forest }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={6} cy={17} r={3} />
      <Circle cx={18} cy={17} r={3} />
      <Path d="M6 17l4-7h5l3 7M10 10l-2-3H6" />
    </Svg>
  );
}

// Time left before an order is due, counting down: "3 min left", or "2 min late" once it passes.
export function Countdown({ order, now, size = 24 }: { order: Order; now: number; size?: number }) {
  const left = minutesUntil(order.dueAt, now);
  const late = left < 0;
  const urgent = late || left <= 4;
  return (
    <View accessibilityLabel={late ? `${-left} minutes late` : `${left} minutes left`} style={{ alignItems: 'flex-end', gap: 2 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: size, lineHeight: size + 2, color: urgent ? colors.orangeText : colors.forest }}>
        {Math.abs(left)}
        <Text style={{ fontSize: Math.round(size * 0.58) }}> min</Text>
      </Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.66, textTransform: 'uppercase', color: late ? colors.orangeText : colors.muted }}>{late ? 'Late' : 'Left'}</Text>
    </View>
  );
}

// Drains from full when the order comes in to empty when it is due.
export function TimeBar({ order, now, first }: { order: Order; now: number; first?: boolean }) {
  const total = Math.max(order.dueAt - order.inAt, 1);
  const share = Math.min(Math.max((order.dueAt - now) / total, 0), 1);
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.segment, overflow: 'hidden' }}>
      <View style={{ height: 6, borderRadius: 3, width: `${share * 100}%`, backgroundColor: first || share < 0.3 ? colors.orange : colors.forest }} />
    </View>
  );
}
