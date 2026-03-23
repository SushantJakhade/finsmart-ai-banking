import { useEffect, useState } from "react";
import {
  scoreRisk,
  scoreAllModels,
  fetchCustomers,
  RiskScoreResponse,
  AllModelsResponse,
  CustomerRow,
} from "../api/riskApi";
import {
  Shield,
  AlertTriangle,
  Users,
  TrendingUp,
  Search,
  Filter,
  X,
  CheckCircle,
  Brain,
} from "lucide-react";
import { KPICard } from "@/components/shared/KPICard";
import { Card, CardHeader, CardTitle } from "@/components/shared/Card";
import { RiskBadge, StatusBadge } from "@/components/shared/Badge";
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

const MODEL_NAMES: Record<string, string> = {
  random_forest: "Random Forest",
  xgboost: "XGBoost",
  logistic_regression: "Logistic Regression",
  svm: "SVM",
  binary_high_risk: "Binary High Risk (100%)",
};

const RISK_COLORS: Record<string, string> = {
  High: "hsl(var(--destructive))",
  Medium: "hsl(var(--warning, 38 92% 50%))",
  Low: "hsl(var(--success, 142 76% 36%))",
};

export default function FraudDetection() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [minRiskScore, setMinRiskScore] = useState(0);

  // Live scoring state
  const [formData, setFormData] = useState({
    account_age: 20,
    account_type: 301,
    kyc: 1,
    rkyc: 0,
    is_punished: 0,
    govt_defaulter: 0,
    constitution_type: "ss",
    customer_type: 1,
    customer_status: 1,
    category: 1,
    is_blacklisted: 0,
    poi: 0,
    poa: "Aadhaar",
    customer_special: "No",
    account_status: 1,
    poi_alt: 0,
    model_name: "random_forest",
  });
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<RiskScoreResponse | null>(null);
  const [allModelsResult, setAllModelsResult] = useState<AllModelsResponse | null>(null);

  const [tableError, setTableError] = useState<string | null>(null);
  const [tableLoading, setTableLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setTableLoading(true);
        setTableError(null);
        const data = await fetchCustomers();
        setRows(data);
      } catch (err) {
        console.error("Error loading customers:", err);
        setTableError("Error loading customers. Check backend services.");
        setRows([]);
      } finally {
        setTableLoading(false);
      }
    };
    load();
  }, []);

  const filteredCustomers = rows.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.poa.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = riskFilter === "All" || c.risk_level === riskFilter;
    const matchesScore = c.risk_score >= minRiskScore;
    return matchesSearch && matchesRisk && matchesScore;
  });

  const selectedCust = rows.find((c) => c.id === selectedCustomer);

  const highRiskCount = rows.filter((c) => c.risk_level === "High").length;
  const mediumRiskCount = rows.filter((c) => c.risk_level === "Medium").length;
  const lowRiskCount = rows.filter((c) => c.risk_level === "Low").length;
  const avgRiskScore = rows.length > 0
    ? (rows.reduce((sum, c) => sum + c.risk_score, 0) / rows.length).toFixed(1)
    : "0";

  const riskDistribution = [
    { name: "High Risk", count: highRiskCount },
    { name: "Medium Risk", count: mediumRiskCount },
    { name: "Low Risk", count: lowRiskCount },
  ];

  const pieData = [
    { name: "High", value: highRiskCount },
    { name: "Medium", value: mediumRiskCount },
    { name: "Low", value: lowRiskCount },
  ];

  const handleLiveScore = async () => {
    try {
      setLiveLoading(true);
      setLiveError(null);
      setLiveResult(null);
      setAllModelsResult(null);

      const [singleRes, allRes] = await Promise.all([
        scoreRisk(formData),
        scoreAllModels(formData),
      ]);
      setLiveResult(singleRes);
      setAllModelsResult(allRes);
    } catch (err) {
      console.error(err);
      setLiveError("Failed to score. Check backend services are running.");
    } finally {
      setLiveLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Customer Risk Assessment
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-powered customer risk classification using ML models trained on KYC/POI/POA data
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Customers Analyzed"
          value={rows.length.toString()}
          icon={Users}
          accentColor="primary"
        />
        <KPICard
          title="High Risk Customers"
          value={highRiskCount.toString()}
          icon={AlertTriangle}
          accentColor="destructive"
        />
        <KPICard
          title="Medium Risk"
          value={mediumRiskCount.toString()}
          icon={Shield}
          accentColor="warning"
        />
        <KPICard
          title="Avg Risk Score"
          value={avgRiskScore}
          subtitle="Out of 100"
          icon={TrendingUp}
          accentColor="accent"
        />
      </div>

      {/* Live Model Scoring */}
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Live Customer Risk Scoring
            </h3>
            <p className="text-xs text-muted-foreground">
              Enter customer details and score with AI models in real-time
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Account Age (years)</p>
              <input
                type="number"
                value={formData.account_age}
                onChange={(e) => setFormData({ ...formData, account_age: Number(e.target.value) })}
                className="input-banking"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Account Type</p>
              <select
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={301}>301 - Saving Deposit</option>
                <option value={201}>201 - Current Deposit</option>
                <option value={252}>252 - Loan Against FD</option>
                <option value={202}>202 - House Secured Loan</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">KYC Completed</p>
              <select
                value={formData.kyc}
                onChange={(e) => setFormData({ ...formData, kyc: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={1}>Yes</option>
                <option value={0}>No</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">RKYC Verified</p>
              <select
                value={formData.rkyc}
                onChange={(e) => setFormData({ ...formData, rkyc: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={1}>Yes</option>
                <option value={0}>No</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Is Punished</p>
              <select
                value={formData.is_punished}
                onChange={(e) => setFormData({ ...formData, is_punished: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Govt Defaulter</p>
              <select
                value={formData.govt_defaulter}
                onChange={(e) => setFormData({ ...formData, govt_defaulter: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Constitution Type</p>
              <select
                value={formData.constitution_type}
                onChange={(e) => setFormData({ ...formData, constitution_type: e.target.value })}
                className="input-banking"
              >
                <option value="ss">SS (Individual)</option>
                <option value="non indi">Non Individual</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Customer Type</p>
              <select
                value={formData.customer_type}
                onChange={(e) => setFormData({ ...formData, customer_type: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={1}>Individual</option>
                <option value={0}>Non-Individual</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Customer Status</p>
              <select
                value={formData.customer_status}
                onChange={(e) => setFormData({ ...formData, customer_status: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={1}>Active</option>
                <option value={2}>Inactive</option>
                <option value={3}>Expired</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Category</p>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={1}>Major</option>
                <option value={2}>Minor</option>
                <option value={3}>Senior</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Is Blacklisted</p>
              <select
                value={formData.is_blacklisted}
                onChange={(e) => setFormData({ ...formData, is_blacklisted: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">POI (Proof of Identity)</p>
              <select
                value={formData.poi}
                onChange={(e) => setFormData({ ...formData, poi: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={0}>Aadhaar</option>
                <option value={1}>PAN</option>
                <option value={2}>Passport</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">POA (Proof of Address)</p>
              <select
                value={formData.poa}
                onChange={(e) => setFormData({ ...formData, poa: e.target.value })}
                className="input-banking"
              >
                <option value="Aadhaar">Aadhaar</option>
                <option value="PAN">PAN</option>
                <option value="Passport">Passport</option>
                <option value="VoterID">Voter ID</option>
                <option value="DrivingLicense">Driving License</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Account Status</p>
              <select
                value={formData.account_status}
                onChange={(e) => setFormData({ ...formData, account_status: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">POI Alt</p>
              <select
                value={formData.poi_alt}
                onChange={(e) => setFormData({ ...formData, poi_alt: Number(e.target.value) })}
                className="input-banking"
              >
                <option value={0}>Aadhaar</option>
                <option value={1}>PAN</option>
                <option value={3}>Passport</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Model</p>
              <select
                value={formData.model_name}
                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                className="input-banking"
              >
                {Object.entries(MODEL_NAMES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleLiveScore} disabled={liveLoading} className="btn-primary">
              {liveLoading ? "Scoring..." : "Score with AI Models"}
            </button>
            {liveError && <span className="text-xs text-destructive">{liveError}</span>}
          </div>

          {/* Single model result */}
          {liveResult && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold">
                Primary Result ({MODEL_NAMES[liveResult.model_used] || liveResult.model_used})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Risk Level</p>
                  <p className={`font-bold text-lg ${
                    liveResult.risk_level === "High" ? "text-destructive" :
                    liveResult.risk_level === "Medium" ? "text-yellow-600" : "text-green-600"
                  }`}>
                    {liveResult.risk_level}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="font-semibold">{liveResult.confidence.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk Score</p>
                  <p className="font-semibold">{liveResult.risk_score} / 100</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(allModelsResult).map(([name, res]) => (
                  <div key={name} className={`rounded-lg p-3 border ${
                    res.risk_level === "High" ? "border-destructive/30 bg-destructive/5" :
                    res.risk_level === "Medium" ? "border-yellow-500/30 bg-yellow-50" :
                    "border-green-500/30 bg-green-50"
                  }`}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {MODEL_NAMES[name] || name}
                    </p>
                    <p className={`font-bold ${
                      res.risk_level === "High" ? "text-destructive" :
                      res.risk_level === "Medium" ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {res.risk_level} Risk
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confidence: {res.confidence.toFixed(1)}%
                    </p>
                    <div className="mt-2 text-xs space-y-0.5">
                      {Object.entries(res.probabilities).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span>{k}:</span>
                          <span className="font-medium">{v}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
              placeholder="Search by Customer ID or POA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-banking pl-10"
            />
          </div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="input-banking w-auto min-w-[140px]"
          >
            <option value="All">All Risk Levels</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Min Score:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={minRiskScore}
              onChange={(e) => setMinRiskScore(Number(e.target.value))}
              className="w-24 accent-primary"
            />
            <span className="text-sm font-medium w-8">{minRiskScore}</span>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Customer Table */}
        <div className="xl:col-span-2">
          <Card padding="none">
            <CardHeader className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <CardTitle>Customer Risk Table</CardTitle>
                {tableLoading && (
                  <span className="text-xs text-muted-foreground">Loading from backend...</span>
                )}
                {tableError && (
                  <span className="text-xs text-destructive block">{tableError}</span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {filteredCustomers.length} customers
              </span>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="table-banking">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Account Age</th>
                    <th>KYC</th>
                    <th>Blacklisted</th>
                    <th>POA</th>
                    <th>Risk Score</th>
                    <th>Risk Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomer(c.id)}
                      className={c.id === selectedCustomer ? "bg-primary/5" : ""}
                    >
                      <td className="font-mono text-sm">{c.id}</td>
                      <td>{c.account_age} yrs</td>
                      <td>
                        {c.kyc ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-destructive" />
                        )}
                      </td>
                      <td>
                        {c.is_blacklisted ? (
                          <span className="text-destructive font-medium">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </td>
                      <td><span className="chip">{c.poa}</span></td>
                      <td><RiskBadge score={c.risk_score} /></td>
                      <td>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          c.risk_level === "High" ? "bg-destructive/10 text-destructive" :
                          c.risk_level === "Medium" ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {c.risk_level}
                        </span>
                      </td>
                      <td><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && !tableLoading && (
                    <tr>
                      <td colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                        No customers to display.
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
              <CardTitle>Risk Distribution</CardTitle>
            </CardHeader>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDistribution}>
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

          <Card>
            <CardHeader>
              <CardTitle>Risk Breakdown</CardTitle>
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
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name] || "#888"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Customer Detail Drawer */}
      {selectedCustomer && selectedCust && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-card border-l border-border shadow-elevated z-50 animate-slide-in-left overflow-y-auto">
          <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
            <h3 className="font-semibold">Customer Details</h3>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg">{selectedCust.id}</span>
                <RiskBadge score={selectedCust.risk_score} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Risk Level</p>
                  <p className={`font-bold text-xl ${
                    selectedCust.risk_level === "High" ? "text-destructive" :
                    selectedCust.risk_level === "Medium" ? "text-yellow-600" : "text-green-600"
                  }`}>{selectedCust.risk_level}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk Score</p>
                  <p className="font-bold text-xl">{selectedCust.risk_score}%</p>
                </div>
              </div>
            </div>

            <Card className="bg-muted/30">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Age</span>
                  <span className="font-medium">{selectedCust.account_age} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KYC Status</span>
                  <span className={selectedCust.kyc ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                    {selectedCust.kyc ? "Verified" : "Not Verified"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RKYC Status</span>
                  <span className={selectedCust.rkyc ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                    {selectedCust.rkyc ? "Verified" : "Not Verified"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blacklisted</span>
                  <span className={selectedCust.is_blacklisted ? "text-destructive font-medium" : "text-green-600 font-medium"}>
                    {selectedCust.is_blacklisted ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Govt Defaulter</span>
                  <span className={selectedCust.govt_defaulter ? "text-destructive font-medium" : "text-green-600 font-medium"}>
                    {selectedCust.govt_defaulter ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Proof of Address</span>
                  <span className="font-medium">{selectedCust.poa}</span>
                </div>
              </div>
            </Card>

            {selectedCust.risk_level === "High" && (
              <Card className="bg-destructive/5 border-destructive/20">
                <h4 className="font-medium text-destructive mb-2">Risk Explanation</h4>
                <p className="text-sm text-muted-foreground">
                  This customer has been classified as HIGH RISK based on ML model analysis
                  of their KYC compliance, account history, and government defaulter status.
                  Immediate review recommended.
                </p>
              </Card>
            )}

            <div className="flex flex-col gap-2">
              <button className="btn-primary w-full">
                <AlertTriangle className="w-4 h-4" />
                Flag for Review
              </button>
              <button className="btn-secondary w-full">Mark as Cleared</button>
              <button className="btn-outline w-full">Assign to Auditor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
