import { Text, View } from 'react-native';
import type { Order } from '../lib/kitchen';
import { colors, fonts } from '../lib/theme';
import { Chip } from './ui';

// "2× Special rolex  + Extra egg  No pepper", one row per dish.
export function Lines({ order }: { order: Order }) {
  return (
    <View style={{ gap: 6 }}>
      {order.items.map((i) => (
        <View key={i.name} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>
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
