import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Activity, BarChart3, Sparkles, Clock, Heart, MapPin } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [, setLocation] = useLocation();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      setUploadProgress(10);
      
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      
      setUploadProgress(90);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "ファイルの解析に失敗しました");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setUploadProgress(100);
      sessionStorage.setItem("analysisResult", JSON.stringify(data));
      setLocation("/analysis");
    },
    onError: (err: Error) => {
      setError(err.message);
      setUploadProgress(0);
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    setError(undefined);
    setUploadProgress(0);
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
          <ThemeToggle />
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

      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>COROS、Garmin、Polar、Suuntoなど主要なスポーツウォッチのFITファイルに対応</p>
        </div>
      </footer>
    </div>
  );
}
