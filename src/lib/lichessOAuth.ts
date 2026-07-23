// Lichess OAuth 2.0 PKCE implementation using @bity/oauth2-auth-code-pkce
import { OAuth2AuthCodePKCE } from '@bity/oauth2-auth-code-pkce';

export const lichessHost = 'https://lichess.org';
export const scopes = ['email:read'];
export const clientId = import.meta.env.VITE_LICHESS_CLIENT_ID || 'fca-chess-platform';

export function getLichessRedirectUri(): string {
  return `${window.location.origin}/auth/lichess/callback`;
}

export const lichessOAuthClient = new OAuth2AuthCodePKCE({
  authorizationUrl: `${lichessHost}/oauth`,
  tokenUrl: `${lichessHost}/api/token`,
  clientId: clientId,
  scopes: scopes,
  redirectUrl: getLichessRedirectUri(),
  onAccessTokenExpiry: (refreshAccessToken) => refreshAccessToken(),
  onInvalidGrant: () => {},
});

/**
 * Initiate Lichess OAuth 2.0 PKCE Authorization flow
 */
export async function initiateLichessOAuth(returnPath: string = '/profile'): Promise<void> {
  sessionStorage.setItem('fca_lichess_oauth_return', returnPath);
  await lichessOAuthClient.fetchAuthorizationCode();
}

export interface LichessOAuthResult {
  username: string;
  lichessId: string;
  email?: string;
  returnPath: string;
}

/**
 * Handle authorization code callback from Lichess OAuth redirect
 */
export async function handleLichessOAuthCallback(
  code?: string,
  _state?: string
): Promise<LichessOAuthResult> {
  const returnPath = sessionStorage.getItem('fca_lichess_oauth_return') || '/profile';

  let hasAuthCode = false;
  try {
    hasAuthCode = await lichessOAuthClient.isReturningFromAuthServer();
  } catch (_e) {
    hasAuthCode = false;
  }

  if (!hasAuthCode && !code) {
    throw new Error('Not returning from Lichess authentication server or authorization was denied.');
  }

  const accessContext = await lichessOAuthClient.getAccessToken();
  const token = accessContext.token?.value;

  if (!token) {
    throw new Error('Failed to retrieve access token from Lichess.');
  }

  // Use decorated fetch client from @bity/oauth2-auth-code-pkce
  const fetchClient = lichessOAuthClient.decorateFetchHTTPClient(window.fetch);
  const accountRes = await fetchClient(`${lichessHost}/api/account`);

  if (!accountRes.ok) {
    throw new Error(`Failed to fetch Lichess account profile: ${accountRes.statusText}`);
  }

  const accountData = await accountRes.json();
  if (!accountData.username) {
    throw new Error('Lichess account does not contain a valid username.');
  }

  sessionStorage.removeItem('fca_lichess_oauth_return');

  return {
    username: accountData.username,
    lichessId: accountData.id || accountData.username.toLowerCase(),
    returnPath: returnPath,
  };
}

/**
 * Logout / Revoke token helper
 */
export async function revokeLichessOAuthToken(accessToken?: string): Promise<void> {
  if (!accessToken) return;
  try {
    await fetch(`${lichessHost}/api/token`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (e) {
    console.warn('Failed to revoke Lichess OAuth token:', e);
  }
}
