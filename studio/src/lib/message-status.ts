import type { Timestamp } from 'firebase/firestore';

/**
 * Whether a message you sent has arrived, and whether it has been read.
 *
 * One definition, used by both the open conversation and the conversation
 * list, so the tick beside someone's name in Social always says the same thing
 * as the tick under the last message inside the thread. Two copies of this
 * comparison would drift the moment either was touched.
 */

export type MessageStatus = 'sent' | 'delivered' | 'read';

/** The other participant's marks on the shared conversation document. */
export interface DeliveryMarks {
  deliveredAt?: Timestamp | null;
  readAt?: Timestamp | null;
}

/**
 * Compared against the message's own send time, so an older message stays
 * "read" even after a newer one arrives that they have not opened yet.
 *
 * `sentAtSeconds` is undefined while a just-sent message's serverTimestamp is
 * still resolving; that write is in flight, which is exactly "sent".
 */
export function messageStatus(
  sentAtSeconds: number | undefined | null,
  marks: DeliveryMarks | undefined
): MessageStatus {
  if (!sentAtSeconds) return 'sent';
  if (marks?.readAt && marks.readAt.seconds >= sentAtSeconds) return 'read';
  if (marks?.deliveredAt && marks.deliveredAt.seconds >= sentAtSeconds) return 'delivered';
  return 'sent';
}
