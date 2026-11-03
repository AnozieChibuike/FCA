import { invokeFca } from './api';
import { clearPendingLichess, readPendingLichess } from './lichessOAuth';

const REF_KEY = 'fca_ref';

/** Remember a referral code from ?ref= so it survives browsing around before signing up. */
export function rememberReferral(code: string | null) {
  if (!code) return;
  try { localStorage.setItem(REF_KEY, code.trim().toUpperCase()); } catch { /* private mode */ }
}

export function storedReferral(): string | null {
  try { return localStorage.getItem(REF_KEY); } catch { return null; }
}

export function clearReferral() {
  try { localStorage.removeItem(REF_KEY); } catch { /* private mode */ }
}

const LINK_RESULT_KEY = 'fca_lichess_link_result';

export interface LinkResult { username: string; missingGames: number }

export async function linkLichessToken(token: string): Promise<LinkResult> {
  const result = await invokeFca<LinkResult>('link_lichess', { token });
  try { sessionStorage.setItem(LINK_RESULT_KEY, JSON.stringify(result)); } catch { /* ignore */ }
  return result;
}

/** If someone verified Lichess before having an account, finish linking now that they're signed in. */
export async function linkPendingLichess(): Promise<LinkResult | null> {
  const pending = readPendingLichess();
  if (!pending) return null;
  try {
    return await linkLichessToken(pending.token);
  } finally {
    clearPendingLichess();
  }
}

export function lastLinkResult(): LinkResult | null {
  try {
    const raw = sessionStorage.getItem(LINK_RESULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
