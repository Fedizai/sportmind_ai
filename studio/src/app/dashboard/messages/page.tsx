import { redirect } from 'next/navigation';

/**
 * Messaging lives in the Social section's Messages tab. Kept as a redirect so
 * existing links and bookmarks still work without a second copy of the screen.
 */
export default function MessagesRedirect() {
  redirect('/dashboard/social');
}
