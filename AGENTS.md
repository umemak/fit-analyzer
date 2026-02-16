# FIT Analyzer - AI Agent Development Guide

このドキュメントはAI開発エージェント（Claude、Gemini、GPT等）向けのプロジェクトガイドです。

## プロジェクト概要

**FIT Analyzer** は、スポーツウォッチ（COROS、Garmin、Polar、Suunto等）のFITファイルを解析し、AIによるパフォーマンス評価を提供するWebアプリケーションです。

### 技術スタック

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Cloudflare Pages Functions (Workers環境)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (Object Storage)
- **AI**: OpenAI API (GPT-4o)、Groq API (Llama 3.1 8B)、または Cloudflare Workers AI
- **認証**: GitHub OAuth, Google OAuth, Email/Password

### 現在のバージョン確認

アプリケーションのフッターに現在のgit commit hashが表示されます：
```
Version: d685d51  # 本番環境
Version: dev      # 開発環境
```

## ディレクトリ構造

```
/home/user/webapp/
├── client/                    # フロントエンド（React）
│   ├── src/
│   │   ├── components/       # UIコンポーネント
│   │   ├── pages/            # ページコンポーネント
│   │   ├── lib/              # ユーティリティ、API設定
│   │   └── hooks/            # カスタムフック
│   └── public/               # 静的ファイル
├── server/                    # 開発サーバー（Express）
│   ├── ai-analyzer.ts        # OpenAI AI分析（開発環境用）
│   ├── fit-parser.ts         # FITファイルパーサー
│   └── routes.ts             # API ルート
├── functions-src/            # Cloudflare Pages Functions（本番）
│   └── api/
│       ├── analyze.ts        # FIT解析 + AI分析（Workers AI使用）
│       ├── workouts.ts       # ワークアウト履歴API
│       └── auth/             # 認証エンドポイント
├── shared/                   # 共有型定義
│   └── schema.ts             # Zod スキーマ
├── scripts/                  # ビルドスクリプト
│   └── build-cloudflare.sh   # Cloudflare Pages用ビルド
├── migrations/               # D1マイグレーション
├── d1-schema.sql            # D1スキーマ定義
└── wrangler.toml            # Cloudflare設定

dist/                         # ビルド出力（.gitignore）
├── index.html               # フロントエンド
├── assets/                  # JS/CSS
└── functions/api/           # バンドルされたAPI関数
```

## アーキテクチャ

### データフロー

```
FITファイルアップロード
  ↓
FITパース（fit-file-parser）
  ↓
AI分析（OpenAI GPT-4o）
  ↓
┌─────────────────────────────┐
│ 保存処理                      │
├─────────────────────────────┤
│ 1. 完全データ → R2          │  workouts/{userId}/{workoutId}.json
│ 2. メタデータ → D1          │  workouts テーブル（r2_key参照）
│ 3. AI分析結果 → D1          │  ai_analyses テーブル
└─────────────────────────────┘
  ↓
結果表示
```

### 重要な設計判断

#### 1. R2 + D1 ハイブリッドストレージ

**問題**: 大きなFITファイル（マラソン等）のrecords配列がD1の`SQLITE_TOOBIG`エラーを引き起こす

**解決策**:
- **R2**: 完全なワークアウトデータ（JSON）を保存
- **D1**: メタデータ（距離、時間、心拍数等）とR2キーのみ保存

**実装**: `functions-src/api/analyze.ts` の `saveWorkout` 関数

#### 2. 開発環境と本番環境の分離

- **開発** (`npm run dev`): Express サーバー + OpenAI API
- **本番** (Cloudflare Pages): Workers Functions + Workers AI または OpenAI API

**理由**: ローカル開発の高速化と本番環境の最適化

#### 3. AI分析のフォールバック

AI分析が失敗（クォーター制限等）しても、ワークアウトデータは必ず保存・表示される。

**実装**: エラー時にデフォルトのAI分析オブジェクトを返す

#### 4. 4段階AI分析による期待値予測

AI分析を4つの段階に分割し、過去データから期待値を予測して実際の結果と比較することで客観的な評価を実現。

