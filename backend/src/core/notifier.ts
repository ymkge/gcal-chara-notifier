import * as admin from 'firebase-admin';
import db from '../db/knex';

// Firebase Admin SDKの初期化
if (!admin.apps.length) {
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\n/g, '\n'), // 改行コードを適切に処理
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } else {
    console.warn('Firebase Admin SDK credentials are not fully set in environment variables. FCM notifications will not work.');
  }
}


/**
 * 通知の履歴記録に必要なメタデータを定義するインターフェース
 */
interface NotificationMetadata {
  userId: number;
  accountId: number;
  eventId: string;
  scheduledTime: Date;
}

/**
 * FCMプッシュ通知を送信する関数
 * @param fcmToken 送信先のデバイスのFCM登録トークン
 * @param title 通知のタイトル
 * @param body 通知の本文
 * @param metadata 履歴記録用のメタデータ
 * @param imageUrl キャラクター画像のURL (オプション)
 * @param data 追加データ (オプション)
 */
export const sendFCMNotification = async (
  fcmToken: string,
  title: string,
  body: string,
  metadata: NotificationMetadata,
  imageUrl?: string,
  data?: { [key: string]: string }
) => {
  const message: admin.messaging.Message = {
    notification: {
      title: title,
      body: body,
      imageUrl: imageUrl,
    },
    data: {
      ...data,
      eventId: metadata.eventId,
    },
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);

    // 送信履歴をsent_notificationsテーブルに記録する
    await db('sent_notifications').insert({
      user_id: metadata.userId,
      account_id: metadata.accountId,
      event_id: metadata.eventId,
      scheduled_time: metadata.scheduledTime,
      status: 'sent',
      response: JSON.stringify(response),
    });

    return response;
  } catch (error) {
    console.error('Error sending message:', error);

    // エラー履歴をsent_notificationsテーブルに記録する
    await db('sent_notifications').insert({
      user_id: metadata.userId,
      account_id: metadata.accountId,
      event_id: metadata.eventId,
      scheduled_time: metadata.scheduledTime,
      status: 'failed',
      error_message: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
};