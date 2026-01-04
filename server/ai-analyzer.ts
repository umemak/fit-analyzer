import OpenAI from "openai";
import type { WorkoutData, AIAnalysis } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}時間${mins}分${secs}秒`;
  }
  return `${mins}分${secs}秒`;
}

function formatPace(speedMps: number | undefined): string {
  if (!speedMps || speedMps === 0) return "N/A";
  const paceSecsPerKm = 1000 / speedMps;
  const mins = Math.floor(paceSecsPerKm / 60);
  const secs = Math.floor(paceSecsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}/km`;
}

export async function analyzeWorkout(workout: WorkoutData): Promise<AIAnalysis> {
  const { summary, laps, records } = workout;
  
  // Calculate additional metrics for analysis
  const heartRateVariation = calculateHeartRateVariation(records);
  const paceConsistency = calculatePaceConsistency(laps);
  
  const prompt = `あなたはプロのランニング・トライアスロンコーチです。以下のワークアウトデータを分析し、日本語で詳細な評価を提供してください。

## ワークアウト概要
- スポーツ: ${summary.sport}
- 距離: ${(summary.totalDistance / 1000).toFixed(2)} km
- 時間: ${formatDuration(summary.totalElapsedTime)}
- 平均ペース: ${formatPace(summary.avgSpeed)}
- 最速ペース: ${formatPace(summary.maxSpeed)}
${summary.avgHeartRate ? `- 平均心拍数: ${Math.round(summary.avgHeartRate)} bpm` : ''}
${summary.maxHeartRate ? `- 最大心拍数: ${Math.round(summary.maxHeartRate)} bpm` : ''}
${summary.totalCalories ? `- 消費カロリー: ${Math.round(summary.totalCalories)} kcal` : ''}
${summary.totalAscent ? `- 獲得標高: ${Math.round(summary.totalAscent)} m` : ''}
${summary.avgCadence ? `- 平均ケイデンス: ${Math.round(summary.avgCadence)} spm` : ''}
${summary.avgPower ? `- 平均パワー: ${Math.round(summary.avgPower)} W` : ''}

## ラップ情報
${laps.slice(0, 10).map((lap, i) => `ラップ${i + 1}: ${(lap.totalDistance / 1000).toFixed(2)}km, ${formatDuration(lap.totalElapsedTime)}, ペース ${formatPace(lap.avgSpeed)}${lap.avgHeartRate ? `, HR ${Math.round(lap.avgHeartRate)}` : ''}`).join('\n')}

## 追加分析
- 心拍数変動: ${heartRateVariation}
- ペース一貫性: ${paceConsistency}

以下のJSON形式で回答してください。各フィールドは具体的で実用的なアドバイスを含めてください:

{
  "overallScore": (1-10の整数、ワークアウトの総合評価),
  "performanceSummary": "(100-150文字程度でワークアウト全体の評価を要約)",
  "strengths": ["(強みを3つ挙げてください)"],
  "areasForImprovement": ["(改善点を2-3つ挙げてください)"],
  "trainingRecommendations": ["(次回のトレーニングに向けた具体的なアドバイスを3つ)"],
  "heartRateAnalysis": "(心拍数データがある場合、心拍ゾーンと効率性について分析)",
  "paceAnalysis": "(ペースの安定性と戦略について分析)",
  "recoveryAdvice": "(このワークアウト後の回復アドバイス)"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "あなたはエリートレベルのエンデュランススポーツコーチです。科学的根拠に基づいた分析と、実践的で個別化されたアドバイスを提供します。JSONフォーマットで回答してください。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const analysis = JSON.parse(content) as AIAnalysis;
  
  // Validate and sanitize the response
  return {
    overallScore: Math.min(10, Math.max(1, analysis.overallScore || 7)),
    performanceSummary: analysis.performanceSummary || "ワークアウトが完了しました。",
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 5) : ["ワークアウトを完了しました"],
    areasForImprovement: Array.isArray(analysis.areasForImprovement) ? analysis.areasForImprovement.slice(0, 5) : [],
    trainingRecommendations: Array.isArray(analysis.trainingRecommendations) ? analysis.trainingRecommendations.slice(0, 5) : [],
    heartRateAnalysis: analysis.heartRateAnalysis,
    paceAnalysis: analysis.paceAnalysis,
    recoveryAdvice: analysis.recoveryAdvice || "適切な休息と水分補給を心がけてください。",
  };
}

function calculateHeartRateVariation(records: WorkoutData["records"]): string {
  const heartRates = records
    .map((r) => r.heartRate)
    .filter((hr): hr is number => hr !== undefined && hr > 0);
  
  if (heartRates.length === 0) return "データなし";
  
  const avg = heartRates.reduce((a, b) => a + b, 0) / heartRates.length;
  const variance = heartRates.reduce((sum, hr) => sum + Math.pow(hr - avg, 2), 0) / heartRates.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / avg) * 100;
  
  if (cv < 5) return "非常に安定（CV < 5%）";
  if (cv < 10) return "安定（CV < 10%）";
  if (cv < 15) return "やや変動あり（CV < 15%）";
  return "変動が大きい（CV >= 15%）";
}

function calculatePaceConsistency(laps: WorkoutData["laps"]): string {
  const paces = laps
    .map((l) => l.avgSpeed)
    .filter((speed): speed is number => speed !== undefined && speed > 0);
  
  if (paces.length < 2) return "ラップデータ不足";
  
  const avg = paces.reduce((a, b) => a + b, 0) / paces.length;
  const variance = paces.reduce((sum, pace) => sum + Math.pow(pace - avg, 2), 0) / paces.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / avg) * 100;
  
  if (cv < 3) return "非常に一貫（CV < 3%）";
  if (cv < 6) return "一貫（CV < 6%）";
  if (cv < 10) return "やや変動あり（CV < 10%）";
  return "変動が大きい（CV >= 10%）";
}
