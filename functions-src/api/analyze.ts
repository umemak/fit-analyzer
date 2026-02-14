import FitParser from "fit-file-parser";
import OpenAI from "openai";

interface Env {
  AI: Ai;
  DB: D1Database;
  WORKOUT_DATA: R2Bucket;
  AI_PROVIDER?: string;  // "workers-ai" (default), "openai", or "groq"
  GROQ_API_KEY?: string;
  AI_INTEGRATIONS_OPENAI_API_KEY?: string;
  AI_INTEGRATIONS_OPENAI_BASE_URL?: string;
}

function getCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return value;
  }
  return null;
}

async function getRecentWorkouts(
  context: EventContext<Env, string, unknown>,
  userId: string,
  currentWorkoutStartTime: string,
  currentSport: string,
  limit: number = 5
): Promise<WorkoutHistory[]> {
  try {
    if (!context.env.DB) {
      console.log('[Get Recent Workouts] DB not available');
      return [];
    }

    console.log('[Get Recent Workouts] Fetching for user:', userId, 'sport:', currentSport, 'before:', currentWorkoutStartTime);

    // Get workouts that:
    // 1. Started BEFORE the current workout
    // 2. Are the SAME sport (for meaningful comparison)
    const results = await context.env.DB.prepare(
      `SELECT sport, start_time, total_distance, total_time, avg_pace, avg_heart_rate 
       FROM workouts 
       WHERE user_id = ? AND sport = ? AND start_time < ?
       ORDER BY start_time DESC 
       LIMIT ?`
    ).bind(userId, currentSport, currentWorkoutStartTime, limit).all();

    console.log('[Get Recent Workouts] Query returned:', results.results?.length || 0, 'workouts for sport:', currentSport);

    if (!results.results || results.results.length === 0) {
      return [];
    }

    return results.results.map((row: any) => ({
      date: row.start_time,
      sport: row.sport || 'unknown',
      distance: row.total_distance || 0,
      duration: row.total_time || 0,
      avgPace: row.avg_pace,
      avgHeartRate: row.avg_heart_rate,
    }));
  } catch (error) {
    console.error('[Get Recent Workouts] Error:', error);
    return [];
  }
}

async function getUser(context: EventContext<Env, string, unknown>): Promise<{ id: string } | null> {
  const sessionId = getCookie(context.request.headers.get('Cookie'), 'session');
  if (!sessionId) return null;

  try {
    const session = await context.env.DB.prepare(
      'SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime("now")'
    ).bind(sessionId).first<{ user_id: string }>();
    return session ? { id: session.user_id } : null;
  } catch {
    return null;
  }
}

