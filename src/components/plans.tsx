import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { formatClock, useAccount, useNow, type MealPlan } from '../lib/account';
import {
  dayLabel,
  dishesFor,
  findPlanDish,
  findPlanKind,
  mealName,
  nextMeal,
  periods,
  planKinds,
  planMeals,
  planPrice,
  todaysMeal,
  topUpFor,
  type PlanDish,
  type PlanKind,
  type PlanKindId,
  type PlanMeal,
  type PlanPeriod,
} from '../lib/plans';
import { colors, fonts, formatUGX, smallCaps } from '../lib/theme';
import { Display, FoodImage, Icon, Label, PrimaryButton, Scrim, styles as ui } from './ui';

// The dish a student is offered first: one they rated five stars, else the first on the plan menu.
export function pickedFor(meal: PlanMeal, ratedFive: string[]) {
  const dishes = dishesFor(meal);
  return dishes.find((d) => ratedFive.includes(d.id)) ?? dishes[0]!;
}

export function useRatedFive() {
  const account = useAccount();
  return account.orders.filter((o) => o.rating?.stars === 5).flatMap((o) => o.lines.map((l) => l.item.id));
}

// The meal a plan lets the student choose and skip: the last of the day (supper, or breakfast on a breakfast plan).
export function mainMeal(kind: PlanKind): PlanMeal {
  return kind.meals[kind.meals.length - 1]!;
}

