import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon?: LucideIcon;
}

export default function KpiCard({ title, value, subtitle, trend, trendLabel, icon: Icon }: KpiCardProps) {
  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return "text-muted-foreground";
    if (trend > 0) return "text-green-600 dark:text-green-500";
    return "text-red-600 dark:text-red-500";
  };

  const getTrendBgColor = () => {
    if (trend === undefined || trend === 0) return "bg-muted/30";
    if (trend > 0) return "bg-green-50 dark:bg-green-950/30";
    return "bg-red-50 dark:bg-red-950/30";
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-lg bg-muted/30">
              <Icon className="w-5 h-5 text-muted-foreground" data-testid={`kpi-icon-${title.toLowerCase().replace(/\s+/g, '-')}`} />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
          </div>
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium ${getTrendColor()} ${getTrendBgColor()}`} data-testid={`kpi-trend-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-3xl font-bold text-foreground" data-testid={`kpi-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trendLabel && (
          <p className="text-xs text-muted-foreground mt-1">{trendLabel}</p>
        )}
      </div>
    </Card>
  );
}
