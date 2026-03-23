import { useEffect, useState } from "react";
import {
  TrendingUp,
  BarChart3,
  Brain,
  Database,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Percent,
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
  scoreLoan,
  scoreLoanAllModels,
  fetchLoanMetrics,
  fetchLoanDatasetStats,
  LoanScoreResponse,
  LoanAllModelsResponse,
  LoanAllMetrics,
  LoanDatasetStats,
} from "@/api/loanApi";
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
  xgboost: { label: "XGBoost", color: "#f59e0b" },
  random_forest: { label: "Random Forest", color: "#3b82f6" },
  gradient_boosting: { label: "Gradient Boosting", color: "#8b5cf6" },
  logistic_regression: { label: "Logistic Regression", color: "#10b981" },
  ensemble: { label: "Ensemble (Voting)", color: "#ef4444" },
};

export default function LoanPrediction() {
  const [metrics, setMetrics] = useState<LoanAllMetrics | null>(null);
  const [stats, setStats] = useState<LoanDatasetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live scoring state
  const [formData, setFormData] = useState({
    applicantIncome: 50000,
    coapplicantIncome: 0,
    loanAmount: 200000,
    tenureMonths: 60,
    creditScore: 700,
    existingLoans: 1,
    employmentYears: 5,
    age: 35,
    propertyArea: 0,
    education: 1,
    married: 1,
    dependents: 0,
    modelName: "ensemble",
  });
  const [liveResult, setLiveResult] = useState<LoanScoreResponse | null>(null);
  const [allModelsResult, setAllModelsResult] = useState<LoanAllModelsResponse | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [m, s] = await Promise.all([
          fetchLoanMetrics(),
          fetchLoanDatasetStats(),
        ]);
        setMetrics(m);
        setStats(s);
      } catch (err) {
        console.error("Failed to load loan metrics:", err);
        setError("Failed to load loan model metrics. Check backend services.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLiveScore = async () => {
    try {
      setLiveLoading(true);
      setLiveError(null);
      setLiveResult(null);
      setAllModelsResult(null);
      const [single, all] = await Promise.all([
        scoreLoan(formData),
        scoreLoanAllModels(formData),
      ]);
      setLiveResult(single);
      setAllModelsResult(all);
    } catch (err) {
      console.error(err);
      setLiveError("Failed to score. Check backend services.");
    } finally {
      setLiveLoading(false);
    }
  };

  const accuracyData = metrics
    ? Object.entries(metrics).map(([name, m]) => ({
        name: MODEL_DISPLAY[name]?.label || name,
        accuracy: m.accuracy,
        auc_roc: m.auc_roc,
        fill: MODEL_DISPLAY[name]?.color || "#888",
      }))
    : [];

  const radarData = metrics
    ? ["No Default", "Default"].map((cls) => {
        const entry: Record<string, string | number> = { class: cls };
        Object.entries(metrics).forEach(([name, m]) => {
          const pc = m.per_class[cls];
          entry[name] = pc ? pc.f1_score : 0;
        });
        return entry;
      })
    : [];

  const bestModel = metrics
    ? Object.entries(metrics).reduce(
        (best, [name, m]) => (m.auc_roc > (best.auc || 0) ? { name, auc: m.auc_roc, acc: m.accuracy } : best),
        { name: "", auc: 0, acc: 0 }
      )
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Loan Default Prediction
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-powered loan default risk assessment using multiple ML models with SMOTE oversampling
        </p>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <p className="text-sm text-destructive text-center">{error}</p>
        </Card>
      )}

      {/* Dataset Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-3 p-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Training Records</p>
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
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Default Rate</p>
                <p className="text-xl font-bold">{stats.default_rate}%</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3 p-1">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best AUC-ROC</p>
                <p className="text-xl font-bold">{bestModel ? `${bestModel.auc}%` : "..."}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Live Loan Scoring */}
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Live Loan Default Prediction
            </h3>
            <p className="text-xs text-muted-foreground">
              Enter applicant details to predict loan default probability
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Applicant Income (Monthly)</p>
              <input
                type="number"
                value={formData.applicantIncome}
                onChange={(e) => setFormData({ ...formData, applicantIncome: Number(e.target.value) })}
                className="input-banking"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Co-Applicant Income</p>
              <input
                type="number"
                value={formData.coapplicantIncome}
                onChange={(e) => setFormData({ ...formData, coapplicantIncome: Number(e.target.value) })}
                className="input-banking"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Loan Amount</p>
              <input
                type="number"
                value={formData.loanAmount}
                onChange={(e) => setFormData({ ...formData, loanAmount: Number(e.target.value) })}
                className="input-banking"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tenure (Months)</p>
              <select
                value={formData.tenureMonths}
                onChange={(e) => setFormData({ ...formData, tenureMonths: Number(e.target.value) })}
                className="input-banking"
              >
                {[12, 24, 36, 48, 60, 84, 120, 180, 240, 360].map((m) => (
                  <option key={m} value={m}>{m} months ({(m / 12).toFixed(0)} yrs)</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Credit Score</p>
              <input
                type="number"
                min={300}
                max={900}
                value={formData.creditScore}
                onChange={(e) => setFormData({ ...formData, creditScore: Number(e.target.value) })}
                className="input-banking"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Existing Loans</p>
              <select
                value={formData.existingLoans}
                onChange={(e) => setFormData({ ...formData, existingLoans: Number(e.target.value) })}
                className="input-banking"
              >
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Employment (Years)</p>
              <input
                type="number"
                min={0}
                max={40}
                value={formData.employmentYears}
                onChange={(e) => setFormData({ ...formData, employmentYears: Number(e.target.value) })}
                className="input-banking"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Age</p>
              <input
                type="number"
                min={21}
                max={70}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                className="input-banking"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Education</p>
              <select
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={1}>Graduate</option>
                <option value={0}>Not Graduate</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Marital Status</p>
              <select
                value={formData.married}
                onChange={(e) => setFormData({ ...formData, married: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={1}>Married</option>
                <option value={0}>Single</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Dependents</p>
              <select
                value={formData.dependents}
                onChange={(e) => setFormData({ ...formData, dependents: Number(e.target.value) })}
                className="input-banking"
              >
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Property Area</p>
              <select
                value={formData.propertyArea}
                onChange={(e) => setFormData({ ...formData, propertyArea: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={0}>Urban</option>
                <option value={1}>Semiurban</option>
                <option value={2}>Rural</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleLiveScore} disabled={liveLoading} className="btn-primary">
              <DollarSign className="w-4 h-4" />
              {liveLoading ? "Predicting..." : "Predict Default Risk"}
            </button>
            {liveError && <span className="text-xs text-destructive">{liveError}</span>}
          </div>

          {/* Single model result */}
          {liveResult && (
            <div className={`border rounded-lg p-4 ${
              liveResult.riskLevel === "High" ? "border-destructive/30 bg-destructive/5" :
              liveResult.riskLevel === "Medium" ? "border-yellow-500/30 bg-yellow-50" :
              "border-green-500/30 bg-green-50"
            }`}>
              <h4 className="text-sm font-semibold mb-3">
                Primary Result ({MODEL_DISPLAY[liveResult.model_used]?.label || liveResult.model_used})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Prediction</p>
                  <p className={`font-bold text-lg flex items-center gap-1 ${
                    liveResult.prediction === "Default" ? "text-destructive" : "text-green-600"
                  }`}>
                    {liveResult.prediction === "Default" ?
                      <AlertTriangle className="w-5 h-5" /> :
                      <CheckCircle className="w-5 h-5" />
                    }
                    {liveResult.prediction}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Default Probability</p>
                  <p className="font-semibold">{liveResult.defaultProbability.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk Level</p>
                  <p className={`font-bold ${
                    liveResult.riskLevel === "High" ? "text-destructive" :
                    liveResult.riskLevel === "Medium" ? "text-yellow-600" : "text-green-600"
                  }`}>{liveResult.riskLevel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Probabilities</p>
                  <div className="text-xs space-y-0.5">
                    {Object.entries(liveResult.probabilities).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span>{k}:</span>
                        <span className="font-medium">{v}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All models comparison */}
          {allModelsResult && (
            <div className="border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-3">All Models Comparison</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {Object.entries(allModelsResult).map(([name, res]) => (
                  <div key={name} className={`rounded-lg p-3 border ${
                    res.riskLevel === "High" ? "border-destructive/30 bg-destructive/5" :
                    res.riskLevel === "Medium" ? "border-yellow-500/30 bg-yellow-50" :
                    "border-green-500/30 bg-green-50"
                  }`}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {MODEL_DISPLAY[name]?.label || name}
                    </p>
                    <p className={`font-bold ${
                      res.prediction === "Default" ? "text-destructive" : "text-green-600"
                    }`}>
                      {res.prediction}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: {res.defaultProbability.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Model Performance Charts */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Model Accuracy & AUC-ROC</CardTitle>
              <CardDescription>Test set performance for each model</CardDescription>
            </CardHeader>
            <div className="h-64 px-5 pb-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accuracyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}%`, name === "accuracy" ? "Accuracy" : "AUC-ROC"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Accuracy" />
                  <Bar dataKey="auc_roc" fill="#f59e0b" radius={[0, 4, 4, 0]} name="AUC-ROC" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>F1-Score by Class</CardTitle>
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

      {/* Detailed Per-Model Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

                  <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                    <div>
                      <p className="text-3xl font-bold">{m.accuracy}%</p>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-amber-600">{m.auc_roc}%</p>
                      <p className="text-xs text-muted-foreground">AUC-ROC</p>
                    </div>
                  </div>

                  {m.cv_accuracy_mean > 0 && (
                    <p className="text-xs text-muted-foreground text-center mb-3">
                      CV: {m.cv_accuracy_mean}% +/- {m.cv_accuracy_std}%
                    </p>
                  )}

                  <div className="space-y-2">
                    {Object.entries(m.per_class).map(([cls, data]) => (
                      <div key={cls} className="flex items-center justify-between text-sm">
                        <span className={`font-medium ${
                          cls === "Default" ? "text-destructive" : "text-green-600"
                        }`}>
                          {cls}
                        </span>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>P: {data.precision}%</span>
                          <span>R: {data.recall}%</span>
                          <span className="font-medium text-foreground">F1: {data.f1_score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Confusion Matrix */}
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Confusion Matrix</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-center">
                      {m.confusion_matrix.map((row, i) =>
                        row.map((val, j) => (
                          <div
                            key={`${i}-${j}`}
                            className={`p-1.5 rounded ${
                              i === j ? "bg-primary/10 font-bold text-primary" : "bg-muted/50"
                            }`}
                          >
                            {val}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                      <span>No Def</span>
                      <span>Default</span>
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
          Loading loan default model metrics from backend...
        </div>
      )}
    </div>
  );
}
