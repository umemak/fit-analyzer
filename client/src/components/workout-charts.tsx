import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import type { WorkoutRecord } from "@shared/schema";

interface WorkoutChartsProps {
  records: WorkoutRecord[];
}

export function WorkoutCharts({ records }: WorkoutChartsProps) {
  const chartData = records
    .filter((_, i) => i % Math.max(1, Math.floor(records.length / 200)) === 0)
    .map((record, index) => ({
      time: index,
      heartRate: record.heartRate,
      speed: record.speed ? record.speed * 3.6 : undefined,
      altitude: record.altitude,
      cadence: record.cadence,
      power: record.power,
    }));

  const hasHeartRate = chartData.some((d) => d.heartRate);
  const hasSpeed = chartData.some((d) => d.speed);
  const hasAltitude = chartData.some((d) => d.altitude !== undefined);
  const hasPower = chartData.some((d) => d.power);

  return (
    <Card className="p-6">
      <Tabs defaultValue="heartRate" className="w-full">
        <TabsList className="mb-4">
          {hasHeartRate && <TabsTrigger value="heartRate" data-testid="tab-heartrate">心拍数</TabsTrigger>}
          {hasSpeed && <TabsTrigger value="pace" data-testid="tab-pace">ペース</TabsTrigger>}
          {hasAltitude && <TabsTrigger value="elevation" data-testid="tab-elevation">標高</TabsTrigger>}
          {hasPower && <TabsTrigger value="power" data-testid="tab-power">パワー</TabsTrigger>}
        </TabsList>

        {hasHeartRate && (
          <TabsContent value="heartRate" className="mt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={false} axisLine={false} />
                  <YAxis 
                    domain={["dataMin - 10", "dataMax + 10"]} 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(val) => `${val}`}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${Math.round(value)} bpm`, "心拍数"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="heartRate"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        )}

        {hasSpeed && (
          <TabsContent value="pace" className="mt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={false} axisLine={false} />
                  <YAxis 
                    domain={["dataMin - 1", "dataMax + 1"]} 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(val) => `${val.toFixed(1)}`}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)} km/h`, "速度"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="speed"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        )}

        {hasAltitude && (
          <TabsContent value="elevation" className="mt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={false} axisLine={false} />
                  <YAxis 
                    domain={["dataMin - 10", "dataMax + 10"]} 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(val) => `${Math.round(val)}m`}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${Math.round(value)} m`, "標高"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="altitude"
                    stroke="hsl(var(--chart-3))"
                    fill="hsl(var(--chart-3) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        )}

        {hasPower && (
          <TabsContent value="power" className="mt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={false} axisLine={false} />
                  <YAxis 
                    domain={["dataMin - 20", "dataMax + 20"]} 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(val) => `${Math.round(val)}W`}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${Math.round(value)} W`, "パワー"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="power"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
}
