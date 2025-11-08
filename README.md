# GCal Chara Notifier

複数のGoogleカレンダーを監視し、イベントの開始時刻に合わせて「お気に入りキャラのイラスト付き」で特定のスマートフォンにプッシュ通知を送るアプリケーションです。

## 開発の現状と再開時のアクション (2025-11-08時点)

現在、バックエンドの基本機能とGoogle OAuth連携機能の実装が完了し、`npm run dev` でサーバーを起動できる状態です。

### 中断時点の課題

Googleアカウント連携をテストする際、開発者の環境で `http://localhost:3001/api/auth/google` にアクセスすると、意図しない古いOAuthクライアントの同意画面が表示される問題が発生しています。
（Googleアカウントからのログアウトでは解決しませんでした。）

これは、ブラウザに保存されているセッションやCookieが原因である可能性が高いです。

### ★ 再開時の最初のアクション

開発を再開する際は、**まず以下の手順でこの問題が解決するかどうかを確認してください。**

1.  お使いのブラウザで**シークレットモード（プライベートウィンドウ）**を開きます。
2.  シークレットモードのウィンドウで、開発サーバーの認証開始URLにアクセスします。
    ```
    http://localhost:3001/api/auth/google
    ```
3.  今回`.env`に設定したクライアントIDに対応する、**新しいアプリケーションの同意画面**が表示されることを確認します。

#### 問題が解決した場合
無事に新しい同意画面が表示されたら、OAuth連携機能のテストは完了です。
次の `NEXT STEP - 今後の開発計画` に記載されている「**1. イベント監視スケジューラの構築**」から開発を再開します。

#### 問題が解決しない場合
シークレットモードでも古い画面が表示される場合は、さらに詳しい調査が必要です。その際は、以下の可能性を検討します。
- `.env` ファイルに設定した `GOOGLE_CLIENT_ID` が正しいかどうかの再確認。
- バックエンドが生成している認証URL自体をデバッグする。

---

## セットアップと実行手順

### 1. プロジェクトのクローンと移動
```bash
git clone <repository_url>
cd gcal-chara-notifier/backend
```

### 2. 環境変数の設定
`.env.example` をコピーして `.env` ファイルを作成します。
```bash
cp .env.example .env
```
作成した `.env` ファイルをエディタで開き、以下の項目を設定してください。

- `GOOGLE_CLIENT_ID`: Google Cloud Consoleで取得したOAuth 2.0クライアントID
- `GOOGLE_CLIENT_SECRET`: Google Cloud Consoleで取得したクライアントシークレット
- `ENCRYPTION_KEY`: `refresh_token` の暗号化に使用する32バイトの秘密鍵。以下のコマンドで生成できます。
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 3. 依存関係のインストール
```bash
npm install
```

### 4. データベースのマイグレーション
SQLiteデータベースファイルとテーブルを作成します。
```bash
npm run db:migrate
```

### 5. アプリケーションの実行

**開発モード (ホットリロード有効):**
```bash
npm run dev
```

### 6. Googleアカウント連携のテスト
サーバーを起動した状態で、Webブラウザから以下のURLにアクセスすると、Googleの認証フローが開始されます。
```
http://localhost:3001/api/auth/google
```
認証が成功すると、ユーザー情報とアカウント情報がデータベースに保存されます。

---

## NEXT STEP - 今後の開発計画

### 1. イベント監視スケジューラの構築
- **目的**: 定期的にGoogle Calendarをチェックし、通知対象のイベントを見つける。
- **実装**:
  - `node-cron` を利用して、毎分実行されるタスクを作成 (`src/core/scheduler.ts`)。
  - DBからGoogleアカウント情報を取得し、復号した`refresh_token`で認証済みクライアントを作成。
  - Google Calendar API (`calendar.events.list`) を使用して、直近のイベントを取得。
  - 通知すべきイベントを特定し、通知ジョブのキューに追加する。

### 2. FCM通知送信モジュールの実装
- **目的**: スケジューラが見つけたイベント情報を元に、スマートフォンへプッシュ通知を送信する。
- **実装**:
  - `firebase-admin` SDKをセットアップ。
  - `src/core/notifier.ts` に通知送信ロジックを実装。
  - DBから対象ユーザーのFCM登録トークンを取得。
  - `messaging.send()` を使用して、タイトル、本文、キャラクター画像URLを含むプッシュ通知を送信。
  - 送信履歴を `sent_notifications` テーブルに記録する。

### 3. フロントエンド (PWA) の構築
- **目的**: ユーザーがアカウント連携や通知設定を行えるUIと、プッシュ通知を受信する機能を提供する。
- **実装**:
  - `frontend` ディレクトリに `Next.js` プロジェクトをセットアップ。
  - Googleアカウント連携を開始するためのログインボタンを設置。
  - Firebase SDKを導入し、FCM登録トークンを生成してバックエンドに送信するAPIクライアントを実装。
  - Service Worker (`firebase-messaging-sw.js`) を設定し、バックグラウンドでのプッシュ通知受信を可能にする。

### 4. APIの拡充
- **目的**: フロントエンドや設定に必要なAPIを追加する。
- **実装**:
  - `POST /api/devices`: フロントエンドから受け取ったFCM登録トークンをDBに保存する。
  - `GET /api/notification-prefs`, `POST /api/notification-prefs`: 通知リードタイムやキャラクター画像URLを設定・取得する。

---
*This README was last updated by Gemini on 2025-11-08.*
