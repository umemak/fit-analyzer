import OpenAI from "openai";
import type { WorkoutData, AIAnalysis } from "../shared/schema";

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

interface DataAnalysisResult {
  paceAnalysis: string;
  heartRateAnalysis: string;
  historyComparison: string;
}

interface EvaluationResult {
  strengths: string[];
  areasForImprovement: string[];
}

interface FinalAnalysisResult {
  overallScore: number;
  performanceSummary: string;
  trainingRecommendations: string[];
  recoveryAdvice: string;
}

interface ExpectedPerformance {
  expectedPace?: string;
  expectedDistance?: number;
  expectedHeartRate?: number;
  confidence: string;
  reasoning: string;
}

function calculateHeartRateVariation(records: any[]): string {
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

function calculatePaceConsistency(laps: any[]): string {
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

// Helper function to call AI
async function callAI(prompt: string, step: string): Promise<string> {
  const model = AI_PROVIDER === "groq" 
    ? "llama-3.1-8b-instant"
    : "gpt-4o";
  
  console.log(`[AI Analyzer - ${step}] Using provider: ${AI_PROVIDER}, model: ${model}`);
  
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: "あなたはエンデュランススポーツの専門コーチです。科学的根拠に基づいた分析を行い、必ずJSON形式で回答してください。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
  });
  
  const content = response.choices[0].message.content || "{}";
  console.log(`[AI Analyzer - ${step}] Completed`);
  
  return content;
}

// Step 1: Data Analysis
async function analyzeWorkoutData(
  workout: WorkoutData,
  recentWorkouts: WorkoutHistory[] = []
): Promise<DataAnalysisResult> {
  const { summary, laps, records } = workout;
  
  const maxLaps = 10;
  const limitedLaps = laps.slice(0, maxLaps);
  const heartRateVariation = calculateHeartRateVariation(records);
  const paceConsistency = calculatePaceConsistency(laps);
  
  let historyContext = '';
  if (recentWorkouts.length > 0) {
    const daysSinceLast = Math.floor((new Date().getTime() - new Date(recentWorkouts[0].date).getTime()) / (1000 * 60 * 60 * 24));
    const avgDistance = recentWorkouts.reduce((sum, w) => sum + w.distance, 0) / recentWorkouts.length / 1000;
    const currentDistance = summary.totalDistance / 1000;
    
    historyContext = `
## 直近のワークアウト履歴
${recentWorkouts.slice(0, 3).map((w, i) => {
  const daysSince = Math.floor((new Date().getTime() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24));
  return `${i + 1}. ${daysSince}日前: ${(w.distance / 1000).toFixed(1)}km, ${formatDuration(w.duration)}`;
}).join('\n')}
前回からの日数: ${daysSinceLast}日
過去平均距離: ${avgDistance.toFixed(1)}km
今回距離: ${currentDistance.toFixed(1)}km (${currentDistance > avgDistance ? '+' : ''}${(currentDistance - avgDistance).toFixed(1)}km)`;
  }
  
  const prompt = `エンデュランススポーツコーチとして、以下のワークアウトデータを客観的に分析してください。

## ワークアウト概要
- スポーツ: ${summary.sport}
- 距離: ${(summary.totalDistance / 1000).toFixed(2)} km
- 時間: ${formatDuration(summary.totalElapsedTime)}
- 平均ペース: ${formatPace(summary.avgSpeed)}
- 最速ペース: ${formatPace(summary.maxSpeed)}
${summary.avgHeartRate ? `- 平均心拍数: ${Math.round(summary.avgHeartRate)} bpm` : ''}
${summary.maxHeartRate ? `- 最大心拍数: ${Math.round(summary.maxHeartRate)} bpm` : ''}

## ラップ情報（最初の${maxLaps}ラップ）
${limitedLaps.map((lap, i) => `ラップ${i + 1}: ${(lap.totalDistance / 1000).toFixed(2)}km, ${formatDuration(lap.totalElapsedTime)}, ペース ${formatPace(lap.avgSpeed)}${lap.avgHeartRate ? `, HR ${Math.round(lap.avgHeartRate)}` : ''}`).join('\n')}

## 統計データ
- 心拍数変動: ${heartRateVariation}
- ペース一貫性: ${paceConsistency}
${historyContext}

以下のJSON形式で客観的な分析結果を回答してください：
{
  "paceAnalysis": "ペースの特徴と推移を100文字程度で詳細に分析",
  "heartRateAnalysis": "心拍数の特徴と効率性を100文字程度で詳細に分析",
  "historyComparison": "過去のワークアウトとの比較（距離、ペース、頻度など）を100文字程度で分析。履歴がない場合は単体での特徴を記述"
}`;

  const content = await callAI(prompt, "Step 1: Data Analysis");
  return JSON.parse(content) as DataAnalysisResult;
}

