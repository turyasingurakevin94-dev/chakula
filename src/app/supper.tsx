import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChooseMeal, mainMeal } from '../components/plans';
import { BackHeader } from '../components/ui';
import { useAccount } from '../lib/account';
import { findPlanKind } from '../lib/plans';
import { colors } from '../lib/theme';

// Supper mode: pick tonight's plan meal within the plan's budget, or pay the difference for a treat.
export default function Supper() {
  const account = useAccount();
  const kind = account.plan ? findPlanKind(account.plan.kindId) : undefined;
  if (!kind) return <Redirect href="/plans" />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <BackHeader title={`Choose your ${mainMeal(kind)}`} />
      <ChooseMeal />
    </SafeAreaView>
  );
}
