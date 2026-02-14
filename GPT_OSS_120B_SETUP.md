# gpt-oss-120b セットアップガイド

**Cloudflare Workers AI で gpt-oss-120b（OpenAI の最新推論モデル）を使用する方法**

## gpt-oss-120b とは？

OpenAI が 2025年8月にリリースした**最先端のオープンウェイト推論モデル**で、以下の特徴があります：

### 主要スペック

- **総パラメータ数**: 117B（1170億）
- **アクティブパラメータ**: 5.1B/token（MoE により効率化）
- **アーキテクチャ**: Mixture-of-Experts (MoE)
- **コンテキスト長**: 128k tokens
- **ライセンス**: Apache 2.0（オープンウェイト）

### 性能比較

| モデル | パラメータ | 推論能力 | ベンチマーク |
|---|---|---|---|
| **gpt-oss-120b** | 117B | ★★★★★ | o4-mini 相当 |
| llama-3.1-70b | 70B | ★★★★☆ | 高性能 |
| llama-3.1-8b (Groq) | 8B | ★★★☆☆ | 基本 |

**ベンチマーク結果**:
- **Codeforces (競技プログラミング)**: o4-mini 相当
- **AIME (数学)**: o4-mini を超える
- **HealthBench (医療)**: o4-mini を超える
- **TauBench (Tool use)**: o4-mini 相当

## FIT Analyzer での利点

### 1. 推論能力が高い

```
✅ 複数ラップデータの比較推論
✅ 過去履歴との詳細な比較分析
✅ トレーニング計画の論理的な推奨
✅ Chain-of-Thought (段階的推論) 対応
```

### 2. 構造化出力に最適

```json
{
  "overallScore": 8,
  "performanceSummary": "前回から3日ぶりのトレーニング。距離が2km増加し10kmを達成。ペースは5:30/km→5:15/kmへ15秒改善。心拍数は5bpm低下し、回復が進んでいる兆候。",
  "strengths": [
    "ペースが15秒/km向上（前回5:30→今回5:15）",
    "適切な3日間の回復期間を確保",
    "心拍数5bpm低下で効率的な走り"
  ]
}
```

### 3. Reasoning Effort 調整

```typescript
// システムメッセージで調整可能
"Reasoning effort: low"   // 高速、基本的な分析
"Reasoning effort: medium" // バランス（デフォルト）
"Reasoning effort: high"   // 詳細、複雑な推論
```

## セットアップ手順

### Cloudflare Pages での設定

#### Environment Variables

Cloudflare Dashboard で以下を設定：

1. **Pages** → **fit-analyzer** → **Settings** → **Environment variables**
2. **Production** タブで変数を追加：

```bash
# 方法1: AI_PROVIDER で指定（推奨）
AI_PROVIDER = workers-ai-120b

# 方法2: WORKERS_AI_MODEL で直接指定
WORKERS_AI_MODEL = @cf/openai/gpt-oss-120b
```

3. **Save** をクリック
4. **Deployments** ページで **Retry deployment** をクリック

### 動作確認

FIT ファイルをアップロード後、Cloudflare Pages のログで確認：

```
[AI Analyzer] Using AI provider: workers-ai-120b
[AI Analyzer] Using Workers AI model: @cf/openai/gpt-oss-120b
```

## モデル選択の推奨順位

| 順位 | 設定 | モデル | 理由 |
|---|---|---|---|
| 🥇 | `AI_PROVIDER=workers-ai-120b` | gpt-oss-120b (117B) | 推論能力最高、無料 |
| 🥈 | `AI_PROVIDER=workers-ai` | llama-3.1-70b (70B) | 汎用性良好、無料 |
| 🥉 | `AI_PROVIDER=groq` | llama-3.1-8b (8B) | 超高速、低コスト |
| 4位 | `AI_PROVIDER=openai` | gpt-4o | 最高品質、高コスト |

## コスト比較（1,000回分析）

| プロバイダー | モデル | コスト |
|---|---|---|
| **Cloudflare (gpt-oss-120b)** | 117B | **無料** 🥇 |
| Cloudflare (llama-3.1-70b) | 70B | 無料 |
| Groq | 8B | $0.14 |
| OpenAI | gpt-4o | $20.00 |

## トラブルシューティング

### エラー: "Model not found"

Workers AI で gpt-oss-120b が利用できない場合：

```bash
# 代替設定
AI_PROVIDER = workers-ai  # llama-3.1-70b に戻す
```

または、Cloudflare のドキュメントで最新のモデル名を確認：
https://developers.cloudflare.com/workers-ai/models/

### クォーター制限

Workers AI は無料ですが、クォーター制限があります。制限に達した場合：

1. **Groq に切り替え**（低コスト）
   ```bash
   AI_PROVIDER = groq
   GROQ_API_KEY = gsk_...
   ```

2. **OpenAI に切り替え**（高品質）
   ```bash
   AI_PROVIDER = openai
   AI_INTEGRATIONS_OPENAI_API_KEY = sk-...
   ```

### 応答品質が期待より低い

Reasoning effort を調整してみる：

```typescript
// プロンプトに追加（将来実装予定）
"Reasoning effort: high"  // より詳細な分析
```

## 参考リンク

- [gpt-oss-120b - Cloudflare Docs](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/)
- [Introducing gpt-oss - OpenAI](https://openai.com/index/introducing-gpt-oss/)
- [Cloudflare & OpenAI Partnership](https://blog.cloudflare.com/openai-gpt-oss-on-workers-ai/)
- [Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)

## まとめ

**gpt-oss-120b は FIT Analyzer に最適**:
- ✅ **無料**（最もコスパ良い）
- ✅ **推論能力最高**（117B、o4-mini 相当）
- ✅ **構造化出力**に最適化
- ✅ **複雑な比較分析**が得意
- ✅ **Cloudflare との統合**がシームレス

**推奨設定**: `AI_PROVIDER=workers-ai-120b`

---

**作成日**: 2026-02-14  
**コミット**: TBD
