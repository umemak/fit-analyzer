import OpenAI from "openai";
import type { WorkoutData, AIAnalysis } from "@shared/schema";

// AI Provider Configuration
const AI_PROVIDER = process.env.AI_PROVIDER || "openai"; // "openai" or "groq"

// Initialize OpenAI client (supports both OpenAI and Groq via baseURL)
const openai = new OpenAI({
  apiKey: AI_PROVIDER === "groq" 
    ? process.env.GROQ_API_KEY 
    : process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: AI_PROVIDER === "groq" 
    ? "https://api.groq.com/openai/v1"
    : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
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

interface WorkoutHistory {
  date: string;
  sport: string;
  distance: number; // meters
  duration: number; // seconds
  avgPace?: number; // min/km
  avgHeartRate?: number;
}

export async function analyzeWorkout(
  workout: WorkoutData, 
  recentWorkouts: WorkoutHistory[] = []
): Promise<AIAnalysis> {
  const { summary, laps, records } = workout;
  
  // Calculate additional metrics for analysis
  const heartRateVariation = calculateHeartRateVariation(records);
  const paceConsistency = calculatePaceConsistency(laps);
  
  console.log(`[AI Analyzer] Starting analysis for ${summary.sport} workout with ${laps.length} laps, ${recentWorkouts.length} recent workouts`);
  
  // Build history context
  let historyContext = '';
  let historyInstructions = '';
  if (recentWorkouts.length > 0) {
    historyContext = `\n## 直近のワークアウト履歴（過去5回）
${recentWorkouts.map((w, i) => {
  const daysSince = Math.floor((new Date().getTime() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24));
  return `${i + 1}. ${w.date} (${daysSince}日前) - ${w.sport}: ${(w.distance / 1000).toFixed(2)}km, ${formatDuration(w.duration)}${w.avgPace ? `, ペース ${w.avgPace.toFixed(2)}分/km` : ''}${w.avgHeartRate ? `, 平均心拍 ${Math.round(w.avgHeartRate)}bpm` : ''}`;
}).join('\n')}`;

    // Calculate training frequency
    const intervals = [];
    for (let i = 0; i < recentWorkouts.length - 1; i++) {
      const days = Math.floor((new Date(recentWorkouts[i].date).getTime() - new Date(recentWorkouts[i + 1].date).getTime()) / (1000 * 60 * 60 * 24));
      intervals.push(days);
    }
    const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    
    // Calculate average distance and pace from history
    const avgHistoryDistance = recentWorkouts.reduce((sum, w) => sum + w.distance, 0) / recentWorkouts.length / 1000;
    const avgHistoryPace = recentWorkouts.filter(w => w.avgPace).length > 0
      ? recentWorkouts.filter(w => w.avgPace).reduce((sum, w) => sum + (w.avgPace || 0), 0) / recentWorkouts.filter(w => w.avgPace).length
      : null;
    
    historyInstructions = `

**重要：履歴データを必ず活用してください**
- 過去の平均トレーニング間隔: ${avgInterval.toFixed(1)}日
- 過去の平均距離: ${avgHistoryDistance.toFixed(1)}km
${avgHistoryPace ? `- 過去の平均ペース: ${avgHistoryPace.toFixed(2)}分/km` : ''}
- 今回と前回の距離比較: ${summary.totalDistance > recentWorkouts[0].distance ? '増加' : '減少'}
- 前回からの経過日数: ${Math.floor((new Date().getTime() - new Date(recentWorkouts[0].date).getTime()) / (1000 * 60 * 60 * 24))}日

performanceSummaryには必ず「前回より○○」「○日ぶりのトレーニング」などの比較を含めてください。
strengthsには過去との比較による改善点を具体的に含めてください。
trainingRecommendationsには過去の頻度（平均${avgInterval.toFixed(1)}日間隔）を考慮した次回のタイミングを提案してください。`;
  } else {
    historyInstructions = `

**注意：これは初回のワークアウト記録です**
履歴データがないため、このワークアウト単体での評価を行ってください。今後のトレーニング計画の基準となる記録です。`;
  }
  
  const prompt = `あなたはプロのランニング・トライアスロンコーチです。以下のワークアウトデータを分析し、日本語で詳細な評価を提供してください。
${historyInstructions}

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
${laps.map((lap, i) => `ラップ${i + 1}: ${(lap.totalDistance / 1000).toFixed(2)}km, ${formatDuration(lap.totalElapsedTime)}, ペース ${formatPace(lap.avgSpeed)}${lap.avgHeartRate ? `, HR ${Math.round(lap.avgHeartRate)}` : ''}`).join('\n')}

## 追加分析
- 心拍数変動: ${heartRateVariation}
- ペース一貫性: ${paceConsistency}
${historyContext}

以下のJSON形式で回答してください。各フィールドは具体的で実用的なアドバイスを含めてください:

{
  "overallScore": (1-10の整数、ワークアウトの総合評価),
  "performanceSummary": "(100-150文字程度でワークアウト全体の評価を要約。履歴がある場合は前回との比較や進捗を含める)",
  "strengths": ["(強みを3つ挙げてください。履歴と比較した改善点も含める)"],
  "areasForImprovement": ["(改善点を2-3つ挙げてください。履歴から見える課題も指摘)"],
  "trainingRecommendations": ["(次回のトレーニングに向けた具体的なアドバイスを3つ。トレーニング頻度や回復期間も考慮)"],
  "heartRateAnalysis": "(心拍数データがある場合、心拍ゾーンと効率性について分析。履歴と比較した心肺機能の変化も評価)",
  "paceAnalysis": "(ペースの安定性と戦略について分析。履歴と比較したペースの向上や変化を評価)",
  "recoveryAdvice": "(このワークアウト後の回復アドバイス。直近のトレーニング頻度を考慮した具体的な休息期間を提案)"
}`;

  let response;
  try {
    // Select model based on provider
    const model = AI_PROVIDER === "groq" 
      ? "llama-3.1-8b-instant"  // Groq: fastest, cheapest model
      : "gpt-4o";                // OpenAI: high quality model
    
    console.log(`[AI Analyzer] Using AI provider: ${AI_PROVIDER}, model: ${model}`);
    
    response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "あなたはエリートレベルのエンデュランススポーツコーチです。科学的根拠に基づいた分析と、実践的で個別化されたアドバイスを提供します。ユーザーの過去のワークアウト履歴を考慮し、進捗状況、トレーニング頻度、回復状況を総合的に評価してください。JSONフォーマットで回答してください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });
  } catch (error: any) {
    console.error("[AI Analyzer] OpenAI API error:", error);
    console.error("[AI Analyzer] Error details - status:", error?.status, "code:", error?.code, "type:", error?.type);
    console.error("[AI Analyzer] Error message:", error?.message);
    
    // Extract error message from various possible locations
    const errorMessage = error?.message || error?.error?.message || '';
    const errorCode = error?.code || error?.error?.code || '';
    const errorType = error?.type || error?.error?.type || '';
    const statusCode = error?.status || error?.statusCode || error?.response?.status;
    
    // Check for quota/rate limit errors (case-insensitive)
    const lowerMessage = errorMessage.toLowerCase();
    const lowerCode = errorCode.toLowerCase();
    const lowerType = errorType.toLowerCase();
    
    if (
      statusCode === 429 || 
      lowerCode.includes('rate_limit') || 
      lowerCode.includes('quota') ||
      lowerType.includes('quota') ||
      lowerMessage.includes('quota') || 
      lowerMessage.includes('rate limit')
    ) {
      if (lowerMessage.includes('quota') || lowerCode.includes('quota') || lowerType.includes('quota')) {
        throw new Error('AI分析のクォーター（利用枠）制限に達しました。しばらくしてから再度お試しください。');
      } else if (lowerMessage.includes('rate limit') || lowerCode.includes('rate_limit')) {
        throw new Error('AI分析のレート制限に達しました。しばらくしてから再度お試しください。');
      } else {
        throw new Error('AI分析のリクエスト制限に達しました。しばらくしてから再度お試しください。');
      }
    }
    
    // For other errors, throw a generic message but log the original
    throw new Error(`AI分析中にエラーが発生しました: ${errorMessage || '不明なエラー'}`);
  }

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
