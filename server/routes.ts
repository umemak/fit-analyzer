import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { parseFitFile } from "./fit-parser";
import { analyzeWorkout } from "./ai-analyzer";
import type { WorkoutData } from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.fit')) {
      cb(null, true);
    } else {
      cb(new Error('Only .fit files are allowed'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // FIT file analysis endpoint
  app.post("/api/analyze", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "ファイルがアップロードされていません" });
      }

      const fileName = req.file.originalname;
      const buffer = req.file.buffer;

      // Parse FIT file
      let workoutData: WorkoutData;
      try {
        workoutData = await parseFitFile(buffer, fileName);
      } catch (parseError) {
        console.error("FIT parse error:", parseError);
        return res.status(400).json({ 
          error: "FITファイルの解析に失敗しました。ファイルが破損していないか確認してください。" 
        });
      }

      // Generate AI analysis
      let aiAnalysis;
      let aiError = null;
      try {
        aiAnalysis = await analyzeWorkout(workoutData);
      } catch (aiError: any) {
        console.error("AI analysis error in routes:", aiError);
        
        // Extract error message
        const errorMessage = aiError?.message || '';
        
        // Always return workout data, but include error info in aiAnalysis
        aiAnalysis = {
          overallScore: 7,
          performanceSummary: errorMessage.includes('クォーター') || errorMessage.includes('レート制限') || errorMessage.includes('リクエスト制限')
            ? "AI分析の利用制限に達しました。ワークアウトデータは正常に記録されています。"
            : "AIによる分析が一時的に利用できません。ワークアウトデータは正常に解析されました。",
          strengths: ["ワークアウトを完了しました"],
          areasForImprovement: errorMessage.includes('クォーター') || errorMessage.includes('レート制限')
            ? ["しばらく時間をおいてから、詳細なAI分析をお試しください"]
            : ["詳細なAI分析は後ほどお試しください"],
          trainingRecommendations: ["継続的なトレーニングを心がけてください"],
          recoveryAdvice: "適切な休息を取り、次のワークアウトに備えてください。",
        };
      }

      res.json({
        workout: workoutData,
        aiAnalysis,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "ワークアウトの解析中にエラーが発生しました" });
    }
  });

  return httpServer;
}
