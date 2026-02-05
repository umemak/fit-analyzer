import { z } from "zod";

export const workoutRecordSchema = z.object({
  timestamp: z.string(),
  heartRate: z.number().optional(),
  speed: z.number().optional(),
  distance: z.number().optional(),
  altitude: z.number().optional(),
  cadence: z.number().optional(),
  power: z.number().optional(),
  temperature: z.number().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const lapSchema = z.object({
  startTime: z.string(),
  totalElapsedTime: z.number(),
  totalTimerTime: z.number(),
  totalDistance: z.number(),
  avgHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
  avgSpeed: z.number().optional(),
  maxSpeed: z.number().optional(),
  avgCadence: z.number().optional(),
  avgPower: z.number().optional(),
});

export const workoutSummarySchema = z.object({
  sport: z.string(),
  subSport: z.string().optional(),
  startTime: z.string(),
  totalElapsedTime: z.number(),
  totalTimerTime: z.number(),
  totalDistance: z.number(),
  totalCalories: z.number().optional(),
  avgHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
  avgSpeed: z.number().optional(),
  maxSpeed: z.number().optional(),
  avgCadence: z.number().optional(),
  maxCadence: z.number().optional(),
  avgPower: z.number().optional(),
  maxPower: z.number().optional(),
  totalAscent: z.number().optional(),
  totalDescent: z.number().optional(),
  minAltitude: z.number().optional(),
  maxAltitude: z.number().optional(),
});

export const workoutDataSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  summary: workoutSummarySchema,
  laps: z.array(lapSchema),
  records: z.array(workoutRecordSchema),
  deviceInfo: z.object({
    manufacturer: z.string().optional(),
    product: z.string().optional(),
    serialNumber: z.string().optional(),
  }).optional(),
});

export const aiAnalysisSchema = z.object({
  overallScore: z.number().min(1).max(10),
  performanceSummary: z.string(),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  trainingRecommendations: z.array(z.string()),
  heartRateAnalysis: z.string().optional(),
  paceAnalysis: z.string().optional(),
  recoveryAdvice: z.string(),
});

export type WorkoutRecord = z.infer<typeof workoutRecordSchema>;
export type Lap = z.infer<typeof lapSchema>;
export type WorkoutSummary = z.infer<typeof workoutSummarySchema>;
export type WorkoutData = z.infer<typeof workoutDataSchema>;
export type AIAnalysis = z.infer<typeof aiAnalysisSchema>;

export interface AnalysisResponse {
  workout: WorkoutData;
  aiAnalysis: AIAnalysis;
}

export const users = {
  id: "",
  username: "",
  password: "",
};

export type User = typeof users;
export type InsertUser = Omit<User, "id">;
