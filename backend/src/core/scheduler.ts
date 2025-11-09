import cron from 'node-cron';
import db from '../db/knex';
import { decrypt } from '../lib/crypto';
import { getAuthenticatedClient } from './googleAuth';
import { google } from 'googleapis';

/**
 * スケジューラを開始する関数
 */
export const startScheduler = () => {
  // 毎分実行されるタスクをスケジュール
  cron.schedule('20,50 6-22 * * *', async () => {
    console.log('Running scheduled task: Checking Google Calendar events...');
    await checkGoogleCalendarEvents();
  });

  console.log('Scheduler started. Checking for events every minute.');
};

/**
 * Google Calendarイベントをチェックするメインロジック
 */
const checkGoogleCalendarEvents = async () => {
  try {
    // 1. データベースからGoogleアカウント情報を取得
    const googleAccounts = await db('google_accounts').select('*');

    for (const account of googleAccounts) {
      try {
        const userId = account.user_id;
        const googleEmail = account.google_email;
        const encryptedRefreshToken = account.refresh_token_encrypted;

        if (!encryptedRefreshToken) {
          console.warn(`User ${userId} (${googleEmail}) has no refresh token. Skipping.`);
          continue;
        }

        // 2. refresh_tokenを復号し、認証済みクライアントを作成
        const refreshToken = decrypt(encryptedRefreshToken);
        const authClient = getAuthenticatedClient(refreshToken);

        // 3. Google Calendar APIを使用してイベントを取得
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        // 現在時刻からN分後までのイベントを取得する例
        const now = new Date();
        const timeMin = now.toISOString();
        const timeMax = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 今から10分後まで

        const response = await calendar.events.list({
          calendarId: 'primary', // 'primary'はユーザーのメインカレンダー
          timeMin: timeMin,
          timeMax: timeMax,
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events = response.data.items;

        if (events && events.length > 0) {
          console.log(`Found ${events.length} upcoming events for ${googleEmail}:`);
          for (const event of events) {
            console.log(`- ${event.summary} (${event.start?.dateTime || event.start?.date})`);
            // TODO: ここで通知すべきイベントを特定し、通知ジョブのキューに追加するロジックを実装
          }
        } else {
          console.log(`No upcoming events found for ${googleEmail} in the next 10 minutes.`);
        }

      } catch (accountError) {
        console.error(`Error processing Google account ${account.google_email}:`, accountError);
        // TODO: トークン失効などのエラーハンドリング
      }
    }
  } catch (dbError) {
    console.error('Error fetching Google accounts from DB:', dbError);
  }
};
