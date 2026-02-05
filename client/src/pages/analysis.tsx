import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { 
  Activity, 
  Clock, 
  Heart, 
  MapPin, 
  TrendingUp, 
  Flame, 
  Mountain, 
  ArrowLeft,
  Download,
  Zap
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppFooter } from "@/components/app-footer";
import { MetricCard } from "@/components/metric-card";
import { WorkoutCharts } from "@/components/workout-charts";
import { AIAnalysisPanel } from "@/components/ai-analysis-panel";
import { LapTable } from "@/components/lap-table";
import { RouteMap } from "@/components/route-map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalysisResponse } from "@shared/schema";

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatPace(speedMps: number | undefined): string {
  if (!speedMps || speedMps === 0) return "-";
  const paceSecsPerKm = 1000 / speedMps;
  const mins = Math.floor(paceSecsPerKm / 60);
  const secs = Math.floor(paceSecsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getSportLabel(sport: string): string {
  const sportMap: Record<string, string> = {
    running: "ランニング",
    cycling: "サイクリング",
    swimming: "スイミング",
    walking: "ウォーキング",
    hiking: "ハイキング",
    trail_running: "トレイルランニング",
    open_water_swimming: "オープンウォーター",
    generic: "その他",
  };
  return sportMap[sport.toLowerCase()] || sport;
}

export default function Analysis() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let completed = false;
    
    async function loadData() {
      // Set a timeout to catch hanging requests
      timeoutId = setTimeout(() => {
        if (!completed) {
          setError("データの読み込みがタイムアウトしました");
          setIsLoading(false);
        }
      }, 15000); // 15 seconds timeout
      
      if (params.id) {
        try {
          setDebugInfo(`Fetching workout ID: ${params.id}`);
          const response = await fetch(`/api/workouts?id=${params.id}`);
          setDebugInfo(`Response status: ${response.status}`);
          
          if (response.ok) {
            const result = await response.json();
            setDebugInfo(`Result keys: ${Object.keys(result).join(', ')}`);
            
            if (result.workout && result.aiAnalysis) {
              const workoutData = result.workout.workout_data;
              setDebugInfo(`workout_data type: ${typeof workoutData}, has data: ${!!workoutData}`);
              
              if (workoutData) {
                setDebugInfo(`workout_data keys: ${Object.keys(workoutData).join(', ')}`);
                setData({
                  workout: workoutData,
                  aiAnalysis: result.aiAnalysis,
                });
                completed = true;
                clearTimeout(timeoutId);
              } else {
                setError(`ワークアウトデータが見つかりません (workout_data is ${workoutData})`);
              }
            } else {
              setError(`レスポンス構造エラー: workout=${!!result.workout}, aiAnalysis=${!!result.aiAnalysis}`);
            }
          } else {
            const errorText = await response.text();
            setError(`データの取得に失敗しました (${response.status}): ${errorText}`);
          }
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          setError(`データの取得中にエラーが発生しました: ${errorMessage}`);
        }
      } else {
        const stored = sessionStorage.getItem("analysisResult");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setData(parsed);
            completed = true;
            clearTimeout(timeoutId);
          } catch (e) {
            setError("セッションストレージの解析に失敗しました");
          }
        } else {
          setError("セッションストレージにデータがありません");
        }
      }
      setIsLoading(false);
    }
    
    loadData();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-lg text-muted-foreground">データを読み込んでいます...</p>
            {params.id && (
              <p className="text-sm text-muted-foreground mt-2">
                Workout ID: {params.id}
              </p>
            )}
          </div>
          <Skeleton className="h-14 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-72" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{error || "解析データがありません"}</h2>
          {debugInfo && (
            <div className="mb-4 p-4 bg-muted rounded-lg text-left">
              <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                {debugInfo}
              </p>
            </div>
          )}
          <p className="text-muted-foreground mb-4">FITファイルをアップロードしてください</p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            ホームに戻る
          </Button>
        </div>
      </div>
    );
  }

  const { workout, aiAnalysis } = data;
  const { summary, laps, records } = workout;

  // Debug: Check if GPS data exists
  const gpsRecordsCount = records?.filter(r => r.latitude && r.longitude).length || 0;
  console.log('Total records:', records?.length, 'GPS records:', gpsRecordsCount);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">FIT Analyzer</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" data-testid="badge-sport">
              {getSportLabel(summary.sport)}
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-filename">
                {workout.fileName}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(summary.startTime).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {workout.deviceInfo?.manufacturer && (
              <Badge variant="outline">
                {workout.deviceInfo.manufacturer}
                {workout.deviceInfo.product && ` - ${workout.deviceInfo.product}`}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="距離"
              value={(summary.totalDistance / 1000).toFixed(2)}
              unit="km"
              icon={MapPin}
            />
            <MetricCard
              title="時間"
              value={formatDuration(summary.totalTimerTime)}
              icon={Clock}
              description={
                summary.totalTimerTime !== summary.totalElapsedTime
                  ? `経過: ${formatDuration(summary.totalElapsedTime)}`
                  : undefined
              }
            />
            <MetricCard
              title="平均ペース"
              value={formatPace(summary.avgSpeed)}
              unit="/km"
              icon={TrendingUp}
            />
            <MetricCard
              title="平均心拍"
              value={summary.avgHeartRate ? Math.round(summary.avgHeartRate) : "-"}
              unit={summary.avgHeartRate ? "bpm" : ""}
              icon={Heart}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summary.totalCalories && (
              <MetricCard
                title="カロリー"
                value={Math.round(summary.totalCalories)}
                unit="kcal"
                icon={Flame}
              />
            )}
            {summary.totalAscent && (
              <MetricCard
                title="獲得標高"
                value={Math.round(summary.totalAscent)}
                unit="m"
                icon={Mountain}
              />
            )}
            {summary.maxHeartRate && (
              <MetricCard
                title="最大心拍"
                value={Math.round(summary.maxHeartRate)}
                unit="bpm"
                icon={Heart}
              />
            )}
            {summary.avgPower && (
              <MetricCard
                title="平均パワー"
                value={Math.round(summary.avgPower)}
                unit="W"
                icon={Zap}
              />
            )}
          </div>

          {/* Temporarily disabled RouteMap due to Leaflet issues */}
          {/* {records && records.length > 0 && <RouteMap records={records} />} */}

          <div className="grid lg:grid-cols-2 gap-6">
            <WorkoutCharts records={records} />
            <AIAnalysisPanel analysis={aiAnalysis} isLoading={false} />
          </div>

          <LapTable laps={laps} />
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
}
