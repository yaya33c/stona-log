# STONA Log

個人用ログ管理アプリ（気づき・仕事・学習・読書・場所）

## デプロイ手順

### 1. GitHubにアップロード

```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_NAME/stona-log.git
git push -u origin main
```

### 2. Vercelでデプロイ

1. [vercel.com](https://vercel.com) でGitHubリポジトリを選択
2. Framework: **Vite** を選択（自動検出されます）
3. Deploy → 完了

## AI分析機能のAPIキー設定

アプリ右上の ⚙ から Anthropic APIキーを入力。  
キーは端末のlocalStorageに保存され、サーバーには送信されません。

APIキー取得: https://console.anthropic.com/

## ローカル開発

```bash
npm install
npm run dev
```
