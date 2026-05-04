import { redirect } from 'next/navigation';

export default function AddIncomeRedirect() {
  redirect('/money/track/new/income');
}
