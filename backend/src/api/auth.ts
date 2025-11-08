import { Router } from 'express';
import { getGoogleAuthURL, getTokensFromCode, getUserProfile, getAuthenticatedClient } from '../core/googleAuth';
import { encrypt, decrypt } from '../lib/crypto';
import db from '../db/knex';

const router = Router();

/**
 * Redirects the user to the Google OAuth2 consent screen.
 */
router.get('/google', (req, res) => {
  const url = getGoogleAuthURL();
  res.redirect(url);
});

/**
 * Handles the callback from Google OAuth2.
 * It receives an authorization code, exchanges it for tokens,
 * creates or updates the user and Google account info in the database,
 * and then redirects the user to the frontend.
 */
router.get('/google/callback', async (req, res) => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).send('Authorization code is missing.');
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokens = await getTokensFromCode(code);
    const { access_token, refresh_token, expiry_date } = tokens;

    if (!refresh_token) {
      // This can happen if the user has already granted consent and 'prompt: consent' is not used.
      return res.status(400).send('Refresh token is missing. Please re-authenticate and ensure you grant offline access.');
    }

    // 2. Get user profile from Google
    const authClient = getAuthenticatedClient(refresh_token);
    const userProfile = await getUserProfile(authClient);
    const googleEmail = userProfile.email;

    if (!googleEmail) {
      return res.status(400).send('Could not retrieve user email from Google.');
    }

    // 3. Create or update user in the database
    // Using Knex's transaction feature to ensure atomicity
    await db.transaction(async (trx) => {
      // Find or create the main user entry
      let user = await trx('users').where({ email: googleEmail }).first();
      if (!user) {
        [user] = await trx('users').insert({ email: googleEmail }).returning('*');
      }
      const userId = user.id;

      // 4. Encrypt the refresh token
      const encryptedRefreshToken = encrypt(refresh_token);

      // 5. Create or update the Google account entry
      const googleAccountData = {
        user_id: userId,
        google_email: googleEmail,
        access_token: access_token,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expiry: expiry_date,
        calendar_ids: JSON.stringify(['primary']), // Default to primary calendar
      };

      await trx('google_accounts')
        .insert(googleAccountData)
        .onConflict(['user_id', 'google_email'])
        .merge({
            access_token: access_token,
            refresh_token_encrypted: encryptedRefreshToken,
            token_expiry: expiry_date,
        });
    });

    // 6. Redirect to a frontend page
    // In a real app, you'd redirect to a success page, maybe with a JWT for session management.
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000/auth/success');

  } catch (error) {
    console.error('Error during Google OAuth callback:', error);
    res.status(500).send('An error occurred during authentication.');
  }
});

export default router;
