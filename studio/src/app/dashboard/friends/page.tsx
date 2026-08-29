import { redirect } from 'next/navigation';

/**
 * Friends live under Social now. Kept as a redirect so links that already
 * point here — and anyone's bookmark — still land in the right place, without
 * a second copy of the feature existing.
 */
export default function FriendsRedirect() {
  redirect('/dashboard/social');
}
