import { randomUUID } from "crypto";
import type { WorkoutData, AIAnalysis, AnalysisResponse } from "@shared/schema";

export interface IStorage {
  saveAnalysis(workout: WorkoutData, analysis: AIAnalysis): Promise<AnalysisResponse>;
  getAnalysis(id: string): Promise<AnalysisResponse | undefined>;
  getAllAnalyses(): Promise<AnalysisResponse[]>;
}

export class MemStorage implements IStorage {
  private analyses: Map<string, AnalysisResponse>;

  constructor() {
    this.analyses = new Map();
  }

  async saveAnalysis(workout: WorkoutData, analysis: AIAnalysis): Promise<AnalysisResponse> {
    const result: AnalysisResponse = { workout, aiAnalysis: analysis };
    this.analyses.set(workout.id, result);
    return result;
  }

  async getAnalysis(id: string): Promise<AnalysisResponse | undefined> {
    return this.analyses.get(id);
  }

  async getAllAnalyses(): Promise<AnalysisResponse[]> {
    return Array.from(this.analyses.values());
  }
}

export const storage = new MemStorage();
