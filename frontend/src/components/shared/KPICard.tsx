import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accentColor?: "primary" | "accent" | "success" | "warning" | "destructive";
}

const accentColors = {
  primary: "from-primary to-primary/70",
  accent: "from-accent to-accent/70",
  success: "from-success to-success/70",
  warning: "from-warning to-warning/70",
  destructive: "from-destructive to-destructive/70",
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = "primary",
}: KPICardProps) {
  return (
    <div className="kpi-card animate-slide-up">
      <div
        className={cn(
          "absolute top-0 left-0 w-1 h-full bg-gradient-to-b rounded-l-xl",
          accentColors[accentColor]
        )}
      />
      
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted-foreground">vs last week</span>
            </div>
          )}
        </div>
        
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            accentColor === "primary" && "bg-primary/10 text-primary",
            accentColor === "accent" && "bg-accent/10 text-accent",
            accentColor === "success" && "bg-success/10 text-success",
            accentColor === "warning" && "bg-warning/10 text-warning",
            accentColor === "destructive" && "bg-destructive/10 text-destructive"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
