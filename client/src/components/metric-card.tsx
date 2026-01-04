import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
}

export function MetricCard({ title, value, unit, icon: Icon, description }: MetricCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-mono font-semibold tracking-tight" data-testid={`metric-value-${title.toLowerCase().replace(/\s/g, '-')}`}>
              {value}
            </span>
            {unit && (
              <span className="text-lg text-muted-foreground font-mono">{unit}</span>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Card>
  );
}
