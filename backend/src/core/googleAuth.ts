import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Creates a new Google OAuth2 client.
 */
const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

/**
 * Generates a Google OAuth2 URL for user consent.
 * This URL will prompt the user to grant access to the requested scopes.
 * @returns The generated authentication URL.
 */
export function getGoogleAuthURL(): string {
  const oauth2Client = createOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email', // To get user's email address
    'https://www.googleapis.com/auth/userinfo.profile', // To get basic profile info
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Essential to receive a refresh token
    prompt: 'consent',      // Ensures the user is prompted for consent, which helps in getting a refresh token every time
    scope: scopes,
  });
}

/**
 * Fetches the OAuth2 tokens (access token, refresh token, etc.) using the authorization code.
 * @param code The authorization code received from Google's callback.
 * @returns The OAuth2 tokens.
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Creates an authenticated OAuth2 client using a stored refresh token.
 * This is used for making API calls on behalf of the user without requiring them to log in again.
 * @param refreshToken The user's refresh token.
 * @returns An authenticated OAuth2 client.
 */
export function getAuthenticatedClient(refreshToken: string) {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
}

/**
 * Retrieves user profile information using an authenticated client.
 * @param auth The authenticated OAuth2 client.
 * @returns The user's profile information.
 */
export async function getUserProfile(auth: any) {
    const service = google.oauth2({ version: 'v2', auth });
    const { data } = await service.userinfo.get();
    return data;
}