async function saveWorkout(
  context: EventContext<Env, string, unknown>,
  userId: string,
  workoutData: WorkoutData,
  aiAnalysis: AIAnalysis
): Promise<void> {
  const workoutId = workoutData.id;
  
  // Save full workout data to R2
  const r2Key = `workouts/${userId}/${workoutId}.json`;
  let r2Success = false;
  
  if (context.env.WORKOUT_DATA) {
    try {
      await context.env.WORKOUT_DATA.put(
        r2Key,
        JSON.stringify(workoutData),
        {
          httpMetadata: {
            contentType: 'application/json',
          },
          customMetadata: {
            userId,
            workoutId,
            sport: workoutData.summary.sport,
            startTime: workoutData.summary.startTime,
          },
        }
      );
      r2Success = true;
      console.log('R2 save successful:', r2Key);
    } catch (r2Error) {
      console.error('R2 save error:', r2Error);
    }
  } else {
    console.warn('WORKOUT_DATA R2 bucket is not bound. Skipping R2 save.');
  }
  
  // Save metadata to D1
  // If R2 succeeded, save with r2_key. Otherwise, skip saving to avoid SQLITE_TOOBIG
  if (r2Success) {
    // Try with r2_key column (new schema)
    try {
      await context.env.DB.prepare(
        `INSERT INTO workouts (id, user_id, file_name, sport, start_time, total_distance, total_time, 
         avg_heart_rate, max_heart_rate, avg_pace, total_calories, total_ascent, total_descent, avg_power, r2_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        workoutId,
        userId,
        workoutData.fileName,
        workoutData.summary.sport,
        workoutData.summary.startTime,
        workoutData.summary.totalDistance,
        Math.round(workoutData.summary.totalElapsedTime),
        workoutData.summary.avgHeartRate || null,
        workoutData.summary.maxHeartRate || null,
        workoutData.summary.avgSpeed ? (1000 / workoutData.summary.avgSpeed / 60) : null,
        workoutData.summary.totalCalories || null,
        workoutData.summary.totalAscent || null,
        workoutData.summary.totalDescent || null,
        workoutData.summary.avgPower || null,
        r2Key
      ).run();
      console.log('D1 metadata saved with r2_key');
    } catch (d1Error: any) {
      console.error('D1 save error with r2_key:', d1Error);
      // Fallback: try old schema without r2_key, but with NULL workout_data
      try {
        await context.env.DB.prepare(
          `INSERT INTO workouts (id, user_id, file_name, sport, start_time, total_distance, total_time, 
           avg_heart_rate, max_heart_rate, avg_pace, total_calories, total_ascent, total_descent, avg_power, workout_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          workoutId,
          userId,
          workoutData.fileName,
          workoutData.summary.sport,
          workoutData.summary.startTime,
          workoutData.summary.totalDistance,
          Math.round(workoutData.summary.totalElapsedTime),
          workoutData.summary.avgHeartRate || null,
          workoutData.summary.maxHeartRate || null,
          workoutData.summary.avgSpeed ? (1000 / workoutData.summary.avgSpeed / 60) : null,
          workoutData.summary.totalCalories || null,
          workoutData.summary.totalAscent || null,
          workoutData.summary.totalDescent || null,
          workoutData.summary.avgPower || null,
          null  // workout_data = NULL, data is in R2
        ).run();
        console.log('D1 metadata saved with legacy schema (workout_data=NULL)');
      } catch (legacyError) {
        console.error('D1 save error with legacy schema:', legacyError);
        throw legacyError;  // Re-throw to be caught by outer catch
      }
    }
  } else {
    console.warn('Skipping D1 save because R2 save failed. Data would be too large for D1.');
    // Don't save to D1 if R2 failed, to avoid SQLITE_TOOBIG
  }

  await context.env.DB.prepare(
    `INSERT INTO ai_analyses (id, workout_id, overall_score, summary, strengths, improvements, recommendations, detailed_analysis)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    workoutId,
    aiAnalysis.overallScore,
    aiAnalysis.performanceSummary,
    JSON.stringify(aiAnalysis.strengths),
    JSON.stringify(aiAnalysis.areasForImprovement),
    JSON.stringify(aiAnalysis.trainingRecommendations),
    JSON.stringify({
      heartRateAnalysis: aiAnalysis.heartRateAnalysis,
      paceAnalysis: aiAnalysis.paceAnalysis,
      recoveryAdvice: aiAnalysis.recoveryAdvice,
    })
  ).run();
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

interface WorkoutHistory {
  date: string;
  sport: string;
  distance: number;
  duration: number;
  avgPace?: number;
  avgHeartRate?: number;
}

async function analyzeWorkout(
  workout: WorkoutData, 
  context: EventContext<Env, string, unknown>,
  recentWorkouts: WorkoutHistory[] = []
): Promise<AIAnalysis> {
  const { summary, laps, records } = workout;
  
  // Limit data sent to AI to avoid quota issues
  const maxLaps = 10;
  const limitedLaps = laps.slice(0, maxLaps);
  
  // Calculate statistics without sending all records
  const heartRateVariation = calculateHeartRateVariation(records);
  const paceConsistency = calculatePaceConsistency(laps);
  
  // Build history context
  let historyContext = '';
  let historyNote = '';
  if (recentWorkouts.length > 0) {
    const daysSinceLast = Math.floor((new Date().getTime() - new Date(recentWorkouts[0].date).getTime()) / (1000 * 60 * 60 * 24));
    const avgDistance = recentWorkouts.reduce((sum, w) => sum + w.distance, 0) / recentWorkouts.length / 1000;
    const currentDistance = summary.totalDistance / 1000;
    
    historyContext = `\n## 直近のワークアウト履歴
${recentWorkouts.slice(0, 3).map((w, i) => {
  const daysSince = Math.floor((new Date().getTime() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24));
  return `${i + 1}. ${daysSince}日前: ${(w.distance / 1000).toFixed(1)}km, ${formatDuration(w.duration)}`;
}).join('\n')}
前回からの日数: ${daysSinceLast}日
過去平均距離: ${avgDistance.toFixed(1)}km
今回距離: ${currentDistance.toFixed(1)}km (${currentDistance > avgDistance ? '+' : ''}${(currentDistance - avgDistance).toFixed(1)}km)\n`;
    
    historyNote = `履歴あり。前回から${daysSinceLast}日経過。performanceSummaryに必ず「前回から${daysSinceLast}日ぶり」「距離が${(currentDistance - avgDistance).toFixed(1)}km${currentDistance > avgDistance ? '増加' : '減少'}」など具体的比較を含めること。`;
  } else {
    historyNote = '初回記録。履歴なし。単体評価のみ。';
  }
  
  const prompt = `プロコーチとして分析。${historyNote}

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

## ラップ情報（最初の${maxLaps}ラップ）
${limitedLaps.map((lap, i) => `ラップ${i + 1}: ${(lap.totalDistance / 1000).toFixed(2)}km, ${formatDuration(lap.totalElapsedTime)}, ペース ${formatPace(lap.avgSpeed)}${lap.avgHeartRate ? `, HR ${Math.round(lap.avgHeartRate)}` : ''}`).join('\n')}
${laps.length > maxLaps ? `\n（全${laps.length}ラップ中、${maxLaps}ラップを表示）` : ''}

## 追加分析
- 心拍数変動: ${heartRateVariation}
- ペース一貫性: ${paceConsistency}
${historyContext}
以下のJSON形式で簡潔に回答してください:

{
  "overallScore": (1-10の整数),
  "performanceSummary": "(80-100文字で要約)",
  "strengths": ["強み1", "強み2", "強み3"],
  "areasForImprovement": ["改善点1", "改善点2"],
  "trainingRecommendations": ["推奨1", "推奨2", "推奨3"],
  "heartRateAnalysis": "(心拍数分析、50文字程度)",
  "paceAnalysis": "(ペース分析、50文字程度)",
  "recoveryAdvice": "(回復アドバイス、50文字程度)"
}`;

  const messages = [
    {
      role: "system" as const,
      content: "エンデュランススポーツコーチとして科学的に分析し、JSONで回答してください。",
    },
    {
      role: "user" as const,
      content: prompt,
    },
  ];

  // Determine AI provider
  const aiProvider = context.env.AI_PROVIDER || "workers-ai";
  console.log(`[AI Analyzer] Using AI provider: ${aiProvider}`);
  
  let content: string;
  
  if (aiProvider === "groq" && context.env.GROQ_API_KEY) {
    // Use Groq API via OpenAI SDK
    const groqClient = new OpenAI({
      apiKey: context.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
    
    console.log(`[AI Analyzer] Using Groq model: llama-3.1-8b-instant`);
    const groqResponse = await groqClient.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      response_format: { type: "json_object" },
      max_tokens: 1024,
    });
    
    content = groqResponse.choices[0].message.content || "{}";
  } else if (aiProvider === "openai" && context.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    // Use OpenAI API
    const openaiClient = new OpenAI({
      apiKey: context.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: context.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
    
    console.log(`[AI Analyzer] Using OpenAI model: gpt-4o`);
    const openaiResponse = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" },
      max_tokens: 1024,
    });
    
    content = openaiResponse.choices[0].message.content || "{}";
  } else {
    // Default to Cloudflare Workers AI
    console.log(`[AI Analyzer] Using Workers AI model: llama-3.1-70b-instruct`);
    const workersResponse = await context.env.AI.run("@cf/meta/llama-3.1-70b-instruct", {
      messages,
      max_tokens: 1024,
    }) as { response: string };
    
    content = workersResponse.response;
  }
  if (!content) {
    throw new Error("No response from AI");
  }

  // Extract JSON from response (handle cases where AI includes markdown code blocks)
  let jsonContent = content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonContent = jsonMatch[0];
  }

  const analysis = JSON.parse(jsonContent) as AIAnalysis;
  
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

    // Get user for history context (BEFORE saving current workout)
    const user = await getUser(context);
    const recentWorkouts = user 
      ? await getRecentWorkouts(context, user.id, workoutData.summary.startTime, workoutData.summary.sport, 5) 
      : [];
    
    console.log('[Analyze] User:', user ? `logged in (${user.id})` : 'not logged in');
    console.log('[Analyze] Recent workouts count:', recentWorkouts.length);
    if (recentWorkouts.length > 0) {
      console.log('[Analyze] Recent workouts:', recentWorkouts.map(w => ({
        date: w.date,
        distance: (w.distance / 1000).toFixed(1) + 'km',
        duration: Math.floor(w.duration / 60) + 'min'
      })));
    }

    let aiAnalysis: AIAnalysis;
    try {
      aiAnalysis = await analyzeWorkout(workoutData, context, recentWorkouts);
    } catch (aiError: any) {
      console.error("AI analysis error:", aiError);
      
      // Extract error message to provide better feedback
      const errorMessage = aiError?.message || '';
      
      aiAnalysis = {
        overallScore: 7,
        performanceSummary: errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('クォーター') || errorMessage.includes('レート制限')
          ? "AI分析の利用制限に達しました。ワークアウトデータは正常に記録されています。"
          : "AIによる分析が一時的に利用できません。ワークアウトデータは正常に解析されました。",
        strengths: ["ワークアウトを完了しました"],
        areasForImprovement: errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('クォーター') || errorMessage.includes('レート制限')
          ? ["しばらく時間をおいてから、詳細なAI分析をお試しください"]
          : ["詳細なAI分析は後ほどお試しください"],
        trainingRecommendations: ["継続的なトレーニングを心がけてください"],
        recoveryAdvice: "適切な休息を取り、次のワークアウトに備えてください。",
      };
    }

    let saved = false;
    if (user && context.env.DB) {
      try {
        await saveWorkout(context, user.id, workoutData, aiAnalysis);
        saved = true;
      } catch (saveError) {
        console.error("Save workout error:", saveError);
      }
    }

    return new Response(JSON.stringify({
      workout: workoutData,
      aiAnalysis,
      saved,
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