export function PlanPicker() {
  const account = useAccount();
  const [period, setPeriod] = useState<PlanPeriod>('monthly');
  const [kindId, setKindId] = useState<PlanKindId>('lunch-supper');
  const kind = findPlanKind(kindId)!;
  const per = periods.find((p) => p.id === period)!.per;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 4 }}>
          <Display>Meal plans</Display>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.muted }}>Pay once, eat every day. Delivery is free on plan meals.</Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View style={s.segment}>
            {periods.map((p) => {
              const on = p.id === period;
              return (
                <Pressable key={p.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setPeriod(p.id)} style={[s.segmentItem, on && s.segmentOn]}>
                  <Text style={{ fontSize: 14, fontFamily: on ? fonts.bold : fonts.medium, color: on ? colors.forest : colors.muted }}>{p.label}</Text>
                  {p.saving ? <Text style={{ fontSize: 11, fontFamily: fonts.semibold, color: colors.orangeText }}>{p.saving}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 12 }}>
          {planKinds.map((k) => {
            const on = k.id === kindId;
            return (
              <Pressable
                key={k.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${k.name}, ${formatUGX(planPrice(k, period))} ${per}`}
                onPress={() => setKindId(k.id)}
                style={[ui.card, s.plan, on && { borderWidth: 2, borderColor: colors.forest, backgroundColor: colors.highlight }]}
              >
                {k.id === 'lunch-supper' ? <Text style={s.mostPicked}>Most picked</Text> : null}
                <FoodImage tint={k.tint} size={30} style={{ width: 72, height: 72, borderRadius: 14 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.forest }}>{k.name}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>
                    {k.detail}
                    {` · ${planMeals(k, period)} meals`}
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>{formatUGX(planPrice(k, period))}</Text> {per}
                  </Text>
                </View>
                <View style={[s.radio, on && { borderColor: colors.forest, borderWidth: 7 }]} />
              </Pressable>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 6 }}>
          {['Pick your dish each day from any kitchen', 'Skip before cooking starts, it carries over'].map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon name="check" size={16} color={colors.green} />
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink }}>{t}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <PrimaryButton floating label={`Start plan, ${formatUGX(planPrice(kind, period))}`} onPress={() => account.startPlan(kindId, period)}>
          {`Start plan · ${formatUGX(planPrice(kind, period))}`}
        </PrimaryButton>
      </View>
    </SafeAreaView>
  );
}

// Ring that empties as the time to change or skip runs out.
function Countdown({ left, window }: { left: number; window: number }) {
  const r = 26;
  const length = 2 * Math.PI * r;
  const share = Math.max(0, Math.min(1, left / window));
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64">
      <Circle cx={32} cy={32} r={r} fill="none" stroke={colors.divider} strokeWidth={6} />
      <Circle cx={32} cy={32} r={r} fill="none" stroke={colors.forest} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${share * length} ${length}`} transform="rotate(-90 32 32)" />
      <SvgText x={32} y={h > 0 ? 30 : 37} textAnchor="middle" fontFamily={fonts.display} fontSize={15} fill={colors.forest}>
        {h > 0 ? `${h}h` : `${m}m`}
      </SvgText>
      {h > 0 ? (
        <SvgText x={32} y={44} textAnchor="middle" fontFamily={fonts.regular} fontSize={10} fill={colors.muted}>
          {`${m}m`}
        </SvgText>
      ) : null}
    </Svg>
  );
}

function TimelineRow({ title, detail, time, now: isNow }: { title: string; detail: string; time: string; now?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={[s.tlDot, isNow ? { backgroundColor: colors.forest, borderColor: colors.sage, borderWidth: 4, width: 20, height: 20, borderRadius: 10, marginHorizontal: -4, marginTop: -1 } : null]} />
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: isNow ? fonts.bold : fonts.medium, color: isNow ? colors.forest : colors.muted }}>{title}</Text>
          <Text style={{ fontSize: 12, fontFamily: fonts.regular, color: colors.sub }}>{detail}</Text>
        </View>
        <Text style={{ fontSize: 13, fontFamily: fonts.semibold, color: isNow ? colors.forest : colors.muted }}>{time}</Text>
      </View>
    </View>
  );
}

export function MyPlan({ plan }: { plan: MealPlan }) {
  const account = useAccount();
  const now = useNow();
  const ratedFive = useRatedFive();
  const kind = findPlanKind(plan.kindId)!;
  const meal = mainMeal(kind);
  const next = nextMeal(meal, now);
  const picked = pickedFor(meal, ratedFive);
  const choice = findPlanDish(plan.choices[next.day] ?? '') ?? picked;
  const skipped = plan.skipped.includes(next.day);
  const others = kind.meals.filter((m) => m !== meal);
  // Three to show: the current choice and the next two dishes the plan covers.
  const options = [choice, ...dishesFor(meal).filter((d) => d.id !== choice.id && topUpFor(d, kind) === 0)].slice(0, 3);
  const left = plan.meals - plan.used;
  const month = new Date(plan.startedAt).toLocaleDateString('en-GB', { month: 'long' });
  const periodLabel = plan.period === 'monthly' ? month : plan.period === 'weekly' ? 'This week' : 'This semester';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Display>My plan</Display>
          <Pressable accessibilityRole="button" accessibilityLabel={plan.paused ? 'Resume plan' : 'Pause plan'} onPress={account.togglePlanPause} style={({ pressed }) => [s.pause, plan.paused && { backgroundColor: colors.forest }, pressed && { opacity: 0.85 }]}>
            <Icon name={plan.paused ? 'play' : 'pause'} size={14} color={plan.paused ? colors.cream : colors.forest} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: plan.paused ? colors.cream : colors.forest }}>{plan.paused ? 'Resume' : 'Pause'}</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View style={s.summary}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.mint }}>
                  {kind.name} · {periodLabel}
                </Text>
                <Text style={{ fontFamily: fonts.displayLight, fontSize: 26, lineHeight: 30, color: colors.cream }}>
                  {left} meals left
                </Text>
              </View>
              {plan.carried > 0 ? <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.cream, paddingTop: 4 }}>{plan.carried} carried over</Text> : null}
            </View>
            <View style={s.progress}>
              <View style={{ width: `${Math.max(4, (plan.used / plan.meals) * 100)}%`, height: '100%', backgroundColor: colors.cream }} />
            </View>
          </View>
        </View>

        {plan.paused ? (
          <View style={[s.well, { marginHorizontal: 20, marginTop: 14 }]}>
            <Icon name="pause-circle" size={22} />
            <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.forest }}>
              <Text style={{ fontFamily: fonts.bold }}>Your plan is paused.</Text> Nothing is cooked until you resume, and your meals wait for you.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 10 }}>
            <Label>{dayLabel(next.closes, now)}</Label>

            {others.map((m) => (
              <OtherMeal key={m} meal={m} now={now} dish={pickedFor(m, ratedFive)} />
            ))}

            <View style={[ui.card, { padding: 14, gap: 12, borderRadius: 20 }]}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.orangeText }}>
                {mealName[meal]} · {formatClock(next.door, true)}
              </Text>

              {skipped ? (
                <View style={s.well}>
                  <Icon name="skip-forward" size={20} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>Skipped, saved for later</Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>This meal carries over. You can still change your mind until {formatClock(next.closes, true)}.</Text>
                  </View>
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {options.map((d) => {
                      const on = d.id === choice.id;
                      const extra = topUpFor(d, kind);
                      return (
                        <Pressable
                          key={d.id}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={`${d.name}, ${extra ? `${extra} top-up` : 'covered'}`}
                          onPress={() => account.chooseMeal(next.day, d.id)}
                          style={[s.option, on && { borderWidth: 2, borderColor: colors.forest, backgroundColor: colors.highlight }]}
                        >
                          <FoodImage tint={d.tint} size={30} style={{ height: 78 }} />
                          {on ? (
                            <View style={s.tick}>
                              <Icon name="check" size={12} color={colors.cream} />
                            </View>
                          ) : null}
                          <View style={{ padding: 8, gap: 1 }}>
                            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.forest }} numberOfLines={2}>
                              {d.name}
                            </Text>
                            <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: extra ? colors.muted : colors.green }}>{extra ? `+ ${extra.toLocaleString('en-US')} top-up` : 'Covered'}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={s.well}>
                    <Countdown left={next.closes - now} window={6 * 60 * 60 * 1000} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>Left to change or skip</Text>
                      <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted }}>
                        After {formatClock(next.closes, true)} the kitchen starts preparing your {meal}, so it can’t be skipped.
                      </Text>
                    </View>
                  </View>
                </>
              )}

              <View style={{ gap: 10, paddingHorizontal: 4, paddingTop: 2 }}>
                <View style={s.rail} />
                <TimelineRow now title="Choices close" detail="Change or skip until then" time={formatClock(next.closes, true)} />
                <TimelineRow title="Kitchen starts cooking" detail={skipped ? 'Skipped' : choice.kitchen} time={formatClock(next.cooks, true)} />
                <TimelineRow title="At your door" detail={account.address.replace(' Hostel', '')} time={formatClock(next.door, true)} />
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {skipped ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Undo skip" onPress={() => account.unskipMeal(next.day)} style={({ pressed }) => [s.skip, pressed && { opacity: 0.85 }]}>
                    <Icon name="rotate-ccw" size={14} />
                    <Text style={s.skipText}>Undo skip</Text>
                  </Pressable>
                ) : (
                  <Pressable accessibilityRole="button" accessibilityLabel="Skip, save for later" onPress={() => account.skipMeal(next.day)} style={({ pressed }) => [s.skip, pressed && { opacity: 0.85 }]}>
                    <Icon name="skip-forward" size={14} />
                    <Text style={s.skipText}>Skip, save for later</Text>
                  </Pressable>
                )}
                <Pressable accessibilityRole="button" accessibilityLabel="All options" onPress={() => router.push('/supper')} style={({ pressed }) => [s.all, pressed && { opacity: 0.85 }]}>
                  <Icon name="repeat" size={14} />
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.forest }}>All options</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Status of a plan meal that is not the one being chosen, e.g. today's lunch while supper is open.
function OtherMeal({ meal, now, dish }: { meal: PlanMeal; now: number; dish: PlanDish }) {
  const t = todaysMeal(meal, now);
  const status = now < t.cooks ? `${mealName[meal]} · ${formatClock(t.door, true)}` : now < t.door ? `${mealName[meal]} · on the way` : `${mealName[meal]} · delivered`;
  const detail = now < t.door ? `${dish.kitchen} · arrives ${formatClock(t.door, true)}` : `${dish.kitchen} · arrived ${formatClock(t.door, true)}`;
  return (
    <View style={[ui.card, { padding: 10, flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: 20 }]}>
      <FoodImage tint={dish.tint} size={26} style={{ width: 60, height: 60, borderRadius: 14 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.green }}>{status}</Text>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{dish.name}</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{detail}</Text>
      </View>
    </View>
  );
}

