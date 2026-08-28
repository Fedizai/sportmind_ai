import { admin, adminDb } from '@/lib/firebase-admin';
import { isAdminEmail } from '@/lib/admin-emails';

/**
 * Server-side Pro gate shared by every paid AI flow.
 *
 * Access is granted when the account is on the Pro plan, carries the admin
 * role, or signs in with one of the hard-coded owner addresses.
 *
 * The owner-address check reads the email from **Firebase Auth**, not from the
 * Firestore profile: a signed-in account does not always have a `users/`
 * document (one may never have been written, or it may have been deleted), and
 * an earlier version of this gate read `data?.email` off that missing document
 * — so real admins were refused every Pro feature while the un-gated flows kept
 * working, which is exactly how the bug presented.
 */
export async function assertProAccess(userId: string, featureLabel = 'This feature'): Promise<void> {
  if (!userId) {
    throw new Error(`Access denied: ${featureLabel} requires a signed-in account.`);
  }

  const snap = await adminDb.collection('users').doc(userId).get();
  const data = snap.exists ? snap.data() : undefined;

  if (data?.plan === 'pro' || data?.role === 'admin') return;

  // Fall back to the authoritative auth record, which exists for every
  // signed-in user regardless of whether a profile document was created.
  try {
    const authUser = await admin.auth().getUser(userId);
    if (isAdminEmail(authUser.email)) return;
  } catch (err) {
    console.warn(`Pro gate: could not read the auth record for ${userId}`, err);
  }

  throw new Error(`Access denied: ${featureLabel} is only available for Pro plan users.`);
}