**ステップ1: データ分析（客観的事実）**
- ペース分析: 詳細なペース推移と一貫性（100文字）
- 心拍数分析: 効率性とゾーン分析（100文字）
- 履歴比較: 過去ワークアウトとの進捗（100文字）

**ステップ2: 期待値予測（過去データから）** 🆕
- 過去2回以上のデータから期待ペース・心拍数を予測
- 類似距離での改善トレンド分析
- 距離変化に応じた自動調整
- 予測確度評価 (high/medium/low)

**ステップ3: 評価生成（期待値との比較）**
- 期待値 vs 実際の詳細比較
- 強み: 期待を上回った点を優先的に記載（3つ、各50文字）
- 改善点: 期待未達の要素を明示（2-3つ、各50文字）

**ステップ4: 総合評価とアドバイス（期待値差を考慮）**
- 総合スコア: 期待値との差で±1-2点調整
  - 期待超過 → 9-10点
  - 期待通り → 7-8点
  - 期待未達 → 5-6点
- パフォーマンス要約: 期待値比較を必ず含む（150文字）
- トレーニング推奨: 期待値差を埋める/伸ばす内容（3つ、各70文字）
- 回復アドバイス: 期待値差も考慮（100文字）

**実装箇所**:
- `server/ai-analyzer.ts`: analyzeWorkoutData → predictExpectedPerformance → evaluatePerformance → generateFinalAnalysis
- `functions-src/api/analyze.ts`: calculateExpectedPerformance + 4段階関数
- `client/src/pages/home.tsx`: 4ステップ進捗表示

**効果**:
- 客観的評価: 過去データから予測される基準と比較
- モチベーション向上: 改善が数値で可視化
- トレンド検出: 改善・停滞・低下を自動判別
- データドリブン: 期待値と実績の差分に基づく推奨

**コスト影響**:
- API呼び出し: 4回（従来3回から+1）
- max_tokens: 2048/回
- 総コスト: 約3.5倍（Workers AIは無料、Groqは依然低コスト）
- 予測機能により品質大幅向上

#### 5. 条件付き認証プロバイダー表示

GitHub/Google OAuthボタンは環境変数が設定されている場合のみ表示されます。

**環境変数**:
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

**実装**:
- APIエンドポイント: `/api/auth/config` がOAuth有効性を返す
- フロントエンド: `auth-buttons.tsx` が設定を取得して条件付きレンダリング
- 開発環境: `server/routes.ts`
- 本番環境: `functions-src/api/auth/config.ts`

メール/パスワード認証は常に表示されます。

## 開発ワークフロー

### Git コミット規約

```bash
# フォーマット
<type>(<scope>): <subject>

# 例
feat(ai-analyzer): add git hash to version display
fix(storage): prevent D1 SQLITE_TOOBIG error with R2
docs(readme): update deployment instructions
```

**Types**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `refactor`: リファクタリング
- `test`: テスト追加/修正
- `chore`: ビルド、設定変更

### 必須ワークフロー

**すべてのコード変更後**:
1. ✅ コミット（明確なメッセージ）
2. ✅ プッシュ（`main` ブランチ）
3. ⚠️ PR作成は不要（個人プロジェクト）

### ビルドとデプロイ

```bash
# 開発サーバー
npm run dev

# Cloudflare Pages用ビルド（本番）
bash scripts/build-cloudflare.sh

# ビルド出力確認
ls -la dist/
```

**Cloudflare Pages 自動デプロイ**:
- `main` ブランチへのpushで自動デプロイ
- ビルドコマンド: `bash scripts/build-cloudflare.sh`
- 出力ディレクトリ: `dist`

## 重要なファイル

### AI分析実装

#### `server/ai-analyzer.ts` (開発環境)
- OpenAI GPT-4o使用
- **全ラップデータ**をプロンプトに含める
- 心拍数変動、ペース一貫性の計算

#### `functions-src/api/analyze.ts` (本番環境)
- Cloudflare Workers AI使用
- FITパース、AI分析、R2/D1保存を統合
- エラーハンドリングとフォールバック

### データスキーマ

