export function sanitizeDbError(error: { message: string }, label: string): string {
  console.error(`[DB Error - ${label}]:`, error.message);
  if (/duplicate|unique/i.test(error.message)) return 'A record with these details already exists.';
  if (/foreign.key|violates|constraint/i.test(error.message)) return 'Operation failed: data constraint violation.';
  return 'Operation failed. Please try again.';
}
