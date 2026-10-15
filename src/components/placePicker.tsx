import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fitView, findDropPoint, kitchenAt, minutesFor, route, type DropKind } from '../lib/campus';
import { places, type Place } from '../lib/account';
import { colors, fonts } from '../lib/theme';
import { CampusMap } from './map';
import { Icon } from './ui';

const kinds: { id: DropKind; label: string }[] = [
  { id: 'hostel', label: 'Hostels' },
  { id: 'gate', label: 'Gates' },
  { id: 'campus', label: 'On campus' },
];

// Riding minutes from our usual kitchen, on our own map's roads.
function minutesTo(id: string) {
  const p = findDropPoint(id);
  return p ? minutesFor(route(kitchenAt('nakawa-kitchen'), p.at).seconds) : null;
}

// Pick a drop point on the campus map or from the list. Riders only go to these pinned spots.
export function PlacePicker({ value, onChange, width }: { value: Place | null; onChange: (p: Place) => void; width: number }) {
  const [kind, setKind] = useState<DropKind>(value?.kind ?? 'hostel');
  const shown = places.filter((p) => p.kind === kind);
  const height = Math.round(width * 0.68);
  const view = useMemo(() => {
    const spots = shown.map((p) => findDropPoint(p.id)!.at);
    return fitView(spots, width, height, [44, 30, 18, 30], 1.6);
  }, [kind, width]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ gap: 12 }}>
      <View style={s.chips} accessibilityRole="tablist">
        {kinds.map((k) => {
          const on = k.id === kind;
          return (
            <Pressable key={k.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setKind(k.id)} style={[s.chip, on && { backgroundColor: colors.forest, borderColor: colors.forest }]}>
              <Text style={{ fontFamily: on ? fonts.bold : fonts.semibold, fontSize: 13, color: on ? colors.cream : colors.forest }}>{k.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <CampusMap
        width={width}
        height={height}
        view={view}
        style={{ borderRadius: 18 }}
        accessibilityLabel={`Map of ${kinds.find((k) => k.id === kind)!.label.toLowerCase()} we deliver to${value ? `, ${value.name} chosen` : ''}`}
        pins={shown.map((p, i) => ({ id: p.id, at: findDropPoint(p.id)!.at, label: String(i + 1), selected: p.id === value?.id }))}
        onPinPress={(id) => onChange(places.find((p) => p.id === id)!)}
      />

      <View style={s.list}>
        {shown.map((p, i) => {
          const on = value?.id === p.id;
          const min = minutesTo(p.id);
          return (
            <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${p.name}, ${p.detail}`} onPress={() => onChange(p)} style={[s.row, i < shown.length - 1 && s.divider, on && { backgroundColor: colors.highlight }]}>
              <View style={[s.num, { backgroundColor: on ? colors.forest : colors.lineSoft }]}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: on ? colors.cream : colors.forest }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, !on && { fontFamily: fonts.semibold }]}>{p.name}</Text>
                <Text style={s.meta}>{p.detail}</Text>
              </View>
              {min ? <Text style={s.min}>{min} min</Text> : null}
            </Pressable>
          );
        })}
        <View style={[s.row, s.top]}>
          <View style={[s.num, { backgroundColor: colors.peach }]}>
            <Icon name="plus" size={14} color={colors.orangeText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.name, { fontFamily: fonts.semibold }]}>My hostel isn’t here</Text>
            <Text style={s.meta}>Tell us in Help and we’ll pin it</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  top: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.forest },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  min: { fontFamily: fonts.semibold, fontSize: 13, color: colors.forest },
});
