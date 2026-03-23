import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "outline";
  size?: "sm" | "md";
  className?: string;
}

const variants = {
  default: "bg-muted text-muted-foreground border-border",
  success: "bg-success/15 text-success border-success/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  destructive: "bg-destructive/15 text-destructive border-destructive/20",
  outline: "bg-transparent text-foreground border-border",
};

const sizes = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}

export function RiskBadge({ score }: { score: number }) {
  if (score >= 71) {
    return <Badge variant="destructive">High ({score})</Badge>;
  } else if (score >= 41) {
    return <Badge variant="warning">Medium ({score})</Badge>;
  }
  return <Badge variant="success">Low ({score})</Badge>;
}

export function SentimentBadge({ sentiment }: { sentiment: "Positive" | "Neutral" | "Negative" }) {
  const variant = sentiment === "Positive" ? "success" : sentiment === "Negative" ? "destructive" : "default";
  return <Badge variant={variant}>{sentiment}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const variant = status === "Cleared" ? "success" : status === "Blocked" ? "destructive" : "warning";
  return <Badge variant={variant}>{status}</Badge>;
}