// Step 1.5: Predict Expected Performance
async function predictExpectedPerformance(
  workout: WorkoutData,
  recentWorkouts: WorkoutHistory[] = []
): Promise<ExpectedPerformance | null> {
  if (recentWorkouts.length < 2) {
    return null; // 履歴が少なすぎる場合は予測しない
  }

  const { summary } = workout;
  const currentDistance = summary.totalDistance / 1000;
  const daysSinceLast = Math.floor((new Date().getTime() - new Date(recentWorkouts[0].date).getTime()) / (1000 * 60 * 60 * 24));

  const historyWithPace = recentWorkouts.filter(w => w.avgPace);
  const historyWithHR = recentWorkouts.filter(w => w.avgHeartRate);

  const prompt = `エンデュランススポーツコーチとして、以下の過去のトレーニング履歴から、今回のワークアウトの期待値を予測してください。

## 過去のワークアウト履歴（直近5回）
${recentWorkouts.map((w, i) => {
  const daysSince = Math.floor((new Date().getTime() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24));
  return `${i + 1}. ${daysSince}日前: ${w.sport}, ${(w.distance / 1000).toFixed(1)}km, ${formatDuration(w.duration)}${w.avgPace ? `, ペース ${w.avgPace}` : ''}${w.avgHeartRate ? `, 心拍数 ${Math.round(w.avgHeartRate)}bpm` : ''}`;
}).join('\n')}

## 今回のワークアウト情報
- スポーツ: ${summary.sport}
- 距離: ${currentDistance.toFixed(1)} km
- 前回からの日数: ${daysSinceLast}日

上記の履歴データから、今回のワークアウトで期待される以下のパフォーマンスを予測してください：
{
  "expectedPace": "${historyWithPace.length >= 2 ? '5:30/km のような形式で予測ペースを記載。過去の傾向（改善/停滞/低下）を考慮すること' : 'null'}",
  "expectedDistance": ${currentDistance.toFixed(1)},
  "expectedHeartRate": ${historyWithHR.length >= 2 ? '過去のデータから予測される平均心拍数（整数）' : 'null'},
  "confidence": "high/medium/low のいずれか（データ数、最終トレーニングからの日数、トレンドの一貫性に基づく）",
  "reasoning": "期待値の根拠を80文字程度で説明（過去のトレンド、回復期間、距離の変化などを考慮）"
}`;

  const content = await callAI(prompt, "Step 1.5: Expected Performance Prediction");
  const result = JSON.parse(content) as ExpectedPerformance;
  
  return result;
}

