import { useState, useEffect, useCallback } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import {
  Search,
  MessageSquare,
  ChevronRight,
  UserPlus,
  ArrowUpRight,
  FileText,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  Clock,
  Send,
  Loader2,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/shared/Card";
import { KPICard } from "@/components/shared/KPICard";
import { SentimentBadge, Badge } from "@/components/shared/Badge";
import { SentimentBars, ProgressBar } from "@/components/shared/ProgressBar";
import { sentimentTrend, issueDistribution, agents } from "@/data/mockData";
import {
  analyzeSentiment,
  analyzeSentimentBatch,
  type SentimentResult,
} from "@/api/sentimentApi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ── Default messages to analyze on load ──
const DEFAULT_MESSAGES = [
  {
    id: "MSG001",
    customer: "Rahul Verma",
    message:
      "I have been trying to use my card for the past 2 hours but it keeps getting declined. This is extremely frustrating! I am standing at a store and this is causing me huge embarrassment. Please fix this immediately or I will have to switch banks.",
  },
  {
    id: "MSG002",
    customer: "Meera Iyer",
    message:
      "Thank you so much for the quick resolution of my loan query. Your team is amazing! I really appreciate the help provided by your customer service executive Arun. He was very patient and explained everything clearly.",
  },
  {
    id: "MSG003",
    customer: "Suresh Menon",
    message:
      "My UPI transaction of Rs. 5000 failed but money was debited from my account. The transaction ID is UPI12345678. This happened yesterday evening around 7 PM. Please help me recover my money.",
  },
  {
    id: "MSG004",
    customer: "Kavita Nair",
    message:
      "What are the documents required for home loan application? Also want to know the current interest rates and processing fees. I am planning to buy a flat worth 80 lakhs in Bangalore.",
  },
  {
    id: "MSG005",
    customer: "Arjun Reddy",
    message:
      "I need to update my KYC documents as my address has changed. Can I do it online through net banking or do I need to visit the branch? If branch visit is required, what documents should I carry?",
  },
  {
    id: "MSG006",
    customer: "Pooja Shah",
    message:
      "This is the worst banking experience ever. My account was blocked without any notice and I have been running from pillar to post for 3 days now. No one is able to tell me why it was blocked. I have salary credit pending and bills to pay. This is absolutely unacceptable!",
  },
];

// ── MessagesInbox ──
function MessagesInbox() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("All");
  const [issueFilter, setIssueFilter] = useState("All");
  const [messages, setMessages] = useState<SentimentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New message input
  const [newMessage, setNewMessage] = useState("");
  const [newCustomer, setNewCustomer] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await analyzeSentimentBatch(DEFAULT_MESSAGES);
      setMessages(results);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setError("Failed to connect to ML service. Make sure all backend services are running.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeNew = async () => {
    if (!newMessage.trim()) return;
    setAnalyzing(true);
    try {
      const result = await analyzeSentiment(
        newMessage,
        newCustomer || "New Customer",
        `MSG${Date.now()}`
      );
      setMessages((prev) => [result, ...prev]);
      setNewMessage("");
      setNewCustomer("");
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSentiment =
      sentimentFilter === "All" || msg.sentiment === sentimentFilter;
    const matchesIssue = issueFilter === "All" || msg.issue === issueFilter;
    return matchesSearch && matchesSentiment && matchesIssue;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">
          Analyzing messages with DistilBERT...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium">{error}</p>
          <button onClick={loadMessages} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Live Analysis Input ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Live Message Analysis (DistilBERT)
          </CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Customer name"
              value={newCustomer}
              onChange={(e) => setNewCustomer(e.target.value)}
              className="input-banking text-sm"
            />
            <div className="md:col-span-3 flex gap-2">
              <textarea
                placeholder="Type a customer message to analyze sentiment and classify issue..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="input-banking text-sm flex-1 min-h-[42px] max-h-[120px]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAnalyzeNew();
                  }
                }}
              />
              <button
                onClick={handleAnalyzeNew}
                disabled={analyzing || !newMessage.trim()}
                className="btn-primary px-4 self-end"
              >
                {analyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <Card className="lg:col-span-1">
          <h3 className="font-semibold mb-4">Filters</h3>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-banking pl-10 text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Sentiment
              </label>
              <div className="flex flex-wrap gap-2">
                {["All", "Positive", "Neutral", "Negative"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSentimentFilter(s)}
                    className={cn(
                      "chip",
                      sentimentFilter === s && "active"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Issue Type
              </label>
              <select
                value={issueFilter}
                onChange={(e) => setIssueFilter(e.target.value)}
                className="input-banking text-sm"
              >
                <option value="All">All Issues</option>
                <option value="Card Issues">Card Issues</option>
                <option value="Loan Queries">Loan Queries</option>
                <option value="UPI Failures">UPI Failures</option>
                <option value="KYC">KYC</option>
                <option value="Account Issues">Account Issues</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Messages List */}
        <div className="lg:col-span-3 space-y-3">
          {filteredMessages.length === 0 ? (
            <Card>
              <p className="text-center text-muted-foreground py-8">
                No messages match your filters.
              </p>
            </Card>
          ) : (
            filteredMessages.map((msg) => (
              <Card
                key={msg.id}
                className="cursor-pointer hover:shadow-elevated transition-all"
                padding="none"
                onClick={() =>
                  navigate(`/sentiment-crm/message/${msg.id}`, {
                    state: { message: msg },
                  })
                }
              >
                <div className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary">
                      {msg.customer
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium">{msg.customer}</span>
                      <SentimentBadge
                        sentiment={msg.sentiment}
                      />
                      <Badge>{msg.issue}</Badge>
                      <Badge variant="outline">{msg.sub_issue}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {msg.message}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          Sentiment:
                        </span>
                        <div className="w-16">
                          <ProgressBar
                            value={msg.confidence}
                            size="sm"
                            color="primary"
                          />
                        </div>
                        <span className="text-xs font-medium">
                          {msg.confidence}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          Issue:
                        </span>
                        <span className="text-xs font-medium">
                          {msg.issue_confidence}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── MessageDetail ──
function MessageDetail() {
  const [showAssign, setShowAssign] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  // Get the message from navigation state, or analyze default
  const [message, setMessage] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get from navigation state
    const navState = window.history.state?.usr?.message;
    if (navState) {
      setMessage(navState);
      setLoading(false);
    } else {
      // Fallback: analyze the first default message
      analyzeSentiment(
        DEFAULT_MESSAGES[0].message,
        DEFAULT_MESSAGES[0].customer,
        DEFAULT_MESSAGES[0].id
      ).then((result) => {
        setMessage(result);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, []);

  if (loading || !message) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Analyzing with DistilBERT...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Message Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {message.customer
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold">{message.customer}</h3>
              <p className="text-sm text-muted-foreground">ID: {message.id}</p>
            </div>
          </div>
        </CardHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-foreground leading-relaxed">
              {message.message.split(" ").map((word, i) => {
                const isHighlighted = message.highlighted_words.some((hw) =>
                  word.toLowerCase().includes(hw.toLowerCase())
                );
                return (
                  <span
                    key={i}
                    className={
                      isHighlighted
                        ? message.sentiment === "Positive"
                          ? "bg-success/20 text-success px-0.5 rounded"
                          : "bg-destructive/20 text-destructive px-0.5 rounded"
                        : ""
                    }
                  >
                    {word}{" "}
                  </span>
                );
              })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge>{message.issue}</Badge>
            <Badge variant="outline">{message.sub_issue}</Badge>
            <span className="text-xs text-muted-foreground ml-2">
              Issue confidence: {message.issue_confidence}%
            </span>
          </div>
        </div>
      </Card>

      {/* AI Analysis & Actions */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Sentiment Analysis (DistilBERT)
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Predicted:</span>
              <SentimentBadge sentiment={message.sentiment} />
              <span className="text-sm text-muted-foreground ml-2">
                ({message.confidence}% confidence)
              </span>
            </div>
            <SentimentBars
              positive={message.sentiment_scores.positive}
              neutral={message.sentiment_scores.neutral}
              negative={message.sentiment_scores.negative}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Issue Classification (DistilBERT)
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Issue</span>
              <span className="font-medium">{message.issue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Sub-issue</span>
              <span className="font-medium">{message.sub_issue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Confidence</span>
              <span className="font-medium">{message.issue_confidence}%</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            <div className="relative">
              <button
                onClick={() => setShowAssign(!showAssign)}
                className="btn-secondary w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Assign
                </span>
                <ChevronRight
                  className={cn(
                    "w-4 h-4 transition-transform",
                    showAssign && "rotate-90"
                  )}
                />
              </button>
              {showAssign && (
                <div className="mt-2 p-2 bg-muted rounded-lg space-y-1">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-background transition-colors text-sm"
                    >
                      <span className="font-medium">{agent.name}</span>
                      <span className="text-muted-foreground ml-2">
                        ({agent.department})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn-outline w-full justify-start">
              <ArrowUpRight className="w-4 h-4" />
              Escalate
            </button>
            <button
              onClick={() => setShowNote(!showNote)}
              className="btn-outline w-full justify-start"
            >
              <FileText className="w-4 h-4" />
              Add Note
            </button>
            {showNote && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add your note here..."
                className="input-banking text-sm min-h-[80px]"
              />
            )}
            <button className="btn-primary w-full justify-start">
              <CheckCircle className="w-4 h-4" />
              Mark as Resolved
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── ManagerDashboard ──
function ManagerDashboard() {
  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--success))",
    "hsl(var(--warning))",
    "hsl(var(--destructive))",
    "hsl(var(--muted-foreground))",
  ];

  const [messages, setMessages] = useState<SentimentResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeSentimentBatch(DEFAULT_MESSAGES)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const negativeCount = messages.filter((m) => m.sentiment === "Negative").length;
  const lowConfidenceMessages = messages.filter((m) => m.confidence < 90);

  // Build issue distribution from real results
  const issueCounts: Record<string, number> = {};
  messages.forEach((m) => {
    issueCounts[m.issue] = (issueCounts[m.issue] || 0) + 1;
  });
  const realIssueDistribution = Object.entries(issueCounts).map(
    ([issue, count]) => ({
      issue,
      count,
      percentage: Math.round((count / messages.length) * 100),
    })
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Messages"
          value={String(messages.length)}
          icon={MessageSquare}
          accentColor="primary"
        />
        <KPICard
          title="% Negative"
          value={`${messages.length > 0 ? Math.round((negativeCount / messages.length) * 100) : 0}%`}
          icon={AlertCircle}
          accentColor="destructive"
        />
        <KPICard
          title="Avg Confidence"
          value={`${messages.length > 0 ? Math.round(messages.reduce((a, m) => a + m.confidence, 0) / messages.length) : 0}%`}
          icon={Brain}
          accentColor="accent"
        />
        <KPICard
          title="Low Confidence"
          value={String(lowConfidenceMessages.length)}
          icon={TrendingUp}
          accentColor="warning"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="positive"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--success))" }}
                />
                <Line
                  type="monotone"
                  dataKey="neutral"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
                <Line
                  type="monotone"
                  dataKey="negative"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--destructive))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">Positive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">Neutral</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-sm text-muted-foreground">Negative</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issue Distribution (AI Classified)</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={
                    realIssueDistribution.length > 0
                      ? realIssueDistribution
                      : issueDistribution
                  }
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                  label={({ issue, percentage }) =>
                    `${issue} (${percentage}%)`
                  }
                  labelLine={false}
                >
                  {(realIssueDistribution.length > 0
                    ? realIssueDistribution
                    : issueDistribution
                  ).map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Low Confidence Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Low Confidence Predictions ({"<"}90%)</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="table-banking">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Message Preview</th>
                <th>Predicted Sentiment</th>
                <th>Confidence</th>
                <th>Issue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lowConfidenceMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground">
                    All predictions are above 90% confidence
                  </td>
                </tr>
              ) : (
                lowConfidenceMessages.map((msg) => (
                  <tr key={msg.id}>
                    <td className="font-medium">{msg.customer}</td>
                    <td className="text-muted-foreground max-w-xs truncate">
                      {msg.message.slice(0, 80)}...
                    </td>
                    <td>
                      <SentimentBadge sentiment={msg.sentiment} />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={msg.confidence}
                          size="sm"
                          color="warning"
                        />
                        <span className="text-sm font-medium">
                          {msg.confidence}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge>{msg.issue}</Badge>
                    </td>
                    <td>
                      <button className="btn-outline text-sm py-1 px-3">
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Main CRM Component ──
export default function SentimentCRM() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Sentiment Analysis CRM
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-powered sentiment analysis and issue classification using DistilBERT
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1">
          <NavLink
            to="/sentiment-crm"
            end
            className={({ isActive }) =>
              cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            Messages Inbox
          </NavLink>
          <NavLink
            to="/sentiment-crm/message/MSG001"
            className={({ isActive }) =>
              cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            Message Detail
          </NavLink>
          <NavLink
            to="/sentiment-crm/dashboard"
            className={({ isActive }) =>
              cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            Manager Dashboard
          </NavLink>
        </nav>
      </div>

      {/* Nested Routes */}
      <Routes>
        <Route index element={<MessagesInbox />} />
        <Route path="message/:id" element={<MessageDetail />} />
        <Route path="dashboard" element={<ManagerDashboard />} />
      </Routes>
    </div>
  );
}
