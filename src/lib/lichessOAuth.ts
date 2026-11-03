// Lichess OAuth 2.0 PKCE. The browser only obtains a token; the fca-api edge function verifies it
// with Lichess and links the account, so nobody can claim a handle they don't own.
import { OAuth2AuthCodePKCE } from '@bity/oauth2-auth-code-pkce';

export const lichessHost = 'https://lichess.org';
export const scopes = ['email:read'];
export const clientId = import.meta.env.VITE_LICHESS_CLIENT_ID || 'fca-chess-platform';

const RETURN_KEY = 'fca_lichess_oauth_return';
const PENDING_TOKEN_KEY = 'fca_pending_lichess_token';

export function getLichessRedirectUri(): string {
  return `${window.location.origin}/auth/lichess/callback`;
}

export const lichessOAuthClient = new OAuth2AuthCodePKCE({
  authorizationUrl: `${lichessHost}/oauth`,
  tokenUrl: `${lichessHost}/api/token`,
  clientId,
  scopes,
  redirectUrl: getLichessRedirectUri(),
  onAccessTokenExpiry: (refreshAccessToken) => refreshAccessToken(),
  onInvalidGrant: () => {},
});

export async function initiateLichessOAuth(returnPath: string = '/profile'): Promise<void> {
  sessionStorage.setItem(RETURN_KEY, returnPath);
  await lichessOAuthClient.fetchAuthorizationCode();
}

export interface LichessOAuthResult {
  token: string;
  username: string;
  returnPath: string;
}

/** Exchange the code from the redirect for a token and read the username (for display only). */
export async function handleLichessOAuthCallback(): Promise<LichessOAuthResult> {
  const returnPath = sessionStorage.getItem(RETURN_KEY) || '/profile';

  let returning = false;
  try {
    returning = await lichessOAuthClient.isReturningFromAuthServer();
  } catch {
    returning = false;
  }
  if (!returning) throw new Error('Lichess sign-in was cancelled or the link expired. Please try again.');

  const access = await lichessOAuthClient.getAccessToken();
  const token = access.token?.value;
  if (!token) throw new Error('Lichess did not return a login token.');

  const res = await fetch(`${lichessHost}/api/account`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Could not read your Lichess account. Please try again.');
  const account = await res.json();
  sessionStorage.removeItem(RETURN_KEY);
  return { token, username: account.username, returnPath };
}

/** Holds a verified-but-unlinked token while someone without an account signs up. */
export function stashPendingLichess(token: string, username: string) {
  sessionStorage.setItem(PENDING_TOKEN_KEY, JSON.stringify({ token, username }));
}

export function readPendingLichess(): { token: string; username: string } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingLichess() {
  sessionStorage.removeItem(PENDING_TOKEN_KEY);
}
