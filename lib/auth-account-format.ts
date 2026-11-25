export function authErrorKey(code: string | null) {
  if (!code) return null;
  if (code === 'google_denied') return 'googleDenied';
  if (code === 'account_blocked') return 'accountBlocked';
  if (code === 'google_failed') return 'googleFailed';
  return 'signInFailed';
}

export function withErrorDetail(message: string, detail?: string | null) {
  return detail && detail !== message ? `${message}\n${detail}` : message;
}
