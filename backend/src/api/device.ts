import { Router } from 'express';
import db from '../db/knex';

const router = Router();

/**
 * FCM登録トークンを保存するAPI
 * リクエストボディ: { fcmToken: string, userId: number }
 */
router.post('/devices', async (req, res) => {
  const { fcmToken, userId } = req.body;

  if (!fcmToken || !userId) {
    return res.status(400).send('FCM Token and User ID are required.');
  }

  try {
    // 既存のトークンがあれば更新、なければ新規作成
    await db('devices')
      .insert({ user_id: userId, fcm_registration_token: fcmToken }) // fcm_token -> fcm_registration_token
      .onConflict(['fcm_registration_token']) // user_idとfcm_tokenの組み合わせでユニーク -> fcm_registration_tokenでユニーク
      .merge(); // 競合した場合は更新

    res.status(200).send('FCM Token saved successfully.');
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).send('Failed to save FCM Token.');
  }
});

export default router;
