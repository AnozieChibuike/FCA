// Chess.com Public API Verification Helper Library for FCA Chess Platform

export interface ChesscomPlayer {
  avatar?: string;
  player_id: number;
  id: string;
  url: string;
  name?: string;
  username: string;
  followers?: number;
  country?: string;
  location?: string;
  status?: string;
  joined?: number;
}

/**
 * Fetch player profile from public Chess.com API
 */
export async function fetchChesscomPlayer(username: string): Promise<ChesscomPlayer> {
  const cleanHandle = username.trim().toLowerCase();
  if (!cleanHandle) {
    throw new Error('Please enter a valid Chess.com username.');
  }

  const response = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(cleanHandle)}`);

  if (response.status === 404) {
    throw new Error(`Chess.com user "@${cleanHandle}" was not found.`);
  }

  if (!response.ok) {
    throw new Error(`Chess.com API request failed (${response.status}).`);
  }

  return response.json();
}

/**
 * Generate a random FCA verification code (e.g. FCA-8492)
 */
export function generateChesscomVerificationCode(): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `FCA-${randomDigits}`;
}

/**
 * Verify account ownership by checking if expectedCode is present in player's Chess.com location or status
 */
export async function verifyChesscomOwnership(
  username: string,
  expectedCode: string
): Promise<{ verified: boolean; player: ChesscomPlayer; message: string }> {
  const player = await fetchChesscomPlayer(username);

  const locationText = player.location?.toUpperCase() || '';
  const codeToFind = expectedCode.toUpperCase();

  const codeFound = locationText.includes(codeToFind);

  if (codeFound) {
    return {
      verified: true,
      player,
      message: `Account ownership verified! Found "${expectedCode}" in @${player.username}'s Location field.`,
    };
  } else {
    return {
      verified: false,
      player,
      message: `Verification code "${expectedCode}" was not found in @${player.username}'s Location field. Go to Chess.com > Profile Settings > Details, set Location to "${expectedCode}", click Save, and try again.`,
    };
  }
}
