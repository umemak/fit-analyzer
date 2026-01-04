import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sparkles, TrendingUp, AlertTriangle, Target, Heart, Activity } from "lucide-react";
import type { AIAnalysis } from "@shared/schema";

interface AIAnalysisPanelProps {
  analysis: AIAnalysis | null;
  isLoading: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 8) return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
  if (score >= 6) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
  return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
}

function getScoreLabel(score: number): string {
  if (score >= 9) return "優秀";
  if (score >= 8) return "良好";
  if (score >= 6) return "普通";
  if (score >= 4) return "要改善";
  return "要注意";
}

export function AIAnalysisPanel({ analysis, isLoading }: AIAnalysisPanelProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="text-lg font-semibold">AI分析中...</h3>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <Card className="p-6" data-testid="panel-ai-analysis">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">AIトレーニング評価</h3>
        </div>
        <div className={`px-4 py-2 rounded-lg border ${getScoreColor(analysis.overallScore)}`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold" data-testid="text-overall-score">
              {analysis.overallScore}
            </span>
            <span className="text-sm">/10</span>
          </div>
          <p className="text-xs mt-0.5">{getScoreLabel(analysis.overallScore)}</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm leading-relaxed" data-testid="text-performance-summary">
          {analysis.performanceSummary}
        </p>
      </div>

      <Accordion type="multiple" defaultValue={["strengths", "improvements", "recommendations"]} className="space-y-2">
        <AccordionItem value="strengths" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-medium">強み</span>
              <Badge variant="secondary" className="ml-2">
                {analysis.strengths.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <ul className="space-y-2">
              {analysis.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">+</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="improvements" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="font-medium">改善点</span>
              <Badge variant="secondary" className="ml-2">
                {analysis.areasForImprovement.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <ul className="space-y-2">
              {analysis.areasForImprovement.map((area, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">!</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="recommendations" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-medium">トレーニング推奨事項</span>
              <Badge variant="secondary" className="ml-2">
                {analysis.trainingRecommendations.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <ul className="space-y-2">
              {analysis.trainingRecommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">{index + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        {analysis.heartRateAnalysis && (
          <AccordionItem value="heartRate" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="font-medium">心拍数分析</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-sm">{analysis.heartRateAnalysis}</p>
            </AccordionContent>
          </AccordionItem>
        )}

        {analysis.paceAnalysis && (
          <AccordionItem value="pace" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="font-medium">ペース分析</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-sm">{analysis.paceAnalysis}</p>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-lg">
        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
          <Heart className="h-4 w-4" />
          リカバリーアドバイス
        </h4>
        <p className="text-sm text-muted-foreground" data-testid="text-recovery-advice">
          {analysis.recoveryAdvice}
        </p>
      </div>
    </Card>
  );
}
