import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Timer, Route, Heart, Trash2, Activity, TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface WorkoutHistoryItem {
  id: string;
  file_name: string;
  sport: string | null;
  start_time: string | null;
  total_distance: number | null;
  total_time: number | null;
  avg_heart_rate: number | null;
  avg_pace: number | null;
  total_calories: number | null;
  created_at: string;
  overall_score: number | null;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatPace(paceMinPerKm: number): string {
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSportLabel(sport: string | null): string {
  const sportMap: Record<string, string> = {
    running: "ランニング",
    cycling: "サイクリング",
    swimming: "水泳",
    walking: "ウォーキング",
    hiking: "ハイキング",
    trail_running: "トレイルラン",
  };
  return sport ? sportMap[sport.toLowerCase()] || sport : "不明";
}

function getScoreColor(score: number): string {
  if (score >= 8) return "bg-green-500";
  if (score >= 6) return "bg-yellow-500";
  if (score >= 4) return "bg-orange-500";
  return "bg-red-500";
}

export default function History() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery<{ workouts: WorkoutHistoryItem[] }>({
    queryKey: ["/api/workouts"],
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      return apiRequest("DELETE", `/api/workouts?id=${workoutId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts"] });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
                戻る
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <Activity className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">ログインが必要です</h1>
          <p className="text-muted-foreground mb-6">
            ワークアウト履歴を表示するにはログインしてください
          </p>
          <Link href="/">
            <Button data-testid="button-go-login">ログインページへ</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
                戻る
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">ワークアウト履歴</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-destructive">データの取得に失敗しました</p>
          </div>
        ) : !data?.workouts?.length ? (
          <div className="text-center py-16">
            <Activity className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">履歴がありません</h2>
            <p className="text-muted-foreground mb-6">
              FITファイルをアップロードして最初のワークアウトを記録しましょう
            </p>
            <Link href="/">
              <Button data-testid="button-upload-first">FITファイルをアップロード</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.workouts.map((workout) => (
              <Card key={workout.id} className="relative group hover-elevate">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="secondary" className="mb-2">
                        {getSportLabel(workout.sport)}
                      </Badge>
                      <CardTitle className="text-base line-clamp-1">
                        {workout.file_name}
                      </CardTitle>
                    </div>
                    {workout.overall_score && (
                      <div
                        className={`flex items-center justify-center h-10 w-10 rounded-full text-white font-bold ${getScoreColor(workout.overall_score)}`}
                        data-testid={`score-${workout.id}`}
                      >
                        {workout.overall_score}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {workout.start_time && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(workout.start_time)}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {workout.total_distance && (
                        <div className="flex items-center gap-2">
                          <Route className="h-4 w-4 text-blue-500" />
                          {formatDistance(workout.total_distance)}
                        </div>
                      )}
                      {workout.total_time && (
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-green-500" />
                          {formatDuration(workout.total_time)}
                        </div>
                      )}
                      {workout.avg_heart_rate && (
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-red-500" />
                          {workout.avg_heart_rate} bpm
                        </div>
                      )}
                      {workout.avg_pace && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-purple-500" />
                          {formatPace(workout.avg_pace)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Link href={`/analysis/${workout.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-${workout.id}`}>
                        詳細を見る
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(workout.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${workout.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