#### `shared/schema.ts`
Zodスキーマで型定義：
- `WorkoutData`: FITファイルのパース結果
- `AIAnalysis`: AI分析結果
- `WorkoutRecord`: 各時点のデータ（心拍数、速度、位置等）

#### `d1-schema.sql`
- `users`: ユーザー情報
- `workouts`: ワークアウトメタデータ + `r2_key`
- `ai_analyses`: AI分析結果
- `sessions`: 認証セッション

### マイグレーション

#### `migrations/0001_add_r2_key_to_workouts.sql`
`r2_key` カラムを追加（R2オブジェクトキー参照用）

## 環境変数

### Cloudflare Pages設定

**Environment variables**:
- `AI_PROVIDER`: AI プロバイダー選択
  - `workers-ai` (デフォルト): llama-3.1-70b-instruct
  - `workers-ai-120b` (推奨): gpt-oss-120b - OpenAI の最新推論モデル
  - `openai`: gpt-4o
  - `groq`: llama-3.1-8b-instant
- `WORKERS_AI_MODEL`: Workers AI モデル名を直接指定（オプション、例: `@cf/openai/gpt-oss-120b`）
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI APIキー（`AI_PROVIDER=openai` の場合）
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI Base URL（オプション）
- `GROQ_API_KEY`: Groq APIキー（`AI_PROVIDER=groq` の場合）

**開発環境 (.env)**:
- `AI_PROVIDER`: AI プロバイダー選択 (`openai` / `groq`)
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI APIキー
- `GROQ_API_KEY`: Groq APIキー

**Bindings**:
- `DB`: D1 Database (`fit-analyzer-db`)
- `AI`: Workers AI
- `WORKOUT_DATA`: R2 Bucket (`fit-analyzer-workout-data`)

### AI プロバイダー比較

| プロバイダー | モデル | パラメータ | 入力コスト | 出力コスト | 速度 | 推論能力 | 品質 |
|---|---|---|---|---|---|---|---|
| **Workers AI** (推奨🥇) | gpt-oss-120b | 117B (5.1B active) | 無料 | - | 普通 | ★★★★★ | 最高 |
| Workers AI | llama-3.1-70b-instruct | 70B | 無料 | - | 普通 | ★★★★☆ | 高 |
| Groq | llama-3.1-8b-instant | 8B | $0.05/1M | $0.08/1M | 超高速 (840 TPS) | ★★★☆☆ | 良好 |
| OpenAI | gpt-4o | 非公開 | $5.00/1M | $15.00/1M | 普通 | ★★★★★ | 最高 |

**gpt-oss-120b の特徴**:
- OpenAI が 2025年8月リリースの最新オープンウェイトモデル
- Mixture-of-Experts (MoE) アーキテクチャで効率的
- Chain-of-Thought (CoT) 推論を内蔵
- Reasoning effort を調整可能 (low/medium/high)
- Structured Outputs (JSON) に最適化
- o4-mini 相当の推論能力

**コスト試算** (1,000回分析):
- **Workers AI (gpt-oss-120b)**: **無料** (最もコスパ良い🥇)
- Workers AI (llama-3.1-70b): 無料 (クォーター制限あり)
- Groq: $0.14
- OpenAI: $20.00

## よくある作業

### 0. PWA共有機能のデバッグ

**重要: iOS/iPadOSの制限**

iOSはWeb Share Target APIをサポートしていません：
- ✅ Android: サポート（Chrome, Edge等）
- ❌ iOS/iPadOS: **未サポート**（Safari含む全ブラウザ）

**iOSでの回避策**:

1. **ファイルアプリ経由**（推奨）
   - COROSアプリ → 「ファイルに保存」
   - FIT Analyzer PWAを開く
   - ファイル選択ダイアログで「ブラウズ」→ ファイルアプリから選択

2. **AirDrop → Safariで開く**
   - COROSアプリ → AirDrop → 自分のデバイス
   - Safariで開く → FIT Analyzer にドラッグ&ドロップ

3. **メール/メッセージ経由**
   - COROSアプリ → メール送信
   - メールを開く → 添付ファイルをダウンロード
   - FIT Analyzer でアップロード

