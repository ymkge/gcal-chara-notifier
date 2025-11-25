# GCal Chara Notifier

複数のGoogleカレンダーを監視し、イベントの開始時刻に合わせて「お気に入りキャラのイラスト付き」で特定のスマートフォンにプッシュ通知を送るアプリケーションです。

## 開発の現状 (2025-11-25時点)

バックエンドの主要機能である、カレンダー監視〜プッシュ通知までの一連のフローが実装完了しました。
`npm run dev` でサーバーを起動すると、スケジューラが自動で動作し、データベースの情報に基づいてプッシュ通知が送信される状態です。

### 本日の対応内容 (2025-11-25)

-   **DBマイグレーションエラーの解決**:
    -   以前からの課題であった、マイグレーション実行時に `devices` テーブルが重複して作成されるエラーを解決しました。
    -   不要なマイグレーションコードを削除し、データベースをクリーンな状態から再構築しました。
-   **FCM通知送信モジュールの完成**:
    -   `src/core/notifier.ts` を本格的に実装しました。
    -   通知の送信後、その結果（成功・失敗）を `sent_notifications` テーブルに記録するロジックを追加しました。
    -   上記のために、`sent_notifications` テーブルに `response` と `error_message` カラムを追加するマイグレーションを行いました。
-   **イベント監視スケジューラの完成**:
    -   `src/core/scheduler.ts` に、カレンダーを監視して通知をトリガーする一連の処理を実装しました。
    -   **主なロジック**:
        -   cronジョブで定期的（毎時20分・50分）に処理を実行。
        -   DBからGoogleアカウント、ユーザーの通知設定、デバイス情報を取得。
        -   ユーザーが設定したリードタイム（例: 10分前）に合わせて、通知すべきタイミングかを判定。
        -   同じイベントへの重複通知を防止するチェック機構を実装。
        -   条件を満たした場合、`notifier` モジュールを呼び出してプッシュ通知を実行。

### ★ 次回開発再開時のアクション

バックエンドの基本機能が整ったため、次のいずれかのアクションに進むことができます。

-   **フロントエンドの構築 (推奨)**:
    -   `README.md` の「NEXT STEP - 今後の開発計画」に記載の「**3. フロントエンド (PWA) の構築**」に着手します。
-   **バックエンドの改善**:
    -   コード内に `TODO` として残っている改善項目（複数カレンダー対応、Google認証トークン失効時のエラーハンドリングなど）を実装します。

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

### 1. イベント監視スケジューラの構築 (完了)
- **目的**: 定期的にGoogle Calendarをチェックし、通知対象のイベントを見つける。
- **実装**:
  - `node-cron` を利用して、毎時20分・50分に実行されるタスクを作成 (`src/core/scheduler.ts`)。
  - DBからGoogleアカウント情報を取得し、復号した`refresh_token`で認証済みクライアントを作成。
  - Google Calendar API (`calendar.events.list`) を使用して、直近のイベントを取得。
  - ユーザー設定に基づき、通知すべきイベントを特定して通知を実行する。

### 2. FCM通知送信モジュールの実装 (完了)
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
*This README was last updated by Gemini on 2025-11-25.*