import FitParser from "fit-file-parser";
import { randomUUID } from "crypto";
import type { WorkoutData, WorkoutRecord, Lap, WorkoutSummary } from "@shared/schema";

interface FitRecord {
  timestamp?: Date;
  heart_rate?: number;
  speed?: number;
  distance?: number;
  altitude?: number;
  cadence?: number;
  power?: number;
  temperature?: number;
  position_lat?: number;
  position_long?: number;
}

interface FitLap {
  start_time?: Date;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_cadence?: number;
  avg_power?: number;
}

interface FitSession {
  sport?: string;
  sub_sport?: string;
  start_time?: Date;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  total_calories?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_cadence?: number;
  max_cadence?: number;
  avg_power?: number;
  max_power?: number;
  total_ascent?: number;
  total_descent?: number;
  min_altitude?: number;
  max_altitude?: number;
}

interface FitDeviceInfo {
  manufacturer?: string;
  product?: string | number;
  serial_number?: number;
}

interface FitData {
  records?: FitRecord[];
  laps?: FitLap[];
  sessions?: FitSession[];
  device_infos?: FitDeviceInfo[];
}

export async function parseFitFile(buffer: Buffer, fileName: string): Promise<WorkoutData> {
  const fitParser = new FitParser({
    force: true,
    speedUnit: "m/s",
    lengthUnit: "m",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
    mode: "list",
  });

  const data = await fitParser.parseAsync(buffer) as unknown as FitData;
  console.log("FIT data parsed, sessions:", data.sessions?.length, "records:", data.records?.length);
  return transformFitData(data, fileName);
}

function transformFitData(data: FitData, fileName: string): WorkoutData {
  const session = data.sessions?.[0];
  const records = data.records || [];
  const laps = data.laps || [];
  const deviceInfo = data.device_infos?.[0];

  if (!session) {
    throw new Error("No session data found in FIT file");
  }

  // Calculate avgSpeed based on totalTimerTime (excluding pause time)
  const totalTimerTime = session.total_timer_time || session.total_elapsed_time || 0;
  const totalDistance = session.total_distance || 0;
  const avgSpeedFromTimer = totalTimerTime > 0 && totalDistance > 0 
    ? totalDistance / totalTimerTime 
    : session.avg_speed;

  console.log('[FIT Parser] Time calculation:', {
    totalElapsedTime: session.total_elapsed_time,
    totalTimerTime: totalTimerTime,
    pauseTime: (session.total_elapsed_time || 0) - totalTimerTime,
    totalDistance: totalDistance,
    avgSpeedOriginal: session.avg_speed,
    avgSpeedRecalculated: avgSpeedFromTimer,
  });

  const summary: WorkoutSummary = {
    sport: session.sport || "generic",
    subSport: session.sub_sport,
    startTime: session.start_time?.toISOString() || new Date().toISOString(),
    totalElapsedTime: session.total_elapsed_time || 0,
    totalTimerTime: totalTimerTime,
    totalDistance: totalDistance,
    totalCalories: session.total_calories,
    avgHeartRate: session.avg_heart_rate,
    maxHeartRate: session.max_heart_rate,
    avgSpeed: avgSpeedFromTimer, // Use timer-based speed for accurate pace
    maxSpeed: session.max_speed,
    avgCadence: session.avg_cadence,
    maxCadence: session.max_cadence,
    avgPower: session.avg_power,
    maxPower: session.max_power,
    totalAscent: session.total_ascent,
    totalDescent: session.total_descent,
    minAltitude: session.min_altitude,
    maxAltitude: session.max_altitude,
  };

  const transformedRecords: WorkoutRecord[] = records.map((record) => ({
    timestamp: record.timestamp?.toISOString() || new Date().toISOString(),
    heartRate: record.heart_rate,
    speed: record.speed,
    distance: record.distance,
    altitude: record.altitude,
    cadence: record.cadence,
    power: record.power,
    temperature: record.temperature,
    latitude: record.position_lat,
    longitude: record.position_long,
  }));

  const transformedLaps: Lap[] = laps.map((lap) => {
    // Recalculate avgSpeed based on timer_time if available
    const lapTimerTime = lap.total_timer_time || lap.total_elapsed_time || 0;
    const lapDistance = lap.total_distance || 0;
    const lapAvgSpeed = lapTimerTime > 0 && lapDistance > 0
      ? lapDistance / lapTimerTime
      : lap.avg_speed;

    return {
      startTime: lap.start_time?.toISOString() || new Date().toISOString(),
      totalElapsedTime: lap.total_elapsed_time || 0,
      totalDistance: lapDistance,
      avgHeartRate: lap.avg_heart_rate,
      maxHeartRate: lap.max_heart_rate,
      avgSpeed: lapAvgSpeed, // Use timer-based speed
      maxSpeed: lap.max_speed,
      avgCadence: lap.avg_cadence,
      avgPower: lap.avg_power,
    };
  });

  return {
    id: randomUUID(),
    fileName,
    summary,
    laps: transformedLaps,
    records: transformedRecords,
    deviceInfo: deviceInfo ? {
      manufacturer: deviceInfo.manufacturer,
      product: deviceInfo.product?.toString(),
      serialNumber: deviceInfo.serial_number?.toString(),
    } : undefined,
  };
}