// Supper mode: the full list of dishes for the next plan meal.
export function ChooseMeal() {
  const account = useAccount();
  const now = useNow();
  const ratedFive = useRatedFive();
  const plan = account.plan;
  const kind = plan ? findPlanKind(plan.kindId) : undefined;
  if (!plan || !kind) return null;
  const meal = mainMeal(kind);
  const next = nextMeal(meal, now);
  const picked = pickedFor(meal, ratedFive);
  const chosen = plan.choices[next.day] ?? picked.id;
  const dishes = dishesFor(meal).filter((d) => d.id !== picked.id);
  const covered = dishes.filter((d) => topUpFor(d, kind) === 0);
  const treats = dishes.filter((d) => topUpFor(d, kind) > 0);
  const choose = (d: PlanDish) => {
    account.chooseMeal(next.day, d.id);
    router.back();
  };
  const pickedRated = ratedFive.includes(picked.id);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <View style={[s.pill, { backgroundColor: colors.forest, borderColor: colors.forest }]}>
            <Icon name="credit-card" size={14} color={colors.cream} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.cream }}>Plan covers {formatUGX(kind.perMeal)}</Text>
          </View>
          <View style={s.pill}>
            <Icon name="clock" size={14} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.forest }}>Choose by {formatClock(next.closes, true).replace(':00', '')}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View style={s.picked}>
            <FoodImage tint={picked.tint} size={44} style={[StyleSheet.absoluteFill, { paddingTop: 36, paddingBottom: 80 }]} />
            <Scrim id="picked-scrim" />
            <Text style={s.pickedPill}>Picked for you</Text>
            <View style={s.pickedFoot}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fonts.displayLight, fontSize: 24, lineHeight: 27, color: colors.cream }}>{picked.name}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.heroMeta }}>
                  {picked.kitchen}
                  {pickedRated ? ' · you rated it 5 stars' : ` · ${picked.minutes} min`}
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${picked.name}`} onPress={() => choose(picked)} style={s.chooseBtn}>
                {chosen === picked.id ? <Icon name="check" size={14} /> : null}
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.forest }}>{chosen === picked.id ? 'Chosen' : 'Choose'}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={s.listHead}>
          <Text style={smallCaps}>Within your plan · {covered.length + (topUpFor(picked, kind) === 0 ? 1 : 0)} dishes</Text>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push('/kitchens')}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.forest }}>All kitchens</Text>
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          {covered.map((d) => (
            <DishRow key={d.id} dish={d} extra={0} on={d.id === chosen} onPress={() => choose(d)} />
          ))}
        </View>

        {treats.length > 0 ? (
          <>
            <View style={[s.listHead, { paddingTop: 16 }]}>
              <Text style={smallCaps}>Treat yourself · pay the difference</Text>
            </View>
            <View style={{ paddingHorizontal: 20 }}>
              {treats.map((d) => (
                <DishRow key={d.id} dish={d} extra={topUpFor(d, kind)} on={d.id === chosen} onPress={() => choose(d)} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={s.skipFoot}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            account.skipMeal(next.day);
            router.back();
          }}
          style={{ padding: 12 }}
        >
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.forest, textDecorationLine: 'underline' }}>
            Skip {dayLabel(next.closes, now).startsWith('Today') ? 'tonight' : 'tomorrow'}, save it for later
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function DishRow({ dish, extra, on, onPress }: { dish: PlanDish; extra: number; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${dish.name} from ${dish.kitchen}, ${extra ? `${extra} more` : 'covered'}`} onPress={onPress} style={({ pressed }) => [s.dishRow, pressed && { opacity: 0.85 }]}>
      <View>
        <FoodImage tint={dish.tint} size={28} style={{ width: 64, height: 64, borderRadius: 14 }} />
        {on ? (
          <View style={[s.tick, { right: -4, top: -4 }]}>
            <Icon name="check" size={12} color={colors.cream} />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{dish.name}</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>
          {dish.kitchen} · {dish.minutes} min
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.sub }}>Menu price {formatUGX(dish.price)}</Text>
      </View>
      <Text style={[s.tag, extra ? { color: colors.forest, backgroundColor: colors.tile } : null]}>{extra ? `+ ${extra.toLocaleString('en-US')}` : 'Covered'}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: colors.lineSoft },
  segmentItem: { flex: 1, minHeight: 36, paddingVertical: 7, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.card, shadowColor: colors.forest, shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  plan: { borderRadius: 20, paddingVertical: 10, paddingLeft: 10, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  mostPicked: {
    position: 'absolute',
    right: 12,
    top: -10,
    zIndex: 1,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.66,
    textTransform: 'uppercase',
    color: colors.cream,
    backgroundColor: colors.forest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 24 },
  pause: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.forest, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  summary: { backgroundColor: colors.forest, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 16, gap: 10 },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.forestLine, overflow: 'hidden' },
  well: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14, backgroundColor: colors.well },
  option: { flex: 1, minWidth: 0, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  tick: { position: 'absolute', right: 6, top: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  rail: { position: 'absolute', left: 9.5, top: 10, bottom: 10, width: 1, backgroundColor: colors.border },
  tlDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3, backgroundColor: colors.cream, borderWidth: 2, borderColor: colors.chevron },
  skip: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  skipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.forest },
  all: { height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.lineSoft, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  picked: { height: 170, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.forest },
  pickedPill: { position: 'absolute', left: 14, top: 14, ...smallCaps, color: colors.cream, backgroundColor: 'rgba(15,42,31,0.55)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  pickedFoot: { position: 'absolute', left: 16, right: 16, bottom: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  chooseBtn: { height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.cream, flexDirection: 'row', alignItems: 'center', gap: 4 },
  listHead: { paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  tag: { fontFamily: fonts.bold, fontSize: 12, color: colors.green, backgroundColor: colors.sage, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  skipFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: 22, paddingTop: 8, alignItems: 'center', backgroundColor: colors.cream },
});
