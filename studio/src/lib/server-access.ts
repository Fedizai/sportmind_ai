import { adminDb } from '@/lib/firebase-admin';
import { isAdminEmail } from '@/lib/admin-emails';

/**
 * Server-side Pro gate shared by every paid AI flow.
 *
 * Access is granted when the account is on the Pro plan, carries the admin
 * role, or uses one of the hard-coded admin addresses. Keeping all three checks
 * in one place stops the client and server from disagreeing about who is Pro.
 *
 * @throws when the caller is not entitled to the feature.
 */
export async function assertProAccess(userId: string, featureLabel = 'This feature'): Promise<void> {
  if (!userId) {
    throw new Error(`Access denied: ${featureLabel} requires a signed-in account.`);
  }

  const snap = await adminDb.collection('users').doc(userId).get();
  const data = snap.exists ? snap.data() : undefined;

  const entitled =
    data?.plan === 'pro' || data?.role === 'admin' || isAdminEmail(data?.email as string | undefined);

  if (!entitled) {
    throw new Error(`Access denied: ${featureLabel} is only available for Pro plan users.`);
  }
}
