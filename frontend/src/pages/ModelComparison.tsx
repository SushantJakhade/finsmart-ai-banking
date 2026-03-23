import { useEffect, useState } from "react";
import {
  TrendingUp,
  BarChart3,
  Brain,
  Database,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import {
  fetchModelMetrics,
  fetchDatasetStats,
  AllMetrics,
  DatasetStats,
} from "@/api/riskApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

const MODEL_DISPLAY: Record<string, { label: string; color: string }> = {
  random_forest: { label: "Random Forest", color: "#3b82f6" },
  xgboost: { label: "XGBoost", color: "#f59e0b" },
  logistic_regression: { label: "Logistic Regression", color: "#10b981" },
  svm: { label: "SVM", color: "#8b5cf6" },
  binary_high_risk: { label: "Binary High Risk", color: "#ef4444" },
};

export default function ModelComparison() {
  const [metrics, setMetrics] = useState<AllMetrics | null>(null);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [m, s] = await Promise.all([
          fetchModelMetrics(),
          fetchDatasetStats(),
        ]);
        setMetrics(m);
        setStats(s);
      } catch (err) {
        console.error("Failed to load metrics:", err);
        setError("Failed to load model metrics. Check backend services.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const accuracyData = metrics
    ? Object.entries(metrics).map(([name, m]) => ({
        name: MODEL_DISPLAY[name]?.label || name,
        accuracy: m.accuracy,
        fill: MODEL_DISPLAY[name]?.color || "#888",
      }))
    : [];

  const radarData = metrics
    ? ["High", "Medium", "Low"].map((riskClass) => {
        const entry: Record<string, string | number> = { class: riskClass };
        Object.entries(metrics).forEach(([name, m]) => {
          const perClass = m.per_class[riskClass];
          entry[name] = perClass ? perClass.f1_score : 0;
        });
        return entry;
      })
    : [];

  const bestModel = metrics
    ? Object.entries(metrics).reduce((best, [name, m]) =>
        m.accuracy > (best.acc || 0) ? { name, acc: m.accuracy } : best,
      { name: "", acc: 0 })
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground">
          Risk Model Comparison
        </h1>
        <p className="text-muted-foreground mt-2">
          Compare performance of ML models trained on the customer risk dataset
        </p>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <p className="text-sm text-destructive text-center">{error}</p>
        </Card>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-3 p-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Records</p>
                <p className="text-xl font-bold">{stats.total_records.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3 p-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Features Used</p>
                <p className="text-xl font-bold">{stats.total_features}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3 p-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Models Trained</p>
                <p className="text-xl font-bold">{stats.models_available.length}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3 p-1">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best Accuracy</p>
                <p className="text-xl font-bold">{bestModel ? `${bestModel.acc}%` : "..."}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Dataset Risk Distribution</CardTitle>
            <CardDescription>Balanced class distribution across risk levels</CardDescription>
          </CardHeader>
          <div className="px-5 pb-5 space-y-3">
            {Object.entries(stats.risk_distribution).map(([level, count]) => (
              <div key={level} className="flex items-center gap-3">
                <span className={`text-sm font-medium w-20 ${
                  level === "High" ? "text-destructive" : level === "Medium" ? "text-yellow-600" : "text-green-600"
                }`}>{level}</span>
                <div className="flex-1">
                  <ProgressBar
                    value={(count / stats.total_records) * 100}
                    color={level === "High" ? "destructive" : level === "Medium" ? "warning" : "success"}
                    size="md"
                  />
                </div>
                <span className="text-sm font-medium w-16 text-right">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Model Accuracy Comparison</CardTitle>
              <CardDescription>Test set accuracy for each model</CardDescription>
            </CardHeader>
            <div className="h-64 px-5 pb-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accuracyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Accuracy"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                    {accuracyData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>F1-Score by Risk Class</CardTitle>
              <CardDescription>Per-class F1-score across all models</CardDescription>
            </CardHeader>
            <div className="h-64 px-5 pb-5">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="class" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {Object.entries(MODEL_DISPLAY).map(([key, { label, color }]) => (
                    <Radar key={key} name={label} dataKey={key} stroke={color} fill={color} fillOpacity={0.1} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(metrics).map(([name, m]) => {
            const display = MODEL_DISPLAY[name] || { label: name, color: "#888" };
            const isBest = bestModel?.name === name;
            return (
              <Card key={name} className={isBest ? "border-2 border-primary/50" : ""}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: display.color }} />
                      <h3 className="font-semibold">{display.label}</h3>
                    </div>
                    {isBest && <Badge variant="success" size="sm">Best Model</Badge>}
                  </div>
                  <div className="text-center mb-4">
                    <p className="text-4xl font-bold">{m.accuracy}%</p>
                    <p className="text-xs text-muted-foreground">Test Accuracy</p>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(m.per_class).map(([cls, data]) => (
                      <div key={cls} className="flex items-center justify-between text-sm">
                        <span className={`font-medium ${
                          cls === "High" ? "text-destructive" : cls === "Medium" ? "text-yellow-600" : "text-green-600"
                        }`}>{cls}</span>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>P: {data.precision}%</span>
                          <span>R: {data.recall}%</span>
                          <span className="font-medium text-foreground">F1: {data.f1_score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Confusion Matrix</p>
                    <div className="grid grid-cols-3 gap-1 text-xs text-center">
                      {m.confusion_matrix.map((row, i) =>
                        row.map((val, j) => (
                          <div
                            key={`${i}-${j}`}
                            className={`p-1.5 rounded ${i === j ? "bg-primary/10 font-bold text-primary" : "bg-muted/50"}`}
                          >
                            {val}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                      <span>High</span>
                      <span>Med</span>
                      <span>Low</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          Loading model metrics from backend...
        </div>
      )}
    </div>
  );
}
