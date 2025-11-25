import cron from 'node-cron';
import db from '../db/knex';
import { decrypt } from '../lib/crypto';
import { getAuthenticatedClient } from './googleAuth';
import { google } from 'googleapis';
import { sendFCMNotification } from './notifier';

/**
 * スケジューラを開始する関数
 */
export const startScheduler = () => {
  // 毎日6時から22時までの間、毎時20分と50分に実行
  cron.schedule('20,50 6-22 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled task: Checking Google Calendar events...`);
    await checkGoogleCalendarEvents();
  });

  console.log('Scheduler started. Waiting for scheduled tasks.');
};

/**
 * Google Calendarイベントをチェックするメインロジック
 */
const checkGoogleCalendarEvents = async () => {
  try {
    const googleAccounts = await db('google_accounts').select('*');

    for (const account of googleAccounts) {
      try {
        const { user_id: userId, google_email: googleEmail, refresh_token_encrypted: encryptedRefreshToken, id: accountId } = account;

        if (!encryptedRefreshToken) {
          console.warn(`Skipping ${googleEmail}: No refresh token found.`);
          continue;
        }

        const refreshToken = decrypt(encryptedRefreshToken);
        const authClient = getAuthenticatedClient(refreshToken);
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        const now = new Date();
        const timeMin = now.toISOString();
        // 次のcron実行は30分後なので、余裕をもって35分後までのイベントを取得
        const timeMax = new Date(now.getTime() + 35 * 60 * 1000).toISOString();

        // TODO: 将来的には 'primary' だけでなく、DBに保存されたカレンダーIDをすべてチェックする
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events = response.data.items;
        if (!events || events.length === 0) {
          continue;
        }

        // ユーザーの通知設定とデバイス情報を取得
        const userPrefs = await db('notification_prefs').where('user_id', userId).first();
        const devices = await db('devices').where('user_id', userId);
        if (!devices || devices.length === 0) {
          console.warn(`Skipping ${googleEmail}: No registered devices found for user ${userId}.`);
          continue;
        }

        for (const event of events) {
          const eventId = event.id;
          const eventStartTimeStr = event.start?.dateTime;
          if (!eventId || !eventStartTimeStr) continue;

          // 1. 重複通知チェック
          const existingNotification = await db('sent_notifications')
            .where({ account_id: accountId, event_id: eventId })
            .first();
          if (existingNotification) {
            continue; // 既にこのイベントの通知レコードが存在する
          }

          // 2. 通知タイミングの判定
          const eventStartTime = new Date(eventStartTimeStr);
          const leadTime = userPrefs?.lead_time_minutes || 10; // デフォルト10分
          const notificationTime = new Date(eventStartTime.getTime() - leadTime * 60 * 1000);

          // cronの実行タイミングのズレを吸収するため、2分間のウィンドウを設ける
          const notificationWindowStart = new Date(notificationTime.getTime() - 1 * 60 * 1000);
          const notificationWindowEnd = new Date(notificationTime.getTime() + 1 * 60 * 1000);

          if (now >= notificationWindowStart && now <= notificationWindowEnd) {
            // 3. 通知の実行
            console.log(`[${now.toISOString()}] Sending notification for event: "${event.summary}" to ${googleEmail}`);

            const title = event.summary || 'もうすぐ予定の時間です';
            const body = `${leadTime}分後に開始します`;
            const imageUrl = userPrefs?.character_image_url;

            // 全てのデバイスに通知を送信
            for (const device of devices) {
              await sendFCMNotification(
                device.fcm_token,
                title,
                body,
                {
                  userId: userId,
                  accountId: accountId,
                  eventId: eventId,
                  scheduledTime: eventStartTime,
                },
                imageUrl
              );
            }
          }
        }
      } catch (accountError) {
        console.error(`Error processing Google account ${account.google_email}:`, accountError);
        // TODO: トークン失効（invalid_grantなど）を検知した場合、DBのトークンを無効化する処理を追加
      }
    }
  } catch (dbError) {
    console.error('Error fetching Google accounts from DB:', dbError);
  }
};
