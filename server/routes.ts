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
  
  // Web Share Target API endpoint
  app.post("/share", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file provided");
      }

      // For development, we can't use Service Worker cache
      // Store in session or temporary storage
      // For now, redirect with file data in session storage (client-side)
      
      // Return HTML that stores file in sessionStorage and redirects
      const fileBase64 = req.file.buffer.toString('base64');
      const fileName = req.file.originalname;
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Processing shared file...</title>
          <meta charset="utf-8">
        </head>
        <body>
          <p>Processing shared file...</p>
          <script>
            (async () => {
              try {
                const fileData = '${fileBase64}';
                const fileName = '${fileName}';
                
                // Store in cache API
                const cache = await caches.open('fit-analyzer-v2');
                const blob = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
                const response = new Response(blob, {
                  headers: {
                    'Content-Type': 'application/octet-stream',
                    'X-File-Name': fileName
                  }
                });
                await cache.put('/shared-file', response);
                
                // Redirect to home
                window.location.href = '/?shared=true';
              } catch (err) {
                console.error('Failed to process shared file:', err);
                alert('ファイルの処理に失敗しました');
                window.location.href = '/';
              }
            })();
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Share error:", error);
      res.status(500).send("Failed to process shared file");
    }
  });
  
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