4. **Shortcuts アプリ（上級者向け）**
   - iOSショートカットでHTTP POSTを自動化
   - FITファイルを直接 `/api/analyze` にアップロード

**Androidでの設定**（Web Share Target API使用可能）:

FITファイルを他のアプリ（COROSアプリ等）から共有できない場合：

**確認項目**:
```bash
# 1. manifest.json の share_target 設定を確認
cat client/public/manifest.json | grep -A 15 "share_target"

# 2. Service Worker が登録されているか（ブラウザDevTools > Application > Service Workers）

# 3. PWAとしてインストールされているか確認
```

**デバッグ方法**:
1. ブラウザDevToolsを開く（Chrome: F12）
2. Console タブを選択
3. COROSアプリからFITファイルを共有
4. `[SW] Share target triggered` ログを確認
5. エラーがあれば確認

**よくある問題**:
- **PWAが未インストール**: 必ずPWAとしてインストールする（ブラウザではなくアプリとして）
- **共有リストに表示されない**: 
  1. PWAを一度アンインストール
  2. ブラウザキャッシュをクリア（DevTools > Application > Clear storage）
  3. Service Workerを削除（DevTools > Application > Service Workers > Unregister）
  4. ページをリロード（Ctrl+Shift+R / Cmd+Shift+R）
  5. PWAを再インストール
  6. 端末を再起動（Androidの場合、共有リストのキャッシュをクリア）
- **Service Workerが古い**: ブラウザでSW削除 → 再読み込み
- **MIMEタイプ不一致**: manifest.jsonで `application/octet-stream` を最初に指定
- **Androidの共有リストキャッシュ**: 端末を再起動して共有リストを更新

### 1. R2バケットのセットアップ

```bash
# R2バケット作成
npx wrangler r2 bucket create fit-analyzer-workout-data

# Cloudflare Dashboard でバインディング設定
# Pages > Settings > Functions > R2 bucket bindings
# Variable: WORKOUT_DATA
# Bucket: fit-analyzer-workout-data
```

### 2. D1マイグレーション実行

```bash
# リモートDBにマイグレーション適用
npx wrangler d1 execute fit-analyzer-db --remote \
  --file=./migrations/0001_add_r2_key_to_workouts.sql

# スキーマ確認
npx wrangler d1 execute fit-analyzer-db --remote \
  --command="PRAGMA table_info(workouts);"
```

### 3. 新しいマイグレーション作成

```bash
# マイグレーションファイル作成
touch migrations/0002_add_new_column.sql

# SQL記述
cat > migrations/0002_add_new_column.sql << 'EOF'
ALTER TABLE workouts ADD COLUMN new_column TEXT;
CREATE INDEX IF NOT EXISTS idx_new_column ON workouts(new_column);
EOF

# 適用
npx wrangler d1 execute fit-analyzer-db --remote \
  --file=./migrations/0002_add_new_column.sql
```

### 4. バージョン確認

本番環境でバージョン確認：
```bash
curl -s https://fit-analyzer.pages.dev | grep -o 'Version: [a-f0-9]*'
```

または Playwright:
```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://fit-analyzer.pages.dev');
const version = await page.locator('footer p:has-text("Version")').textContent();
console.log(version);
await browser.close();
```

## トラブルシューティング

### SQLITE_TOOBIG エラー

**症状**: `Error: D1_ERROR: string or blob too big: SQLITE_TOOBIG`

**原因**: 大きなワークアウトデータ（records配列）をD1に保存しようとしている

**確認**:
```bash
# R2バインディングがあるか確認
# Cloudflare Dashboard > Pages > Settings > Functions
# WORKOUT_DATA バインディングが存在するか？
```

**解決策**:
1. R2バケットを作成（上記参照）
2. R2バインディングを設定
3. マイグレーションを実行（r2_key追加）
4. 再デプロイ

### AI分析エラーでワークアウトが保存されない

**症状**: AI分析がエラーになると結果画面が表示されない

**確認**: ログで以下を確認
```
AI analysis error: ...
```

