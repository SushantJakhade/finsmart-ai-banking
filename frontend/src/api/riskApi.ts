import axios from "axios";

const API_BASE_URL = "http://localhost:5200";

export type RiskScoreRequest = {
  account_age: number;
  account_type: number;
  kyc: number;
  rkyc: number;
  is_punished: number;
  govt_defaulter: number;
  constitution_type: string;
  customer_type: number;
  customer_status: number;
  category: number;
  is_blacklisted: number;
  poi: number;
  poa: string;
  customer_special: string;
  account_status: number;
  poi_alt: number;
  model_name: string;
};

export type RiskScoreResponse = {
  risk_level: string;
  risk_level_code: number;
  confidence: number;
  risk_score: number;
  probabilities: Record<string, number>;
  model_used: string;
};

export type ModelResult = {
  risk_level: string;
  risk_level_code: number;
  confidence: number;
  risk_score: number;
  probabilities: Record<string, number>;
};

export type AllModelsResponse = Record<string, ModelResult>;

export type CustomerRow = {
  id: string;
  customer_id: number;
  account_age: number;
  account_type: number;
  kyc: boolean;
  rkyc: boolean;
  is_punished: boolean;
  govt_defaulter: boolean;
  is_blacklisted: boolean;
  poa: string;
  risk_level: string;
  risk_score: number;
  status: string;
};

export type PerClassMetric = {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
};

export type ModelMetric = {
  accuracy: number;
  confusion_matrix: number[][];
  per_class: Record<string, PerClassMetric>;
};

export type AllMetrics = Record<string, ModelMetric>;

export type DatasetStats = {
  total_records: number;
  total_features: number;
  risk_distribution: Record<string, number>;
  models_available: string[];
};

export async function scoreRisk(payload: RiskScoreRequest): Promise<RiskScoreResponse> {
  const res = await axios.post<RiskScoreResponse>(`${API_BASE_URL}/api/risk/score`, payload);
  return res.data;
}

export async function scoreAllModels(payload: RiskScoreRequest): Promise<AllModelsResponse> {
  const res = await axios.post<AllModelsResponse>(`${API_BASE_URL}/api/risk/score-all`, payload);
  return res.data;
}

export async function fetchCustomers(): Promise<CustomerRow[]> {
  const res = await axios.get<CustomerRow[]>(`${API_BASE_URL}/api/risk/customers`);
  return res.data;
}

export async function fetchModelMetrics(): Promise<AllMetrics> {
  const res = await axios.get<AllMetrics>(`${API_BASE_URL}/api/risk/metrics`);
  return res.data;
}

export async function fetchDatasetStats(): Promise<DatasetStats> {
  const res = await axios.get<DatasetStats>(`${API_BASE_URL}/api/risk/dataset-stats`);
  return res.data;
}
