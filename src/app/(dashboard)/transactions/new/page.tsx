import { redirect } from 'next/navigation';

export default function AddExpenseRedirect() {
  redirect('/money/track/new');
}
