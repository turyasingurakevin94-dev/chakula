import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Order } from '../lib/kitchen';
import { colors, fonts } from '../lib/theme';
import { Chip, DishPhoto } from './ui';

// "1× Chicken pilau  + Avocado", one row per dish, as on the Orders board.
export function Lines({ order }: { order: Order }) {
  return (
    <View style={{ gap: 6 }}>
      {order.items.map((i) => (
        <View key={i.name} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <DishPhoto name={i.name} size={36} radius={10} style={{ marginRight: 4 }} />
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
