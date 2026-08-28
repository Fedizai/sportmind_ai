/**
 * Accounts that always hold full platform access.
 *
 * Shared between the client (`use-user`) and the server-side Pro gates so both
 * sides agree on who counts as an admin — previously the client granted admins
 * a `pro` plan in memory while the server only trusted the Firestore document,
 * so an admin saw Pro features but got "Access denied" when using them.
 */
export const ADMIN_EMAILS = [
  'fedizayen12@gmail.com',
  'khaled05062006@gmail.com',
  'khaled050620062@gmail.com',
];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}
