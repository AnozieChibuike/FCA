// Chess.com ownership check: the server issues a code, the member puts it in their Chess.com
// "Location" field, and the server confirms it (so handles can't be claimed from the browser).
import { invokeFca } from './api';

export function chesscomProfileUrl(username: string) {
  return `https://www.chess.com/member/${encodeURIComponent(username)}`;
}

export const CHESSCOM_SETTINGS_URL = 'https://www.chess.com/settings/profile';

export function startChesscomVerification(username: string) {
  return invokeFca<{ code: string; username: string; avatar: string | null }>('chesscom_start', { username });
}

export function confirmChesscomVerification() {
  return invokeFca<{ username: string }>('chesscom_verify');
}
