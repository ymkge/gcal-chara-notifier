# GCal Chara Notifier

複数のGoogleカレンダーを監視し、イベントの開始時刻に合わせて「お気に入りキャラのイラスト付き」で特定のスマートフォンにプッシュ通知を送るアプリケーションです。

## 現在の進捗

- **バックエンドの基盤構築完了**
  - Node.js + TypeScript + Express によるプロジェクト構成
  - `knex.js` と SQLite を使用したデータベース設定とマイグレーション
  - `tsc` によるビルド設定と、`nodemon` を使用した開発環境
  - データベース接続を含むヘルスチェックAPI (`/api/health`)
- **Google OAuth 2.0 連携機能の実装完了**
  - `googleapis` を使用した認証ロジック
  - `refresh_token` をAES-256-GCMで暗号化してDBに保存
  - Googleアカウント連携を開始し、コールバックを処理するAPIエンドポイント群 (`/api/auth/google`, `/api/auth/google/callback`)

## ディレクトリ構成 (バックエンド)

```
backend/
├── dist/                 # コンパイル後のJavaScriptファイル
├── src/
│   ├── api/              # Expressのルーターとコントローラー
│   │   └── auth.ts
│   ├── core/             # 中核ロジック
│   │   └── googleAuth.ts
│   ├── db/
│   │   ├── migrations/   # DBスキーマ定義
│   │   └── knex.ts
│   ├── lib/              # 補助的なライブラリ
│   │   └── crypto.ts
│   ├── index.ts          # Expressサーバー起動点
│   └── knexfile.ts       # Knex.js 設定
├── .env.example          # 環境変数テンプレート
├── .gitignore
├── package.json
└── tsconfig.json
```

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

**本番モード:**
```bash
# 1. TypeScriptをJavaScriptにコンパイル
npm run build

# 2. サーバーを起動
npm run start
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