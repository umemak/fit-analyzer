import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Mountain } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression } from "leaflet";

interface WorkoutRecord {
  timestamp: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  heartRate?: number;
  speed?: number;
  distance?: number;
}

interface RouteMapProps {
  records: WorkoutRecord[];
}

// Fix for default marker icons in Leaflet with React
if (typeof window !== 'undefined') {
  const L = require('leaflet');
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

export function RouteMap({ records }: RouteMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter records with valid GPS coordinates
  const gpsRecords = records.filter(
    (r) => r.latitude !== undefined && r.longitude !== undefined && 
           r.latitude !== 0 && r.longitude !== 0
  );

  if (gpsRecords.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">GPS データなし</h3>
          <p className="text-sm text-muted-foreground">
            このワークアウトには位置情報が含まれていません
          </p>
        </div>
      </Card>
    );
  }

  const positions: LatLngExpression[] = gpsRecords.map(
    (r) => [r.latitude!, r.longitude!]
  );

  const startPosition: LatLngExpression = positions[0];
  const endPosition: LatLngExpression = positions[positions.length - 1];

  // Calculate center and bounds
  const latitudes = gpsRecords.map((r) => r.latitude!);
  const longitudes = gpsRecords.map((r) => r.longitude!);
  const centerLat = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const centerLng = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
  const center: LatLngExpression = [centerLat, centerLng];

  // Calculate total elevation gain
  const elevationGain = gpsRecords.reduce((gain, record, index) => {
    if (index === 0 || !record.altitude || !gpsRecords[index - 1].altitude) return gain;
    const diff = record.altitude - gpsRecords[index - 1].altitude!;
    return diff > 0 ? gain + diff : gain;
  }, 0);

  // Calculate distance
  const totalDistance = gpsRecords[gpsRecords.length - 1]?.distance || 0;

  // Don't render until mounted to avoid SSR issues
  if (!isMounted) {
    return (
      <Card className="p-6">
        <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
          <p className="text-muted-foreground">地図を読み込んでいます...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="card-route-map">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Navigation className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">ルートマップ</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <MapPin className="h-3 w-3" />
            {gpsRecords.length} ポイント
          </Badge>
          {elevationGain > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Mountain className="h-3 w-3" />
              +{Math.round(elevationGain)}m
            </Badge>
          )}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border" style={{ height: "400px" }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Route polyline */}
          <Polyline
            positions={positions}
            pathOptions={{
              color: "#2563eb",
              weight: 4,
              opacity: 0.7,
            }}
          />

          {/* Start marker */}
          <Marker position={startPosition}>
            <Popup>
              <div className="text-center">
                <p className="font-semibold text-green-600">スタート</p>
                {gpsRecords[0].altitude && (
                  <p className="text-xs text-muted-foreground">
                    標高: {Math.round(gpsRecords[0].altitude)}m
                  </p>
                )}
              </div>
            </Popup>
          </Marker>

          {/* End marker */}
          <Marker position={endPosition}>
            <Popup>
              <div className="text-center">
                <p className="font-semibold text-red-600">ゴール</p>
                {gpsRecords[gpsRecords.length - 1].altitude && (
                  <p className="text-xs text-muted-foreground">
                    標高: {Math.round(gpsRecords[gpsRecords.length - 1].altitude)}m
                  </p>
                )}
                {totalDistance > 0 && (
                  <p className="text-xs text-muted-foreground">
                    距離: {(totalDistance / 1000).toFixed(2)}km
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground text-xs mb-1">GPS記録点数</p>
          <p className="font-semibold">{gpsRecords.length.toLocaleString()}</p>
        </div>
        {totalDistance > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground text-xs mb-1">総距離</p>
            <p className="font-semibold">{(totalDistance / 1000).toFixed(2)} km</p>
          </div>
        )}
        {elevationGain > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground text-xs mb-1">獲得標高</p>
            <p className="font-semibold">+{Math.round(elevationGain)} m</p>
          </div>
        )}
      </div>
    </Card>
  );
}
