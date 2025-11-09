# GCal Chara Notifier

複数のGoogleカレンダーを監視し、イベントの開始時刻に合わせて「お気に入りキャラのイラスト付き」で特定のスマートフォンにプッシュ通知を送るアプリケーションです。

## 開発の現状と再開時のアクション (2025-11-09時点)

現在、バックエンドの基本機能とGoogle OAuth連携機能の実装が完了し、`npm run dev` でサーバーを起動できる状態です。

### 本日の対応内容 (2025-11-09)

-   **Google OAuth同意画面の課題解決**:
    -   以前発生していた「意図しない古いOAuthクライアントの同意画面が表示される問題」は、Google Cloud Platformのブランディング設定でアプリ名を修正することで解決しました。
-   **イベント監視スケジューラの構築 (一部完了)**:
    -   `node-cron` をインストールし、`src/core/scheduler.ts` を作成しました。
    -   スケジューラは毎日6時から22時までの間、毎時20分と50分に実行されるように設定しました。これにより、会議の10分前にイベントを検知できる可能性が高まります。
    -   `src/index.ts` にスケジューラ起動ロジックを組み込みました。
-   **FCM通知送信モジュールの実装 (準備段階)**:
    -   `firebase-admin` をインストールし、`backend/.env.example` にFirebase認証情報用の環境変数 (`FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`) を追加しました。
    -   `src/core/notifier.ts` を作成し、Firebase Admin SDKの初期化コードとFCM通知送信関数のスケルトンを実装しました。
-   **APIの拡充 (FCMトークン保存API)**:
    -   `POST /api/devices` エンドポイントを処理する `src/api/device.ts` を作成し、`src/index.ts` に組み込みました。
    -   `src/api/device.ts` のロジックを、既存の `20251108134850_create_initial_tables.ts` に含まれる `devices` テーブルのスキーマに合わせて修正しました。

### 現在の課題点

-   **Knex.js マイグレーションエラー**:
    -   `npm run db:migrate` を実行すると、`SQLITE_ERROR: table devices already exists` というエラーが発生し、マイグレーションが完了しません。
    -   `backend/src/db/dev.sqlite3` ファイルの手動削除、`backend/node_modules` の削除と `npm install` の再実行を試みましたが、解決に至っていません。
    -   この問題は、`knex` の動作が期待通りではないか、環境設定に何らかの問題がある可能性が高いです。
    -   この課題が解決しない限り、`devices` テーブルが正しく作成されず、FCMトークンを保存するAPI (`POST /api/devices`) や、FCM通知モジュールが機能しません。

### ★ 次回開発再開時のアクション

-   **最優先**: 上記の「Knex.js マイグレーションエラー」の解決。
    -   `knex` の公式ドキュメントやコミュニティでの情報収集、またはデータベース環境の見直し（例: SQLite以外のDBの検討）が必要となる可能性があります。
-   マイグレーション問題解決後、`README.md` の「NEXT STEP - 今後の開発計画」の「2. FCM通知送信モジュールの実装」を続行。

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
- `FIREBASE_PROJECT_ID`: FirebaseプロジェクトID
- `FIREBASE_PRIVATE_KEY`: Firebaseサービスアカウントの秘密鍵 (改行コードは `\n` にエスケープ)
- `FIREBASE_CLIENT_EMAIL`: Firebaseサービスアカウントのクライアントメール

### 3. 依存関係のインストール
```bash
npm install
```

### 4. データベースのマイグレーション
SQLiteデータベースファイルとテーブルを作成します。
**注意: 現在、マイグレーションに問題が発生しています。上記「現在の課題点」を参照してください。**
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
*This README was last updated by Gemini on 2025-11-09.*