import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: "primary" | "accent" | "success" | "warning" | "destructive";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

const colors = {
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

const sizes = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

export function ProgressBar({
  value,
  max = 100,
  color = "primary",
  size = "md",
  showLabel = false,
  label,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          {showLabel && <span className="text-xs font-medium text-foreground">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={cn("progress-bar", sizes[size])}>
        <div
          className={cn("progress-bar-fill", colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface SentimentBarsProps {
  positive: number;
  neutral: number;
  negative: number;
}

export function SentimentBars({ positive, neutral, negative }: SentimentBarsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-xs w-16 text-muted-foreground">Positive</span>
        <div className="flex-1">
          <ProgressBar value={positive} color="success" size="sm" />
        </div>
        <span className="text-xs font-medium w-10 text-right">{positive}%</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs w-16 text-muted-foreground">Neutral</span>
        <div className="flex-1">
          <ProgressBar value={neutral} color="primary" size="sm" />
        </div>
        <span className="text-xs font-medium w-10 text-right">{neutral}%</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs w-16 text-muted-foreground">Negative</span>
        <div className="flex-1">
          <ProgressBar value={negative} color="destructive" size="sm" />
        </div>
        <span className="text-xs font-medium w-10 text-right">{negative}%</span>
      </div>
    </div>
  );
}
