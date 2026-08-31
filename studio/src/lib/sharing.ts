/**
 * Who owns a piece of coaching material, and who is allowed to see it.
 *
 * Programmes, resources and reports were all readable by every signed-in
 * user: one rule, `allow read: if request.auth != null`, on each collection.
 * That made the team centre a single shared pile — one coach's training
 * programme showed up for every other coach and every athlete in the app,
 * regardless of sport.
 *
 * Three fields fix that, and the Firestore rules enforce the same logic this
 * file describes so the client cannot be the only thing standing in the way.
 */

export type Visibility = 'private' | 'audience' | 'public';

/** The sport a piece of material belongs to, or 'all' when it is general. */
export type SharedSport = 'all' | 'football' | 'tennis' | 'gym' | 'basketball' | 'boxing' | 'swimming';

export interface SharedFields {
  /** The coach who created it. Always allowed to see and edit it. */
  ownerId: string;
  sport: SharedSport;
  visibility: Visibility;
  /**
   * Explicit uids, used when visibility is 'audience'.
   *
   * A fixed list rather than a live "everyone I am friends with": a share
   * should not silently widen because the coach accepted a friend request
   * afterwards. The picker offers "all my player friends" as a one-click way
   * to fill this in, which keeps the convenience without the surprise.
   */
  audience: string[];
}

export const DEFAULT_SHARING: Omit<SharedFields, 'ownerId'> = {
  sport: 'all',
  visibility: 'private',
  audience: [],
};

/**
 * Can this person see it?
 *
 * Mirrors the Firestore rule exactly. Kept in step deliberately: the client
 * uses this to decide what to render, the rules use their copy to decide what
 * to serve, and if they disagree the user gets an empty box with no reason.
 */
export function canView(
  item: Partial<SharedFields> | undefined,
  viewerUid: string | undefined,
  viewerRole?: string | null
): boolean {
  if (!item || !viewerUid) return false;
  if (viewerRole === 'admin') return true;
  if (item.ownerId === viewerUid) return true;
  if (item.visibility === 'public') return true;
  if (item.visibility === 'audience') return (item.audience ?? []).includes(viewerUid);
  // Anything without the fields at all predates sharing; treat it as the
  // owner's private material rather than exposing it to everyone.
  if (item.visibility === undefined && item.ownerId === undefined) return false;
  return false;
}

/** Only the owner (or an admin) may change or delete it. */
export function canEdit(
  item: Partial<SharedFields> | undefined,
  viewerUid: string | undefined,
  viewerRole?: string | null
): boolean {
  if (!item || !viewerUid) return false;
  if (viewerRole === 'admin') return true;
  return item.ownerId === viewerUid;
}

/** Does this material belong on the page for `sport`? */
export function matchesSport(item: Partial<SharedFields> | undefined, sport: string): boolean {
  const itemSport = item?.sport ?? 'all';
  return itemSport === 'all' || sport === 'all' || itemSport === sport;
}
