import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Lap } from "@shared/schema";

interface LapTableProps {
  laps: Lap[];
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatPace(speedMps: number): string {
  if (!speedMps || speedMps === 0) return "-";
  const paceSecsPerKm = 1000 / speedMps;
  const mins = Math.floor(paceSecsPerKm / 60);
  const secs = Math.floor(paceSecsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function LapTable({ laps }: LapTableProps) {
  if (!laps || laps.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">ラップ詳細</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ラップ</TableHead>
              <TableHead className="text-right">距離</TableHead>
              <TableHead className="text-right">タイム</TableHead>
              <TableHead className="text-right">ペース</TableHead>
              <TableHead className="text-right">平均心拍</TableHead>
              <TableHead className="text-right">最大心拍</TableHead>
              {laps.some(l => l.avgPower) && (
                <TableHead className="text-right">平均パワー</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {laps.map((lap, index) => (
              <TableRow key={index} data-testid={`row-lap-${index}`}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="text-right font-mono">
                  {(lap.totalDistance / 1000).toFixed(2)} km
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatDuration(lap.totalTimerTime ?? lap.totalElapsedTime)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatPace(lap.avgSpeed || 0)} /km
                </TableCell>
                <TableCell className="text-right font-mono">
                  {lap.avgHeartRate ? `${Math.round(lap.avgHeartRate)} bpm` : "-"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {lap.maxHeartRate ? `${Math.round(lap.maxHeartRate)} bpm` : "-"}
                </TableCell>
                {laps.some(l => l.avgPower) && (
                  <TableCell className="text-right font-mono">
                    {lap.avgPower ? `${Math.round(lap.avgPower)} W` : "-"}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
