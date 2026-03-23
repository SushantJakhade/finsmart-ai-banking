import axios from "axios";

const API_BASE_URL = "http://localhost:5200";

export type FraudScoreRequest = {
  amount: number;
  tranctionType: string;
  merchantCountry: string;
  paymentMode: number;
  timeStamp: string;
};

export type FraudScoreResponse = {
  fraudProbability: number;
  riskScore: number;
  riskLevel: string;
  isAnomaly: boolean;
  rawDecisionScore: number;
};

export type FraudTransaction = {
  id: string;
  date: string;
  customer: string;
  amount: number;
  channel: string;
  riskScore: number;
  status: string;
};

export type FraudMetrics = {
  totalTransactions: number;
  flaggedSuspicious: number;
  highRiskClients: number;
  averageRiskScore: number;
};

export async function scoreTransaction(payload: FraudScoreRequest): Promise<FraudScoreResponse> {
  const res = await axios.post(`${API_BASE_URL}/api/fraud/score`, payload);
  const raw = res.data as any;
  return {
    fraudProbability: raw.fraudProbability ?? raw.fraud_probability ?? 0,
    riskScore: raw.riskScore ?? raw.risk_score ?? 0,
    riskLevel: raw.riskLevel ?? raw.risk_level ?? "UNKNOWN",
    isAnomaly: raw.isAnomaly ?? raw.is_anomaly ?? false,
    rawDecisionScore: raw.rawDecisionScore ?? raw.raw_decision_score ?? 0,
  };
}

export async function fetchFraudTransactions(): Promise<FraudTransaction[]> {
  const res = await axios.get<FraudTransaction[]>(`${API_BASE_URL}/api/fraud/transactions`);
  return res.data;
}

export async function fetchFraudMetrics(): Promise<FraudMetrics> {
  const res = await axios.get(`${API_BASE_URL}/api/fraud/metrics`);
  const raw = res.data as any;
  return {
    totalTransactions: raw.totalTransactions ?? raw.total_transactions ?? 0,
    flaggedSuspicious: raw.flaggedSuspicious ?? raw.flagged_suspicious ?? 0,
    highRiskClients: raw.highRiskClients ?? raw.high_risk_clients ?? 0,
    averageRiskScore: raw.averageRiskScore ?? raw.average_risk_score ?? 0,
  };
}
