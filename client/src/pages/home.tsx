import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Activity, BarChart3, Sparkles, Clock, Heart, MapPin } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButtons } from "@/components/auth-buttons";
import { AppFooter } from "@/components/app-footer";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const [, setLocation] = useLocation();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [error, setError] = useState<string>();
  const { user } = useAuth();

  // Check for shared file on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('shared') === 'true') {
      // Remove the query parameter
      window.history.replaceState({}, '', '/');
      
      // Retrieve shared file from cache
      (async () => {
        try {
          const cache = await caches.open('fit-analyzer-v2');
          const response = await cache.match('/shared-file');
          
          if (response) {
            const blob = await response.blob();
            const fileName = response.headers.get('X-File-Name') || 'shared.fit';
            const file = new File([blob], fileName, { type: 'application/octet-stream' });
            
            // Clean up cache
            await cache.delete('/shared-file');
            
            // Upload the file
            handleFileSelect(file);
          }
        } catch (err) {
          console.error('Failed to retrieve shared file:', err);
          setError('共有ファイルの取得に失敗しました');
        }
      })();
    }
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      setProgressMessage("FITファイルを解析中...");
      setUploadProgress(10);
      
      // Simulate progress with step messages
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed < 3000) {
          // 0-3秒: データ分析
          setProgressMessage("ステップ1/3: データ分析中（ペース・心拍数・履歴）...");
          setUploadProgress(10 + (elapsed / 3000) * 25);
        } else if (elapsed < 6000) {
          // 3-6秒: 評価生成
          setProgressMessage("ステップ2/3: 評価生成中（強み・改善点）...");
          setUploadProgress(35 + ((elapsed - 3000) / 3000) * 30);
        } else if (elapsed < 9000) {
          // 6-9秒: 総合評価
          setProgressMessage("ステップ3/3: 総合評価とアドバイス生成中...");
          setUploadProgress(65 + ((elapsed - 6000) / 3000) * 25);
        } else {
          // 9秒以上: 完了待ち
          setProgressMessage("最終処理中...");
          setUploadProgress(Math.min(95, 90 + ((elapsed - 9000) / 3000) * 5));
        }
      }, 100);
      
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });
        
        clearInterval(progressInterval);
        setProgressMessage("AI分析完了");
        setUploadProgress(100);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "ファイルの解析に失敗しました");
        }
        
        return response.json();
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      setUploadProgress(100);
      setProgressMessage("完了");
      sessionStorage.setItem("analysisResult", JSON.stringify(data));
      setTimeout(() => setLocation("/analysis"), 500);
    },
    onError: (err: Error) => {
      setError(err.message);
      setUploadProgress(0);
      setProgressMessage("");
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    setError(undefined);
    setUploadProgress(0);
    setProgressMessage("");
    uploadMutation.mutate(file);
  }, [uploadMutation]);

  const features = [
    {
      icon: BarChart3,
      title: "詳細な解析",
      description: "心拍数、ペース、標高、パワーなど全てのメトリクスを可視化",
    },
    {
      icon: Sparkles,
      title: "AI評価",
      description: "AIがワークアウトを分析し、パフォーマンスを10段階で評価",
    },
    {
      icon: Activity,
      title: "トレーニング推奨",
      description: "強み・改善点を特定し、次のトレーニングをアドバイス",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">FIT Analyzer</span>
          </div>
          <div className="flex items-center gap-2">
            <AuthButtons />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              AIでワークアウトを
              <span className="text-primary">分析</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              FITファイルをアップロードするだけで、AIがあなたのトレーニングを
              詳細に分析し、パフォーマンス向上のためのアドバイスを提供します。
            </p>
          </div>

          <FileUpload
            onFileSelect={handleFileSelect}
            isUploading={uploadMutation.isPending}
            uploadProgress={uploadProgress}
            progressMessage={progressMessage}
            error={error}
          />

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="p-6 text-center"
                data-testid={`card-feature-${index}`}
              >
                <div className="inline-flex p-3 rounded-lg bg-primary/10 mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Clock, label: "タイム分析", value: "経過時間・ラップ" },
              { icon: Heart, label: "心拍ゾーン", value: "トレーニング強度" },
              { icon: MapPin, label: "距離・標高", value: "ルート解析" },
              { icon: Sparkles, label: "AI評価", value: "10段階スコア" },
            ].map((stat, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-4 rounded-lg bg-muted/50"
              >
                <stat.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
