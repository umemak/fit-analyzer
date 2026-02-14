# Groq API セットアップガイド

FIT Analyzer で Groq API を使用するための設定手順です。

## Groq とは？

Groq は超高速な LLM 推論サービスで、OpenAI の約 **140分の1 のコスト**で AI 分析が可能です。

| サービス | モデル | 1,000 回分析のコスト | 速度 |
|---|---|---|---|
| **Groq** | llama-3.1-8b-instant | **$0.14** | 840 tokens/秒 |
| OpenAI | gpt-4o | $20.00 | 普通 |
| Workers AI | llama-3.1-70b | 無料（制限あり） | 普通 |

## セットアップ手順

### 1. Groq API キーの取得

1. [Groq Console](https://console.groq.com/) にアクセス
2. サインアップまたはログイン
3. API Keys ページで **Create API Key** をクリック
4. キーをコピーして安全に保管（例: `gsk_...`）

### 2. Cloudflare Pages での設定

#### Environment Variables 設定

Cloudflare Dashboard で以下を設定：

1. **Pages** → **fit-analyzer** → **Settings** → **Environment variables**
2. **Production** タブで以下の変数を追加：

```
AI_PROVIDER = groq
GROQ_API_KEY = gsk_your_actual_api_key_here
```

3. **Save** をクリック
4. **Deployments** ページで **Retry deployment** をクリックして再デプロイ

### 3. 開発環境での設定

`.env` ファイルを作成または編集：

```bash
# AI Provider selection
AI_PROVIDER=groq

# Groq API key
GROQ_API_KEY=gsk_your_actual_api_key_here
```

開発サーバーを起動：

```bash
npm run dev
```

### 4. 動作確認

FIT ファイルをアップロードし、ログで確認：

```
[AI Analyzer] Using AI provider: groq
[AI Analyzer] Using Groq model: llama-3.1-8b-instant
```

## プロバイダー切り替え

`AI_PROVIDER` 環境変数で簡単に切り替え可能：

| 値 | 使用するサービス | モデル |
|---|---|---|
| `groq` | Groq API | llama-3.1-8b-instant |
| `openai` | OpenAI API | gpt-4o |
| `workers-ai` | Cloudflare Workers AI | llama-3.1-70b-instruct |

**デフォルト**: `workers-ai`（環境変数が未設定の場合）

## トラブルシューティング

### エラー: "Authentication failed"

- `GROQ_API_KEY` が正しく設定されているか確認
- キーが `gsk_` で始まっているか確認
- Cloudflare Pages で再デプロイを実行

### エラー: "Rate limit exceeded"

Groq の無料枠を超えた場合：

1. [Groq Console](https://console.groq.com/settings/billing) で使用量を確認
2. 必要に応じて有料プランにアップグレード
3. 一時的に `AI_PROVIDER=workers-ai` に切り替え

### AI 分析が遅い

- Groq は超高速（840 tokens/秒）のはず
- ネットワーク遅延が原因の可能性
- Cloudflare Pages のログでレスポンス時間を確認

## コスト試算

### 例：月間 10,000 回分析

| プロバイダー | 月間コスト |
|---|---|
| Groq | **$1.40** |
| OpenAI | $200.00 |
| Workers AI | 無料（クォーター制限） |

### トークン使用量（1回あたり）

- 入力: 約 2,000 トークン（ワークアウトデータ + 履歴 + プロンプト）
- 出力: 約 500 トークン（AI 分析結果）

## 参考リンク

- [Groq Console](https://console.groq.com/)
- [Groq API Documentation](https://console.groq.com/docs)
- [Groq Pricing](https://groq.com/pricing)
- [Supported Models](https://console.groq.com/docs/models)

---

**作成日**: 2026-02-14  
**コミット**: 5df1bf1
