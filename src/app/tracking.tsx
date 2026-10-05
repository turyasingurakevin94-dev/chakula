import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Display, IconButton } from '../components/ui';
import { useCart } from '../lib/cart';
import { findRestaurant, student } from '../lib/data';
import { colors, fonts } from '../lib/theme';

const steps = ['Confirmed', 'Cooked', 'On the way', 'At your door'];

export default function Tracking() {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const restaurant = findRestaurant(cart.restaurantId ?? '') ?? findRestaurant('nakawa-kitchen')!;
  // Prototype only: the order moves forward on a timer. The rider app will drive this for real.
  const [step, setStep] = useState(2);
  const [minutes, setMinutes] = useState(8);

  useEffect(() => {
    const t = setInterval(() => setMinutes((m) => Math.max(0, m - 1)), 4000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (minutes === 0) setStep(3);
  }, [minutes]);

  const arrived = step === 3;

  return (
    <View style={{ flex: 1, backgroundColor: colors.map }}>
      <MapSketch />
      <View style={[s.mapLabel, { top: insets.top + 18 }]}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.cream }}>Block B</Text>
      </View>
      <IconButton
        icon="chevron-left"
        label="Back to home"
        onPress={() => {
          cart.clear();
          router.replace('/');
        }}
        style={{ position: 'absolute', left: 16, top: insets.top + 12 }}
      />

      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={s.handle} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ gap: 2 }}>
            <Text style={s.meta14}>{arrived ? 'Your rider is here' : 'Arriving in'}</Text>
            <Display size={44} style={{ lineHeight: 48 }}>{arrived ? 'Outside' : `${minutes} min`}</Display>
          </View>
          <Text style={[s.meta14, { textAlign: 'right' }]}>
            Order #2048{'\n'}
            {restaurant.name}
          </Text>
        </View>

        <View accessibilityRole="progressbar" accessibilityLabel={`Order status: ${steps[step]}`}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {steps.map((label, i) => (
              <View key={label} style={[s.bar, { backgroundColor: i < step ? colors.forest : i === step ? colors.orange : colors.track }]} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            {steps.map((label, i) => (
              <Text key={label} style={{ flex: 1, fontSize: 12, fontFamily: i === step ? fonts.bold : fonts.regular, color: i === step ? colors.forest : colors.muted }}>
                {label}
              </Text>
            ))}
          </View>
        </View>

        <View style={s.rider}>
          <View style={s.riderAvatar}>
            <Text style={{ fontFamily: fonts.bold, color: colors.forest }}>BK</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>Brian</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>Chakula rider · ★ 4.9</Text>
          </View>
          <IconButton icon="message-square" label="Message rider" variant="outline" />
          <IconButton icon="phone" label="Call rider" variant="dark" />
        </View>

        <View style={{ gap: 10 }}>
          <View style={s.stop}>
            <View style={[s.dot, { backgroundColor: colors.muted }]} />
            <Text style={s.meta14}>Picked up from {restaurant.name}</Text>
          </View>
          <View style={s.stop}>
            <View style={[s.dot, { backgroundColor: colors.forest }]} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.forest }}>
              {student.hostel} · {student.deliveryNote}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// Placeholder map. A real map (Google Maps via react-native-maps) replaces this once rider GPS exists.
function MapSketch() {
  return (
    <Svg width="100%" height={540} viewBox="0 0 390 540" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      <Rect width="390" height="540" fill={colors.map} />
      <Path d="M-10 120 L400 90" stroke="#FFFFFF" strokeWidth={18} />
      <Path d="M-10 300 L400 330" stroke="#FFFFFF" strokeWidth={22} />
      <Path d="M120 -10 L155 550" stroke="#FFFFFF" strokeWidth={16} />
      <Path d="M290 -10 L265 550" stroke="#FFFFFF" strokeWidth={14} />
      <Rect x="170" y="140" width="80" height="120" rx="10" fill={colors.sage} />
      <Rect x="20" y="150" width="80" height="120" rx="10" fill="#EADCC8" />
      <Rect x="300" y="130" width="80" height="80" rx="10" fill="#EADCC8" />
      <Path d="M70 360 C 140 320, 150 220, 205 200 S 300 120, 320 70" fill="none" stroke={colors.forest} strokeWidth={4} strokeDasharray="2 9" strokeLinecap="round" />
      <Circle cx="320" cy="70" r="11" fill={colors.forest} />
      <Circle cx="320" cy="70" r="4" fill={colors.cream} />
      <Circle cx="205" cy="200" r="26" fill={colors.orange} fillOpacity={0.2} />
      <Circle cx="205" cy="200" r="15" fill={colors.orange} />
      <Circle cx="70" cy="360" r="9" fill={colors.muted} />
    </Svg>
  );
}

const s = StyleSheet.create({
  mapLabel: { position: 'absolute', right: 40, backgroundColor: colors.forest, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 18,
    shadowColor: colors.forest,
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#E2D4C1' },
  meta14: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  bar: { flex: 1, height: 6, borderRadius: 3 },
  rider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  riderAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
