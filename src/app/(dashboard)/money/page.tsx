import { redirect } from 'next/navigation';

// Bare /money has no page; it always lands on the Plan tab.
export default function MoneyIndexRedirect() {
  redirect('/money/plan');
}
