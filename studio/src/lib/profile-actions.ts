'use server';

import { admin, adminDb } from '@/lib/firebase-admin';
import { isAdminEmail } from '@/lib/admin-emails';

/**
 * Make sure a signed-in account has a `users/{uid}` profile document.
 *
 * Only two paths ever created one: the checkout signup flow and admin-created
 * users. Any account made another way — the owner's own account among them —
 * authenticated fine but had no document, which broke everything that reads the
 * `users` collection rather than Firebase Auth:
 *
 *   - the account was invisible in admin user management, because that list is
 *     a live query over `users`;
 *   - `updateDoc` on the streak (and every other profile write) failed, since
 *     it requires the document to already exist;
 *   - the security rules' `getUserRole()` had no role to read, so rules that
 *     checked the stored role denied the owner outright.
 *
 * This runs on the server so role and plan come from the trusted admin list
 * rather than from whatever the client claims. It is create-only for existing
 * profiles: an established document is never overwritten, so nothing an admin
 * has set by hand can be clobbered by a page load.
 */
export async function ensureUserProfile(uid: string): Promise<{ created: boolean }> {
  if (!uid) return { created: false };

  // The uid must belong to a real account; getUser throws otherwise.
  const authUser = await admin.auth().getUser(uid);
  const owner = isAdminEmail(authUser.email);

  const ref = adminDb.collection('users').doc(uid);
  const snap = await ref.get();

  if (snap.exists) {
    // Repair only what the trusted list decides, and only when it disagrees
    // with what is stored — an owner demoted to 'player' by an old document
    // would otherwise stay locked out of their own admin panel.
    if (owner) {
      const data = snap.data() ?? {};
      const fixes: Record<string, unknown> = {};
      if (data.role !== 'admin') fixes.role = 'admin';
      if (data.plan !== 'pro') fixes.plan = 'pro';
      if (!data.email && authUser.email) fixes.email = authUser.email;
      if (Object.keys(fixes).length > 0) await ref.update(fixes);
    }
    return { created: false };
  }

  await ref.set({
    uid,
    email: authUser.email ?? null,
    displayName: authUser.displayName || authUser.email?.split('@')[0] || 'Athlete',
    photoUrl: authUser.photoURL ?? null,
    role: owner ? 'admin' : 'player',
    plan: owner ? 'pro' : 'athlete',
    onboardingComplete: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    // Recorded so it is obvious this profile was backfilled rather than
    // captured during signup, which says nothing about the account's age.
    profileBackfilled: true,
  });

  return { created: true };
}
