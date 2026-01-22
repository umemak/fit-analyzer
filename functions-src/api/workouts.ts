interface Env {
  DB: D1Database;
}

interface WorkoutRow {
  id: string;
  user_id: string;
  file_name: string;
  sport: string | null;
  start_time: string | null;
  total_distance: number | null;
  total_time: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_pace: number | null;
  total_calories: number | null;
  total_ascent: number | null;
  total_descent: number | null;
  avg_power: number | null;
  workout_data: string | null;
  created_at: string;
}

interface AIAnalysisRow {
  id: string;
  workout_id: string;
  overall_score: number | null;
  summary: string | null;
  strengths: string | null;
  improvements: string | null;
  recommendations: string | null;
  detailed_analysis: string | null;
  created_at: string;
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

async function getUser(context: EventContext<Env, string, unknown>): Promise<{ id: string } | null> {
  const sessionId = getCookie(context.request.headers.get('Cookie'), 'session');
  if (!sessionId) return null;

  const session = await context.env.DB.prepare(
    'SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime("now")'
  ).bind(sessionId).first<{ user_id: string }>();

  return session ? { id: session.user_id } : null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await getUser(context);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '認証が必要です' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(context.request.url);
    const workoutId = url.searchParams.get('id');

    if (workoutId) {
      const workout = await context.env.DB.prepare(
        'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
      ).bind(workoutId, user.id).first<WorkoutRow>();

      if (!workout) {
        return new Response(JSON.stringify({ error: 'ワークアウトが見つかりません' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const aiAnalysis = await context.env.DB.prepare(
        'SELECT * FROM ai_analyses WHERE workout_id = ?'
      ).bind(workoutId).first<AIAnalysisRow>();

      return new Response(JSON.stringify({
        workout: {
          ...workout,
          workout_data: workout.workout_data ? JSON.parse(workout.workout_data) : null,
        },
        aiAnalysis: aiAnalysis ? {
          overallScore: aiAnalysis.overall_score,
          performanceSummary: aiAnalysis.summary,
          strengths: aiAnalysis.strengths ? JSON.parse(aiAnalysis.strengths) : [],
          areasForImprovement: aiAnalysis.improvements ? JSON.parse(aiAnalysis.improvements) : [],
          trainingRecommendations: aiAnalysis.recommendations ? JSON.parse(aiAnalysis.recommendations) : [],
          heartRateAnalysis: aiAnalysis.detailed_analysis ? JSON.parse(aiAnalysis.detailed_analysis).heartRateAnalysis : undefined,
          paceAnalysis: aiAnalysis.detailed_analysis ? JSON.parse(aiAnalysis.detailed_analysis).paceAnalysis : undefined,
          recoveryAdvice: aiAnalysis.detailed_analysis ? JSON.parse(aiAnalysis.detailed_analysis).recoveryAdvice : undefined,
        } : null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const workouts = await context.env.DB.prepare(
      `SELECT w.id, w.file_name, w.sport, w.start_time, w.total_distance, w.total_time, 
              w.avg_heart_rate, w.avg_pace, w.total_calories, w.created_at,
              a.overall_score
       FROM workouts w
       LEFT JOIN ai_analyses a ON w.id = a.workout_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC
       LIMIT 50`
    ).bind(user.id).all<WorkoutRow & { overall_score: number | null }>();

    return new Response(JSON.stringify({ workouts: workouts.results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Workouts fetch error:', error);
    return new Response(JSON.stringify({ error: 'データ取得に失敗しました' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const user = await getUser(context);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '認証が必要です' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(context.request.url);
    const workoutId = url.searchParams.get('id');

    if (!workoutId) {
      return new Response(JSON.stringify({ error: 'ワークアウトIDが必要です' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await context.env.DB.prepare(
      'DELETE FROM workouts WHERE id = ? AND user_id = ?'
    ).bind(workoutId, user.id).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Workout delete error:', error);
    return new Response(JSON.stringify({ error: '削除に失敗しました' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
