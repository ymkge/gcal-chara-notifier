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
 * FCMプッシュ通知を送信する関数
 * @param fcmToken 送信先のデバイスのFCM登録トークン
 * @param title 通知のタイトル
 * @param body 通知の本文
 * @param imageUrl キャラクター画像のURL (オプション)
 * @param data 追加データ (オプション)
 */
export const sendFCMNotification = async (
  fcmToken: string,
  title: string,
  body: string,
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
      // TODO: 通知IDやイベントIDなど、必要なデータをここに追加
    },
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);

    // TODO: 送信履歴をsent_notificationsテーブルに記録する
    // await db('sent_notifications').insert({
    //   user_id: userId, // 適切なユーザーID
    //   fcm_token: fcmToken,
    //   title: title,
    //   body: body,
    //   sent_at: db.fn.now(),
    //   status: 'success',
    //   response: JSON.stringify(response),
    // });

    return response;
  } catch (error) {
    console.error('Error sending message:', error);

    // TODO: エラー履歴をsent_notificationsテーブルに記録する
    // await db('sent_notifications').insert({
    //   user_id: userId, // 適切なユーザーID
    //   fcm_token: fcmToken,
    //   title: title,
    //   body: body,
    //   sent_at: db.fn.now(),
    //   status: 'error',
    //   error_message: error.message,
    // });

    throw error;
  }
};