// Step 2: Evaluation
async function evaluatePerformance(
  workout: WorkoutData,
  dataAnalysis: DataAnalysisResult,
  expectedPerformance: ExpectedPerformance | null
): Promise<EvaluationResult> {
  const { summary } = workout;
  
  let expectedContext = '';
  if (expectedPerformance) {
    expectedContext = `

## 期待値との比較
### 予測された期待値
- 期待ペース: ${expectedPerformance.expectedPace || 'データ不足'}
- 期待心拍数: ${expectedPerformance.expectedHeartRate ? `${expectedPerformance.expectedHeartRate}bpm` : 'データ不足'}
- 予測の確度: ${expectedPerformance.confidence}
- 予測根拠: ${expectedPerformance.reasoning}

### 実際のパフォーマンス
- 実際のペース: ${formatPace(summary.avgSpeed)}
- 実際の心拍数: ${summary.avgHeartRate ? `${Math.round(summary.avgHeartRate)}bpm` : 'データなし'}

**重要**: 期待値と実際の結果の差（期待超過/期待通り/期待未達）を評価に反映してください。`;
  }
  
  const prompt = `エンデュランススポーツコーチとして、以下のデータ分析結果を基に評価を行ってください。

## ワークアウト基本情報
- スポーツ: ${summary.sport}
- 距離: ${(summary.totalDistance / 1000).toFixed(2)} km
- 時間: ${formatDuration(summary.totalElapsedTime)}
- 平均ペース: ${formatPace(summary.avgSpeed)}

## データ分析結果
### ペース分析
${dataAnalysis.paceAnalysis}

### 心拍数分析
${dataAnalysis.heartRateAnalysis}

### 履歴比較
${dataAnalysis.historyComparison}
${expectedContext}

上記の分析結果を踏まえて、以下のJSON形式で評価してください：
{
  "strengths": ["強み1（具体的なデータを含めて50文字程度）", "強み2", "強み3"],
  "areasForImprovement": ["改善点1（具体的な数値目標を含めて50文字程度）", "改善点2"]
}

**注意**: 期待値が提供されている場合、期待値を上回った点を強みに、下回った点を改善点に明確に含めてください。`;

  const content = await callAI(prompt, "Step 2: Evaluation");
  return JSON.parse(content) as EvaluationResult;
}

// Step 3: Final Analysis
async function generateFinalAnalysis(
  workout: WorkoutData,
  dataAnalysis: DataAnalysisResult,
  evaluation: EvaluationResult,
  expectedPerformance: ExpectedPerformance | null
): Promise<FinalAnalysisResult> {
  const { summary } = workout;
  
  let expectedSummary = '';
  if (expectedPerformance) {
    expectedSummary = `

## 期待値と実際の結果の比較
- 予測確度: ${expectedPerformance.confidence}
- 予測根拠: ${expectedPerformance.reasoning}
- 期待ペース vs 実際: ${expectedPerformance.expectedPace || 'N/A'} vs ${formatPace(summary.avgSpeed)}
${expectedPerformance.expectedHeartRate ? `- 期待心拍数 vs 実際: ${expectedPerformance.expectedHeartRate}bpm vs ${summary.avgHeartRate ? Math.round(summary.avgHeartRate) : 'N/A'}bpm` : ''}

**総合評価への影響**: 期待値を超えた要素はスコアを上げ、期待未達の要素はスコアを下げること。期待通りの場合は中間的な評価とすること。`;
  }
  
  const prompt = `エンデュランススポーツコーチとして、以下のデータ分析と評価を総合して、最終的なアドバイスを提供してください。

## ワークアウト基本情報
- スポーツ: ${summary.sport}
- 距離: ${(summary.totalDistance / 1000).toFixed(2)} km
- 時間: ${formatDuration(summary.totalElapsedTime)}

## データ分析結果
### ペース分析
${dataAnalysis.paceAnalysis}

### 心拍数分析
${dataAnalysis.heartRateAnalysis}

### 履歴比較
${dataAnalysis.historyComparison}
${expectedSummary}

## 評価結果
### 強み
${evaluation.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### 改善点
${evaluation.areasForImprovement.map((a, i) => `${i + 1}. ${a}`).join('\n')}

上記すべてを考慮して、以下のJSON形式で総合的な分析とアドバイスを提供してください：
{
  "overallScore": (1-10の整数。データ分析、評価、特に期待値との比較結果を総合的に判断。期待超過なら+1〜2、期待未達なら-1〜2の調整を考慮),
  "performanceSummary": "今回のワークアウト全体を150文字程度で要約。期待値との比較結果を必ず含めること",
  "trainingRecommendations": [
    "次回のトレーニングに向けた具体的な推奨1（期待値との差を埋める/伸ばす内容を含めて70文字程度）",
    "推奨2（頻度や回復期間を考慮）",
    "推奨3（長期的な目標に向けて）"
  ],
  "recoveryAdvice": "このワークアウト後の回復について、期待値との差も考慮した具体的な期間と方法を100文字程度でアドバイス"
}`;

  const content = await callAI(prompt, "Step 3: Final Analysis");
  return JSON.parse(content) as FinalAnalysisResult;
}

