import { useEffect, useState } from "react";
import { Activity, Users, ShieldAlert, Cpu, ArrowRight, Landmark, Scan } from "lucide-react";
import { KPICard } from "@/components/shared/KPICard";
import { Card, CardHeader, CardTitle } from "@/components/shared/Card";
import { fetchDashboardSummary, DashboardSummary } from "../api/dashboardApi";

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDashboardSummary();
        setSummary(data);
      } catch (err) {
        console.error("Failed to load dashboard summary", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalCustomers = summary?.totalCustomers ?? 0;
  const highRiskCount = summary?.highRiskCount ?? 0;
  const flaggedCount = summary?.flaggedCount ?? 0;
  const systemHealth = summary?.systemHealth ?? 0;
  const aiAccuracy = summary?.aiAccuracy ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back to AI Banking Intelligence Suite
        </p>
        {error && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="High Risk Customers"
          value={loading ? "..." : highRiskCount.toString()}
          icon={ShieldAlert}
          accentColor="destructive"
        />
        <KPICard
          title="Total Customers Analyzed"
          value={loading ? "..." : totalCustomers.toLocaleString()}
          icon={Users}
          accentColor="primary"
        />
        <KPICard
          title="System Health"
          value={loading ? "..." : `${systemHealth.toFixed(1)}%`}
          subtitle="All services operational"
          icon={Activity}
          accentColor="accent"
        />
        <KPICard
          title="AI Model Accuracy"
          value={loading ? "..." : `${aiAccuracy.toFixed(1)}%`}
          subtitle="Best performing model"
          icon={Cpu}
          accentColor="accent"
        />
      </div>

      {/* Intelligence modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-banking">
          <div className="flex justify-between items-start gap-2 p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Customer Risk Assessment
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                AI-powered risk classification using KYC/POI/POA data
              </p>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Flagged Customers</p>
                <p className="text-lg font-semibold">
                  {loading ? "..." : flaggedCount}
                </p>
              </div>
            </div>
            <a
              href="/fraud-detection"
              className="inline-flex items-center text-xs font-medium text-primary hover:underline"
            >
              Open <ArrowRight className="w-3 h-3 ml-1" />
            </a>
          </div>
        </Card>

        <Card className="card-banking">
          <div className="flex justify-between items-start gap-2 p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Fraud Detection
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Transaction fraud detection using Isolation Forest
              </p>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Anomaly Detection</p>
                <p className="text-lg font-semibold">Active</p>
              </div>
            </div>
            <a
              href="/fraud-dashboard"
              className="inline-flex items-center text-xs font-medium text-primary hover:underline"
            >
              Open <ArrowRight className="w-3 h-3 ml-1" />
            </a>
          </div>
        </Card>

        <Card className="card-banking">
          <div className="flex justify-between items-start gap-2 p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Loan Default Prediction
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Predict loan defaults with XGBoost, RF, Ensemble models
              </p>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Models Available</p>
                <p className="text-lg font-semibold">5</p>
              </div>
            </div>
            <a
              href="/loan-prediction"
              className="inline-flex items-center text-xs font-medium text-primary hover:underline"
            >
              Open <ArrowRight className="w-3 h-3 ml-1" />
            </a>
          </div>
        </Card>

        <Card className="card-banking">
          <div className="flex justify-between items-start gap-2 p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Model Comparison
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Compare ML models: RF, XGBoost, LR, SVM performance
              </p>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Best Accuracy</p>
                <p className="text-lg font-semibold">
                  {loading ? "..." : `${aiAccuracy.toFixed(1)}%`}
                </p>
              </div>
            </div>
            <a
              href="/model-comparison"
              className="inline-flex items-center text-xs font-medium text-primary hover:underline"
            >
              Open <ArrowRight className="w-3 h-3 ml-1" />
            </a>
          </div>
        </Card>

        <Card className="card-banking">
          <div className="flex justify-between items-start gap-2 p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Sentiment Analysis CRM
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Track customer messages and sentiment insights
              </p>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Pending Messages</p>
                <p className="text-lg font-semibold">156</p>
              </div>
            </div>
            <a
              href="/sentiment-crm"
              className="inline-flex items-center text-xs font-medium text-primary hover:underline"
            >
              Open <ArrowRight className="w-3 h-3 ml-1" />
            </a>
          </div>
        </Card>

        <Card className="card-banking">
          <div className="flex justify-between items-start gap-2 p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Regulation NLP Monitor
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Compliance and regulatory risk scanning
              </p>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">High Risk Flags</p>
                <p className="text-lg font-semibold">5</p>
              </div>
            </div>
            <a
              href="/regulation-monitor"
              className="inline-flex items-center text-xs font-medium text-primary hover:underline"
            >
              Open <ArrowRight className="w-3 h-3 ml-1" />
            </a>
          </div>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent High-Risk Customers</CardTitle>
            <p className="text-xs text-muted-foreground">
              Top high-risk customers from ML model analysis
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {summary?.recentAlerts.length ?? 0} alerts
          </span>
        </CardHeader>

        <div className="divide-y">
          {(summary?.recentAlerts ?? []).map((alert, i) => (
            <div
              key={`${alert.customerId}-${i}`}
              className="flex items-center justify-between px-5 py-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="chip bg-destructive/10 text-destructive border-destructive/20">
                    {alert.riskLevel} Risk
                  </span>
                  <span className="text-sm font-medium">
                    {alert.message}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {alert.customerId}
                </div>
              </div>
              <span className="badge-risk-high">
                Score {alert.riskScore}
              </span>
            </div>
          ))}

          {!loading && (summary?.recentAlerts.length ?? 0) === 0 && (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              No recent alerts from the model yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
