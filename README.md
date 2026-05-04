# VRC Event Publisher Desk

VRCイベント情報を一度入力し、複数プラットフォーム向けに入力順どおりのコピー用カードを生成するPoCです。

初期実装では、API投稿、自動ログイン、外部フォームへの自動入力は行いません。入力補助、保存復元、JSONインポート/エクスポート、手動コピー補助に集中しています。

## 対象プリセット

- VRChat Group通知
- VRChat カレンダー
- VRChat EventCalendar
- Wonder Note
- X(Twitter)

## ローカル起動

```bash
npm install
npm run dev
```

ビルド確認:

```bash
npm run build
```

生成物の確認:

```bash
npm run preview
```

## GitHub Pages

このアプリはViteの静的サイトとしてビルドされ、GitHub ActionsからGitHub Pagesへデプロイされます。

`main` ブランチへpushすると、`.github/workflows/deploy-pages.yml` が以下を実行します。

1. `npm ci`
2. `npm run build`
3. `dist` をGitHub Pagesへアップロード
4. GitHub Pagesへデプロイ

公開URL:

```text
https://riluchi.github.io/VRC-EventPublisherDesk/
```

GitHub側でPages sourceを求められた場合は、Repository Settings > Pages で Source を `GitHub Actions` にしてください。

## 設計メモ

- 入力スキーマ: `src/config/schema.ts`
- プリセット別の並び順と警告ルール: `src/config/presets.ts`
- 入力データはブラウザの `localStorage` に自動保存されます
- JSON読み込み後は、各項目を明示確認しないとコピーできないようにしています
