import axios from "axios";

const API_BASE_URL = "http://localhost:5200";

export type LoanScoreRequest = {
  applicantIncome: number;
  coapplicantIncome: number;
  loanAmount: number;
  tenureMonths: number;
  creditScore: number;
  existingLoans: number;
  employmentYears: number;
  age: number;
  propertyArea: number;
  education: number;
  married: number;
  dependents: number;
  modelName: string;
};

export type LoanScoreResponse = {
  defaultProbability: number;
  riskScore: number;
  riskLevel: string;
  prediction: string;
  model_used: string;
  probabilities: Record<string, number>;
};

export type LoanAllModelsResponse = Record<string, {
  defaultProbability: number;
  riskScore: number;
  riskLevel: string;
  prediction: string;
  probabilities: Record<string, number>;
}>;

export type LoanPerClassMetric = {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
};

export type LoanModelMetric = {
  accuracy: number;
  auc_roc: number;
  cv_accuracy_mean: number;
  cv_accuracy_std: number;
  confusion_matrix: number[][];
  per_class: Record<string, LoanPerClassMetric>;
};

export type LoanAllMetrics = Record<string, LoanModelMetric>;

export type LoanDatasetStats = {
  total_records: number;
  total_features: number;
  default_rate: number;
  models_available: string[];
};

export async function scoreLoan(payload: LoanScoreRequest): Promise<LoanScoreResponse> {
  const res = await axios.post<LoanScoreResponse>(`${API_BASE_URL}/api/loan/score`, payload);
  return res.data;
}

export async function scoreLoanAllModels(payload: LoanScoreRequest): Promise<LoanAllModelsResponse> {
  const res = await axios.post<LoanAllModelsResponse>(`${API_BASE_URL}/api/loan/score-all`, payload);
  return res.data;
}

export async function fetchLoanMetrics(): Promise<LoanAllMetrics> {
  const res = await axios.get<LoanAllMetrics>(`${API_BASE_URL}/api/loan/metrics`);
  return res.data;
}

export async function fetchLoanDatasetStats(): Promise<LoanDatasetStats> {
  const res = await axios.get<LoanDatasetStats>(`${API_BASE_URL}/api/loan/dataset-stats`);
  return res.data;
}
