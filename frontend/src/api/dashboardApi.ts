import axios from "axios";

const API_BASE_URL = "http://localhost:5200";

export type RecentAlert = {
  customerId: string;
  message: string;
  riskLevel: string;
  riskScore: number;
};

export type DashboardSummary = {
  totalCustomers: number;
  highRiskCount: number;
  flaggedCount: number;
  systemHealth: number;
  aiAccuracy: number;
  recentAlerts: RecentAlert[];
};

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await axios.get<DashboardSummary>(
    `${API_BASE_URL}/api/dashboard/summary`
  );
  return res.data;
}