**仕様**: AIエラー時もワークアウトデータは保存され、デフォルト分析を表示すべき

**確認箇所**:
- `server/routes.ts` (開発)
- `functions-src/api/analyze.ts` (本番)

### ビルドでgit hashが埋め込まれない

**症状**: フッターに `Version: dev` や `Version: unknown` と表示

**確認**:
```bash
# ビルドログで確認
bash scripts/build-cloudflare.sh 2>&1 | grep -i "git hash"

# 期待される出力:
# Git hash: d685d51
# [Vite Cloudflare Config] Building with git hash: d685d51
```

**解決策**:
1. `scripts/build-cloudflare.sh` でgit hash取得を確認
2. `vite.config.cloudflare.ts` でVITE_GIT_HASH読み込みを確認
3. Cloudflare Pages のビルドコマンドが正しいか確認

### ペースが実際より遅く表示される（停止時間が含まれている）

**症状**: タイマー停止した時間がペース計算に含まれ、実際より遅いペースが表示される

**原因**: FITファイルには以下2つの時間フィールドがあります：
- `total_elapsed_time`: 経過時間（停止時間を含む）
- `total_timer_time`: タイマー時間（停止時間を除く、実際の運動時間）

従来は`total_elapsed_time`または元の`avg_speed`をそのまま使用していました。

**解決策**: `avgSpeed`を`total_timer_time`ベースで再計算する（実装済み）

**実装箇所**:
- `server/fit-parser.ts`: セッションとラップの`avgSpeed`を`total_timer_time`から計算
  ```typescript
  const avgSpeedFromTimer = totalTimerTime > 0 && totalDistance > 0 
    ? totalDistance / totalTimerTime 
    : session.avg_speed;
  ```
- ログ出力で確認可能：
  ```
  [FIT Parser] Time calculation: {
    totalElapsedTime: 3600,
    totalTimerTime: 3400,
    pauseTime: 200,  // 停止時間
    avgSpeedRecalculated: 3.5  // timer_timeベースの速度
  }
  ```

**表示**:
- メインの「時間」には`totalTimerTime`を表示
- 停止時間がある場合は「経過: XX:XX」と補足表示

## 既知の制限

1. **地図表示**: Leafletの問題により一時的に無効化（RouteMapコンポーネント）
2. **ラップ数**: AI分析には全ラップを渡すが、非常に多い場合はトークン制限の可能性
3. **R2未設定時**: ワークアウト保存がスキップされる（エラーログに記録）

## 参考リンク

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [fit-file-parser](https://github.com/jimmykane/fit-file-parser)

## 連絡先

- **Repository**: https://github.com/umemak/fit-analyzer
- **Production**: https://fit-analyzer.pages.dev

---

**Last Updated**: 2026-01-23  
**Version**: d685d51

#### 5. 進捗表示の改善（4段階プロセス）

4段階AI分析の処理状況をリアルタイムで表示。

**プログレス表示フロー**:
- **0-2秒 (10-30%)**: ステップ1/4: データ分析中（ペース・心拍数・履歴）...
- **2-4秒 (30-50%)**: ステップ2/4: 過去データから期待値を予測中... 🆕
- **4-7秒 (50-75%)**: ステップ3/4: 期待値と実績を比較して評価中...
- **7-10秒 (75-90%)**: ステップ4/4: 総合スコアとトレーニングアドバイス生成中...
- **10秒以上 (90-95%)**: 最終処理中...
- **完了 (100%)**: AI分析完了

**実装箇所**:
- `client/src/pages/home.tsx`: 時間ベースの進捗シミュレーション（100ms間隔、4段階対応）
- `client/src/components/file-upload.tsx`: 動的メッセージ表示

**効果**:
- ユーザーが何が起きているか理解できる
- 「10%で止まる」問題の解消
- 4段階プロセス（期待値予測を含む）の可視化
- より良いUX

**技術詳細**:
- クライアント側での進捗シミュレーション（SSE不要）
- 経過時間に基づくメッセージ更新
- インターバルのクリーンアップ処理
- すべてのバックエンドと互換性維持
