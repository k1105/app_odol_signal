# 踊SIGNAL (odol-signal)

音声信号でリアルタイムにWebGLエフェクトを制御するPWAアプリケーション

## 概要

超音波オーディオ信号（18-19kHz）を受信して、WebGLシェーダーによるビジュアルエフェクトとプレイヤーオーバーレイをリアルタイムに制御し、インタラクティブなパフォーマンス体験を提供します。

## 技術スタック

- React 19 + TypeScript
- Vite 6
- WebGL (カスタムシェーダー)
- Web Audio API
- PWA (Progressive Web App)

## 開発環境のセットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. HTTPS証明書のセットアップ（初回のみ）

このアプリはカメラとマイクを使用するため、HTTPS接続が必須です。開発環境では`vite-plugin-mkcert`を使用してローカルCA証明書を生成します。

**初回起動時の手順:**

```bash
npm run dev
```

初回実行時に以下のプロンプトが表示されます：

```
Created a new local CA 💥
Password: ****
```

**macOSのパスワードを入力**してください。これにより、ローカルCA証明書がシステムにインストールされます。

> **注意**: この操作は初回のみ必要です。2回目以降は自動的にHTTPS通信が有効になります。

### 3. iOSデバイスでの証明書インストール（モバイルテスト時）

iOSデバイスからネットワーク経由でアクセスする場合、以下の手順でルート証明書をインストールする必要があります：

#### 3-1. ルート証明書の場所を確認

```bash
mkcert -CAROOT
```

このコマンドで表示されたディレクトリ（通常は`~/.vite-plugin-mkcert/`）に`rootCA.pem`ファイルがあります。

#### 3-2. iOSデバイスに証明書を送信

以下のいずれかの方法で送信：
- AirDrop
- メール
- ファイル共有サービス

#### 3-3. iOSデバイスにインストール

1. `rootCA.pem`を開く
2. **設定** > **プロファイルがダウンロード済み** > **インストール**
3. **設定** > **一般** > **情報** > **証明書信頼設定**（画面下部）
4. インストールした証明書を**有効化**

これで、iOSデバイスからHTTPS接続でカメラ・マイクにアクセスできるようになります。

## 開発サーバーの起動

```bash
npm run dev
```

起動後、以下のURLでアクセスできます：
- ローカル: `https://localhost:5173`
- ネットワーク: `https://[your-ip]:5173`（iOSデバイスなど）

## その他のコマンド

```bash
# 本番ビルド
npm run build

# ESLintによるコードチェック
npm run lint

# 本番ビルドのプレビュー
npm run preview
```

## プロジェクト構成

詳細なアーキテクチャとシステム設計については [`CLAUDE.md`](./CLAUDE.md) を参照してください。

### 主要なディレクトリ

- `src/components/` - Reactコンポーネント
  - `layers/` - 3層WebGLキャンバスシステム
  - `layout/` - レイアウト状態管理
- `src/utils/` - ユーティリティ関数
  - `webGLInitializer.ts` - WebGL初期化
  - `shaders/` - シェーダーコード
- `public/` - 静的アセット
  - `index_information.json` - エフェクトマッピング設定

## トラブルシューティング

### npm installでエラーが出る場合

```bash
rm -rf node_modules package-lock.json
npm install
```

### カメラ・マイクの権限エラー（iOS）

- HTTPS接続を確認
- ルート証明書が正しくインストールされているか確認
- 証明書信頼設定が有効になっているか確認

## ライセンス

このプロジェクトは非公開です。
