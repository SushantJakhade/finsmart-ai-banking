import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Shield,
  Activity,
  Users,
  Search,
  Brain,
  Zap,
} from "lucide-react";
import { KPICard } from "@/components/shared/KPICard";
import { Card, CardHeader, CardTitle } from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/Badge";
import {
  scoreTransaction,
  fetchFraudTransactions,
  fetchFraudMetrics,
  FraudScoreResponse,
  FraudTransaction,
  FraudMetrics,
} from "@/api/fraudApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const RISK_COLORS: Record<string, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#22c55e",
};

export default function FraudDashboard() {
  const [transactions, setTransactions] = useState<FraudTransaction[]>([]);
  const [metrics, setMetrics] = useState<FraudMetrics | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live scoring
  const [formData, setFormData] = useState({
    amount: 15000,
    tranctionType: "transfer",
    merchantCountry: "IN",
    paymentMode: 1,
    timeStamp: new Date().toISOString(),
  });
  const [scoreResult, setScoreResult] = useState<FraudScoreResponse | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [txns, met] = await Promise.all([
          fetchFraudTransactions(),
          fetchFraudMetrics(),
        ]);
        setTransactions(txns);
        setMetrics(met);
      } catch (err) {
        console.error(err);
        setError("Failed to load fraud data. Check backend services.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredTxns = transactions.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const flaggedCount = transactions.filter((t) => t.status === "Flagged").length;
  const reviewCount = transactions.filter((t) => t.status === "Under Review").length;
  const clearedCount = transactions.filter((t) => t.status === "Cleared").length;

  const pieData = [
    { name: "Flagged", value: flaggedCount },
    { name: "Under Review", value: reviewCount },
    { name: "Cleared", value: clearedCount },
  ];

  const channelData = transactions.reduce<Record<string, number>>((acc, t) => {
    acc[t.channel] = (acc[t.channel] || 0) + 1;
    return acc;
  }, {});
  const channelChartData = Object.entries(channelData).map(([name, count]) => ({ name, count }));

  const handleScore = async () => {
    try {
      setScoreLoading(true);
      setScoreError(null);
      const res = await scoreTransaction(formData);
      setScoreResult(res);
    } catch (err) {
      console.error(err);
      setScoreError("Failed to score transaction.");
    } finally {
      setScoreLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Fraud Detection Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-powered transaction fraud detection using Isolation Forest anomaly detection
        </p>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <p className="text-sm text-destructive text-center">{error}</p>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Transactions"
          value={metrics?.totalTransactions?.toString() ?? "..."}
          icon={Activity}
          accentColor="primary"
        />
        <KPICard
          title="Flagged Suspicious"
          value={metrics?.flaggedSuspicious?.toString() ?? "..."}
          icon={AlertTriangle}
          accentColor="destructive"
        />
        <KPICard
          title="High Risk Clients"
          value={metrics?.highRiskClients?.toString() ?? "..."}
          icon={Users}
          accentColor="warning"
        />
        <KPICard
          title="Avg Risk Score"
          value={metrics?.averageRiskScore?.toFixed(1) ?? "..."}
          subtitle="Out of 100"
          icon={Shield}
          accentColor="accent"
        />
      </div>

      {/* Live Transaction Scoring */}
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Live Transaction Fraud Scoring
            </h3>
            <p className="text-xs text-muted-foreground">
              Enter transaction details to score fraud probability in real-time
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Amount (INR)</p>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="input-banking"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Transaction Type</p>
              <select
                value={formData.tranctionType}
                onChange={(e) => setFormData({ ...formData, tranctionType: e.target.value })}
                className="input-banking"
              >
                <option value="transfer">Transfer</option>
                <option value="payment">Payment</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="deposit">Deposit</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Merchant Country</p>
              <select
                value={formData.merchantCountry}
                onChange={(e) => setFormData({ ...formData, merchantCountry: e.target.value })}
                className="input-banking"
              >
                <option value="IN">India</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="CN">China</option>
                <option value="RU">Russia</option>
                <option value="NG">Nigeria</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Payment Mode</p>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={1}>UPI</option>
                <option value={2}>NEFT</option>
                <option value={3}>RTGS</option>
                <option value={4}>Card</option>
                <option value={5}>ATM</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={handleScore} disabled={scoreLoading} className="btn-primary w-full">
                <Zap className="w-4 h-4" />
                {scoreLoading ? "Scoring..." : "Detect Fraud"}
              </button>
            </div>
          </div>

          {scoreError && <p className="text-xs text-destructive">{scoreError}</p>}

          {scoreResult && (
            <div className={`border rounded-lg p-4 ${
              scoreResult.riskLevel === "HIGH" ? "border-destructive/30 bg-destructive/5" :
              scoreResult.riskLevel === "MEDIUM" ? "border-yellow-500/30 bg-yellow-50" :
              "border-green-500/30 bg-green-50"
            }`}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Risk Level</p>
                  <p className={`font-bold text-lg ${
                    scoreResult.riskLevel === "HIGH" ? "text-destructive" :
                    scoreResult.riskLevel === "MEDIUM" ? "text-yellow-600" : "text-green-600"
                  }`}>
                    {scoreResult.riskLevel}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fraud Probability</p>
                  <p className="font-semibold">{scoreResult.fraudProbability.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk Score</p>
                  <p className="font-semibold">{scoreResult.riskScore} / 100</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Anomaly Detected</p>
                  <p className={`font-semibold ${scoreResult.isAnomaly ? "text-destructive" : "text-green-600"}`}>
                    {scoreResult.isAnomaly ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Transaction ID or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-banking pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-banking w-auto min-w-[140px]"
          >
            <option value="All">All Statuses</option>
            <option value="Flagged">Flagged</option>
            <option value="Under Review">Under Review</option>
            <option value="Cleared">Cleared</option>
          </select>
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Transaction Table */}
        <div className="xl:col-span-2">
          <Card padding="none">
            <CardHeader className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <CardTitle>Transaction Monitoring</CardTitle>
                {loading && <span className="text-xs text-muted-foreground">Loading...</span>}
              </div>
              <span className="text-sm text-muted-foreground">
                {filteredTxns.length} transactions
              </span>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="table-banking">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Channel</th>
                    <th>Risk Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.map((t) => (
                    <tr key={t.id}>
                      <td className="font-mono text-sm">{t.id}</td>
                      <td className="text-sm">{t.date}</td>
                      <td className="text-sm">{t.customer}</td>
                      <td className="text-sm font-medium">
                        {t.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                      </td>
                      <td><span className="chip">{t.channel}</span></td>
                      <td>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          t.riskScore >= 70 ? "bg-destructive/10 text-destructive" :
                          t.riskScore >= 40 ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {t.riskScore}
                        </span>
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                  {filteredTxns.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                        No transactions to display.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    <Cell fill="#ef4444" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#22c55e" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transactions by Channel</CardTitle>
            </CardHeader>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
