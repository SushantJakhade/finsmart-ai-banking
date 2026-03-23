import axios from "axios";

const API_BASE = "http://localhost:5200/api/sentiment";

export interface SentimentScores {
  positive: number;
  neutral: number;
  negative: number;
}

export interface SentimentResult {
  id: string;
  customer: string;
  message: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  confidence: number;
  sentiment_scores: SentimentScores;
  issue: string;
  sub_issue: string;
  issue_confidence: number;
  highlighted_words: string[];
}

export interface SentimentMetrics {
  issue_classifier: {
    type: string;
    accuracy: number;
    categories: string[];
    total_training_samples: number;
  };
  sentiment_model: {
    type: string;
    description: string;
  };
}

export async function analyzeSentiment(
  message: string,
  customer?: string,
  id?: string
): Promise<SentimentResult> {
  const res = await axios.post<SentimentResult>(`${API_BASE}/analyze`, {
    message,
    customer: customer || "Unknown",
    id: id || undefined,
  });
  return res.data;
}

export async function analyzeSentimentBatch(
  messages: { message: string; customer?: string; id?: string }[]
): Promise<SentimentResult[]> {
  const res = await axios.post<SentimentResult[]>(`${API_BASE}/analyze-batch`, {
    messages,
  });
  return res.data;
}

export async function fetchSentimentMetrics(): Promise<SentimentMetrics> {
  const res = await axios.get<SentimentMetrics>(`${API_BASE}/metrics`);
  return res.data;
}
