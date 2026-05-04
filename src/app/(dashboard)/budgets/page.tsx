import { redirect } from 'next/navigation';

// /budgets has been folded into the /money section as the Plan tab.
export default function BudgetsRedirect() {
  redirect('/money/plan');
}
