import FitParser from "fit-file-parser";
import OpenAI from "openai";

interface Env {
  OPENAI_API_KEY: string;
}

interface WorkoutSummary {
  sport: string;
  subSport?: string;
  startTime: string;
  totalElapsedTime: number;
  totalTimerTime: number;
  totalDistance: number;
  totalCalories?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  avgCadence?: number;
  maxCadence?: number;
  avgPower?: number;
  maxPower?: number;
  totalAscent?: number;
  totalDescent?: number;
  minAltitude?: number;
  maxAltitude?: number;
}

interface WorkoutRecord {
  timestamp: string;
  heartRate?: number;
  speed?: number;
  distance?: number;
  altitude?: number;
  cadence?: number;
  power?: number;
  temperature?: number;
  latitude?: number;
  longitude?: number;
}

interface Lap {
  startTime: string;
  totalElapsedTime: number;
  totalDistance: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  avgCadence?: number;
  avgPower?: number;
}

interface WorkoutData {
  id: string;
  fileName: string;
  summary: WorkoutSummary;
  laps: Lap[];
  records: WorkoutRecord[];
  deviceInfo?: {
    manufacturer?: string;
    product?: string;
    serialNumber?: string;
  };
}

interface AIAnalysis {
  overallScore: number;
  performanceSummary: string;
  strengths: string[];
  areasForImprovement: string[];
  trainingRecommendations: string[];
  heartRateAnalysis?: string;
  paceAnalysis?: string;
  recoveryAdvice: string;
}

interface FitRecord {
  timestamp?: Date;
  heart_rate?: number;
  speed?: number;
  distance?: number;
  altitude?: number;
  cadence?: number;
  power?: number;
  temperature?: number;
  position_lat?: number;
  position_long?: number;
}

interface FitLap {
  start_time?: Date;
  total_elapsed_time?: number;
  total_distance?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_cadence?: number;
  avg_power?: number;
}

interface FitSession {
  sport?: string;
  sub_sport?: string;
  start_time?: Date;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  total_calories?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_cadence?: number;
  max_cadence?: number;
  avg_power?: number;
  max_power?: number;
  total_ascent?: number;
  total_descent?: number;
  min_altitude?: number;
  max_altitude?: number;
}

interface FitDeviceInfo {
  manufacturer?: string;
  product?: string | number;
  serial_number?: number;
}

interface FitData {
  records?: FitRecord[];
  laps?: FitLap[];
  sessions?: FitSession[];
  device_infos?: FitDeviceInfo[];
}

async function parseFitFile(buffer: ArrayBuffer | Buffer | Uint8Array, fileName: string): Promise<WorkoutData> {
  const fitParser = new FitParser({
    force: true,
    speedUnit: "m/s",
    lengthUnit: "m",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
    mode: "list",
  });

  const data = await fitParser.parseAsync(buffer) as unknown as FitData;
  return transformFitData(data, fileName);
}

function transformFitData(data: FitData, fileName: string): WorkoutData {
  const session = data.sessions?.[0];
  const records = data.records || [];
  const laps = data.laps || [];
  const deviceInfo = data.device_infos?.[0];

  if (!session) {
    throw new Error("No session data found in FIT file");
  }

  const summary: WorkoutSummary = {
    sport: session.sport || "generic",
    subSport: session.sub_sport,
    startTime: session.start_time?.toISOString() || new Date().toISOString(),
    totalElapsedTime: session.total_elapsed_time || 0,
    totalTimerTime: session.total_timer_time || session.total_elapsed_time || 0,
    totalDistance: session.total_distance || 0,
    totalCalories: session.total_calories,
    avgHeartRate: session.avg_heart_rate,
    maxHeartRate: session.max_heart_rate,
    avgSpeed: session.avg_speed,
    maxSpeed: session.max_speed,
    avgCadence: session.avg_cadence,
    maxCadence: session.max_cadence,
    avgPower: session.avg_power,
    maxPower: session.max_power,
    totalAscent: session.total_ascent,
    totalDescent: session.total_descent,
    minAltitude: session.min_altitude,
    maxAltitude: session.max_altitude,
  };

  const transformedRecords: WorkoutRecord[] = records.map((record) => ({
    timestamp: record.timestamp?.toISOString() || new Date().toISOString(),
    heartRate: record.heart_rate,
    speed: record.speed,
    distance: record.distance,
    altitude: record.altitude,
    cadence: record.cadence,
    power: record.power,
    temperature: record.temperature,
    latitude: record.position_lat,
    longitude: record.position_long,
  }));

  const transformedLaps: Lap[] = laps.map((lap) => ({
    startTime: lap.start_time?.toISOString() || new Date().toISOString(),
    totalElapsedTime: lap.total_elapsed_time || 0,
    totalDistance: lap.total_distance || 0,
    avgHeartRate: lap.avg_heart_rate,
    maxHeartRate: lap.max_heart_rate,
    avgSpeed: lap.avg_speed,
    maxSpeed: lap.max_speed,
    avgCadence: lap.avg_cadence,
    avgPower: lap.avg_power,
  }));

  return {
    id: crypto.randomUUID(),
    fileName,
    summary,
    laps: transformedLaps,
    records: transformedRecords,
    deviceInfo: deviceInfo ? {
      manufacturer: deviceInfo.manufacturer,
      product: deviceInfo.product?.toString(),
      serialNumber: deviceInfo.serial_number?.toString(),
    } : undefined,
  };
}

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

function calculateHeartRateVariation(records: WorkoutRecord[]): string {
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

function calculatePaceConsistency(laps: Lap[]): string {
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

async function analyzeWorkout(workout: WorkoutData, apiKey: string): Promise<AIAnalysis> {
  const openai = new OpenAI({ apiKey });
  const { summary, laps, records } = workout;
  
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
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const analysis = JSON.parse(content) as AIAnalysis;
  
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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const contentType = context.request.headers.get("content-type") || "";
    
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "multipart/form-data形式で送信してください" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await context.request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "ファイルがアップロードされていません" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!file.name.toLowerCase().endsWith(".fit")) {
      return new Response(JSON.stringify({ error: ".fitファイルのみアップロード可能です" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = typeof Buffer !== 'undefined' 
      ? Buffer.from(arrayBuffer) 
      : new Uint8Array(arrayBuffer);

    let workoutData: WorkoutData;
    try {
      workoutData = await parseFitFile(buffer, file.name);
    } catch (parseError) {
      console.error("FIT parse error:", parseError);
      return new Response(JSON.stringify({ 
        error: "FITファイルの解析に失敗しました。ファイルが破損していないか確認してください。" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let aiAnalysis: AIAnalysis;
    try {
      aiAnalysis = await analyzeWorkout(workoutData, context.env.OPENAI_API_KEY);
    } catch (aiError) {
      console.error("AI analysis error:", aiError);
      aiAnalysis = {
        overallScore: 7,
        performanceSummary: "AIによる分析が一時的に利用できません。ワークアウトデータは正常に解析されました。",
        strengths: ["ワークアウトを完了しました"],
        areasForImprovement: ["詳細なAI分析は後ほどお試しください"],
        trainingRecommendations: ["継続的なトレーニングを心がけてください"],
        recoveryAdvice: "適切な休息を取り、次のワークアウトに備えてください。",
      };
    }

    return new Response(JSON.stringify({
      workout: workoutData,
      aiAnalysis,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(JSON.stringify({ error: "ワークアウトの解析中にエラーが発生しました" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
