import { MyPlan, PlanPicker } from '../../components/plans';
import { useAccount } from '../../lib/account';

// Meal plans: choose one, then the tab becomes "My plan".
export default function Plans() {
  const account = useAccount();
  return account.plan ? <MyPlan plan={account.plan} /> : <PlanPicker />;
}