export async function analyzeWorkout(
  workout: WorkoutData, 
  recentWorkouts: WorkoutHistory[] = []
): Promise<AIAnalysis> {
  console.log(`[AI Analyzer] Starting 4-step analysis process with ${recentWorkouts.length} recent workouts`);
  
  try {
    // Step 1: Data Analysis
    const dataAnalysis = await analyzeWorkoutData(workout, recentWorkouts);
    
    // Step 1.5: Predict Expected Performance (if enough history)
    const expectedPerformance = await predictExpectedPerformance(workout, recentWorkouts);
    if (expectedPerformance) {
      console.log(`[AI Analyzer] Expected performance predicted (confidence: ${expectedPerformance.confidence})`);
    }
    
    // Step 2: Evaluation (with expected performance comparison)
    const evaluation = await evaluatePerformance(workout, dataAnalysis, expectedPerformance);
    
    // Step 3: Final Analysis (incorporating expected vs actual)
    const finalAnalysis = await generateFinalAnalysis(workout, dataAnalysis, evaluation, expectedPerformance);
    
    // Combine all results
    const result: AIAnalysis = {
      overallScore: Math.min(10, Math.max(1, finalAnalysis.overallScore)),
      performanceSummary: finalAnalysis.performanceSummary,
      strengths: evaluation.strengths.slice(0, 5),
      areasForImprovement: evaluation.areasForImprovement.slice(0, 5),
      trainingRecommendations: finalAnalysis.trainingRecommendations.slice(0, 5),
      heartRateAnalysis: dataAnalysis.heartRateAnalysis,
      paceAnalysis: dataAnalysis.paceAnalysis,
      recoveryAdvice: finalAnalysis.recoveryAdvice,
    };
    
    console.log('[AI Analyzer] 4-step analysis completed successfully');
    return result;
  } catch (error: any) {
    console.error("[AI Analyzer] Error in multi-step analysis:", error);
    console.error("[AI Analyzer] Error details - status:", error?.status, "code:", error?.code, "type:", error?.type);
    console.error("[AI Analyzer] Error message:", error?.message);
    
    // Return fallback analysis on error
    const errorMessage = error?.message || String(error);
    const isQuotaError = errorMessage.toLowerCase().includes('quota') || 
                        errorMessage.toLowerCase().includes('rate limit') ||
                        errorMessage.toLowerCase().includes('クォーター') ||
                        errorMessage.toLowerCase().includes('レート制限');
    
    return {
      overallScore: 7,
      performanceSummary: isQuotaError 
        ? "AI分析の使用量制限に達しました。しばらく時間をおいてから再度お試しください。ワークアウトデータは正常に保存されています。"
        : "AI分析が一時的に利用できません。ワークアウトデータは正常に保存されています。",
      strengths: ["ワークアウトを完了しました"],
      areasForImprovement: isQuotaError 
        ? ["しばらく時間をおいてから、詳細な分析を再度お試しください"]
        : ["後ほど詳細な分析をお試しください"],
      trainingRecommendations: ["継続的なトレーニングを心がけてください"],
      heartRateAnalysis: "データは記録されています",
      paceAnalysis: "データは記録されています",
      recoveryAdvice: "適切な休息と水分補給を心がけてください。",
    };
  }
}
