/**
 * Friendships, and the pair id that ties them to conversations.
 *
 * A friendship between two people is one document, named after the pair with
 * their uids sorted. Messaging already builds its conversation id the same
 * way, so the two ids are identical for the same pair — which is what lets a
 * security rule on a conversation check the friendship directly, rather than
 * carrying a duplicate list of who may talk to whom.
 */

export type FriendshipStatus = 'pending' | 'accepted';

export interface Friendship {
  id: string;
  /** Both uids, sorted. Indexed for array-contains queries. */
  users: string[];
  /** Who asked. The other party is the only one who can accept. */
  requestedBy: string;
  status: FriendshipStatus;
}

/**
 * Deterministic id for a pair, in either argument order.
 *
 * Sorting is what makes the pair a single document: without it A→B and B→A
 * would be two friendships, and each could sit in a different state.
 */
export function pairId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

/** The other person in a two-person document. */
export function otherUid(users: string[], me: string): string | undefined {
  return users.find((u) => u !== me);
}
