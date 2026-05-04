import { redirect } from 'next/navigation';

// /transactions has been folded into the /money section as the Track tab.
export default function TransactionsRedirect() {
  redirect('/money/track');
}
