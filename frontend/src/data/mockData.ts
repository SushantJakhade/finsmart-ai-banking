// Mock data for the AI Banking Intelligence Suite

export const fraudTransactions = [
  { id: "TXN001", date: "2024-01-15 14:32", customer: "Rajesh Kumar", amount: 125000, channel: "UPI", riskScore: 92, status: "Under Review" },
  { id: "TXN002", date: "2024-01-15 13:45", customer: "Priya Sharma", amount: 89000, channel: "NEFT", riskScore: 78, status: "Under Review" },
  { id: "TXN003", date: "2024-01-15 12:20", customer: "Amit Patel", amount: 250000, channel: "IMPS", riskScore: 85, status: "Blocked" },
  { id: "TXN004", date: "2024-01-15 11:55", customer: "Sneha Reddy", amount: 45000, channel: "Card", riskScore: 65, status: "Under Review" },
  { id: "TXN005", date: "2024-01-15 10:30", customer: "Vikram Singh", amount: 180000, channel: "UPI", riskScore: 88, status: "Under Review" },
  { id: "TXN006", date: "2024-01-15 09:15", customer: "Anita Desai", amount: 32000, channel: "NEFT", riskScore: 42, status: "Cleared" },
  { id: "TXN007", date: "2024-01-15 08:45", customer: "Kiran Rao", amount: 95000, channel: "IMPS", riskScore: 71, status: "Under Review" },
  { id: "TXN008", date: "2024-01-14 18:22", customer: "Deepak Joshi", amount: 150000, channel: "Card", riskScore: 95, status: "Blocked" },
];

export const transactionDetails = {
  TXN001: {
    sender: "Rajesh Kumar",
    senderAccount: "XXXX-XXXX-1234",
    receiver: "Unknown Merchant",
    receiverAccount: "XXXX-XXXX-5678",
    geoLocation: "Mumbai, Maharashtra",
    deviceInfo: "iPhone 14 Pro, iOS 17.2",
    ipAddress: "103.45.xx.xx",
    riskExplanation: "Unusual transaction amount compared to past 30-day behavior. Transaction initiated from new device. Recipient account flagged in previous fraud cases.",
  },
};

export const riskDistribution = [
  { band: "Low (0-40)", count: 1245, color: "hsl(var(--success))" },
  { band: "Medium (41-70)", count: 342, color: "hsl(var(--warning))" },
  { band: "High (71-100)", count: 89, color: "hsl(var(--destructive))" },
];

export const fraudAlertsOverTime = [
  { day: "Mon", alerts: 12 },
  { day: "Tue", alerts: 19 },
  { day: "Wed", alerts: 8 },
  { day: "Thu", alerts: 15 },
  { day: "Fri", alerts: 22 },
  { day: "Sat", alerts: 6 },
  { day: "Sun", alerts: 4 },
];

// CRM Messages Data
export const crmMessages = [
  {
    id: "MSG001",
    customer: "Rahul Verma",
    avatar: "RV",
    preview: "I have been trying to use my card for the past 2 hours but it keeps getting declined. This is extremely frustrating!",
    fullMessage: "I have been trying to use my card for the past 2 hours but it keeps getting declined. This is extremely frustrating! I am standing at a store and this is causing me huge embarrassment. Please fix this immediately or I will have to switch banks.",
    timestamp: "10 mins ago",
    sentiment: "Negative",
    issue: "Card Declined",
    subIssue: "Card Declined at POS",
    confidence: 94,
    sentimentScores: { positive: 5, neutral: 8, negative: 87 },
    highlightedWords: ["declined", "frustrating", "embarrassment", "switch banks"],
  },
  {
    id: "MSG002",
    customer: "Meera Iyer",
    avatar: "MI",
    preview: "Thank you so much for the quick resolution of my loan query. Your team is amazing!",
    fullMessage: "Thank you so much for the quick resolution of my loan query. Your team is amazing! I really appreciate the help provided by your customer service executive Arun. He was very patient and explained everything clearly.",
    timestamp: "25 mins ago",
    sentiment: "Positive",
    issue: "Loan Query",
    subIssue: "Loan Status Inquiry",
    confidence: 96,
    sentimentScores: { positive: 92, neutral: 6, negative: 2 },
    highlightedWords: ["Thank you", "amazing", "appreciate", "patient"],
  },
  {
    id: "MSG003",
    customer: "Suresh Menon",
    avatar: "SM",
    preview: "My UPI transaction failed but money was debited from my account. Please help.",
    fullMessage: "My UPI transaction of Rs. 5000 failed but money was debited from my account. The transaction ID is UPI12345678. This happened yesterday evening around 7 PM. Please help me recover my money.",
    timestamp: "1 hour ago",
    sentiment: "Negative",
    issue: "UPI Failure",
    subIssue: "Failed Transaction - Amount Debited",
    confidence: 89,
    sentimentScores: { positive: 3, neutral: 22, negative: 75 },
    highlightedWords: ["failed", "debited", "recover my money"],
  },
  {
    id: "MSG004",
    customer: "Kavita Nair",
    avatar: "KN",
    preview: "What are the documents required for home loan application? Also want to know the interest rates.",
    fullMessage: "What are the documents required for home loan application? Also want to know the current interest rates and processing fees. I am planning to buy a flat worth 80 lakhs in Bangalore.",
    timestamp: "2 hours ago",
    sentiment: "Neutral",
    issue: "Loan Query",
    subIssue: "Home Loan Inquiry",
    confidence: 91,
    sentimentScores: { positive: 15, neutral: 78, negative: 7 },
    highlightedWords: [],
  },
  {
    id: "MSG005",
    customer: "Arjun Reddy",
    avatar: "AR",
    preview: "I need to update my KYC documents. Can I do it online or do I need to visit the branch?",
    fullMessage: "I need to update my KYC documents as my address has changed. Can I do it online through net banking or do I need to visit the branch? If branch visit is required, what documents should I carry?",
    timestamp: "3 hours ago",
    sentiment: "Neutral",
    issue: "KYC",
    subIssue: "KYC Update",
    confidence: 88,
    sentimentScores: { positive: 10, neutral: 82, negative: 8 },
    highlightedWords: [],
  },
  {
    id: "MSG006",
    customer: "Pooja Shah",
    avatar: "PS",
    preview: "This is the worst banking experience ever. My account was blocked without any notice!",
    fullMessage: "This is the worst banking experience ever. My account was blocked without any notice and I have been running from pillar to post for 3 days now. No one is able to tell me why it was blocked. I have salary credit pending and bills to pay. This is absolutely unacceptable!",
    timestamp: "4 hours ago",
    sentiment: "Negative",
    issue: "Account Issue",
    subIssue: "Account Blocked",
    confidence: 97,
    sentimentScores: { positive: 1, neutral: 4, negative: 95 },
    highlightedWords: ["worst", "blocked", "unacceptable", "running from pillar to post"],
  },
];

export const sentimentTrend = [
  { date: "Jan 9", positive: 45, neutral: 120, negative: 35 },
  { date: "Jan 10", positive: 52, neutral: 115, negative: 42 },
  { date: "Jan 11", positive: 48, neutral: 108, negative: 38 },
  { date: "Jan 12", positive: 55, neutral: 125, negative: 30 },
  { date: "Jan 13", positive: 42, neutral: 110, negative: 48 },
  { date: "Jan 14", positive: 58, neutral: 118, negative: 35 },
  { date: "Jan 15", positive: 50, neutral: 122, negative: 40 },
];

export const issueDistribution = [
  { issue: "Card Issues", count: 145, percentage: 28 },
  { issue: "UPI Failures", count: 98, percentage: 19 },
  { issue: "Loan Queries", count: 87, percentage: 17 },
  { issue: "KYC", count: 72, percentage: 14 },
  { issue: "Account Issues", count: 65, percentage: 13 },
  { issue: "General", count: 48, percentage: 9 },
];

// Regulation Data
export const regulations = [
  {
    id: "REG001",
    title: "RBI Circular on KYC 2024",
    regulator: "RBI",
    date: "2024-01-10",
    referenceId: "RBI/2024-25/45",
    riskLevel: "High",
    clauses: [
      "All banks must complete Video KYC for new accounts within 48 hours",
      "Periodic KYC update required every 2 years for all accounts",
      "Digital KYC records must be maintained for minimum 10 years",
    ],
    impactedAreas: ["KYC Process", "Customer Onboarding", "Document Management"],
    riskPoints: [
      { clause: "Video KYC within 48 hours", riskType: "Operational Risk", action: "Increase video KYC capacity by 50%" },
      { clause: "10 year record retention", riskType: "Storage Compliance", action: "Review current retention policy" },
    ],
  },
  {
    id: "REG002",
    title: "SEBI Guidelines on Digital Payments",
    regulator: "SEBI",
    date: "2024-01-08",
    referenceId: "SEBI/HO/MRD/2024/001",
    riskLevel: "Medium",
    clauses: [
      "Enhanced transaction monitoring for amounts above Rs. 50 lakhs",
      "Real-time reporting of suspicious transactions mandatory",
    ],
    impactedAreas: ["Transaction Monitoring", "Reporting"],
    riskPoints: [
      { clause: "Real-time reporting", riskType: "Technology Gap", action: "Implement real-time reporting system" },
    ],
  },
  {
    id: "REG003",
    title: "GST Compliance Update",
    regulator: "GST",
    date: "2024-01-05",
    referenceId: "GST/2024/CIR-198",
    riskLevel: "Low",
    clauses: [
      "Monthly GST filing deadline extended to 20th of each month",
      "New format for GST returns applicable from April 2024",
    ],
    impactedAreas: ["Tax Compliance", "Reporting Timelines"],
    riskPoints: [],
  },
  {
    id: "REG004",
    title: "RBI Master Direction on Fraud Classification",
    regulator: "RBI",
    date: "2024-01-02",
    referenceId: "RBI/DBR/2024/12",
    riskLevel: "High",
    clauses: [
      "Fraud reporting timeline reduced to 7 days from detection",
      "Mandatory quarterly fraud analysis report to board",
      "Enhanced due diligence for transactions above Rs. 10 lakhs",
    ],
    impactedAreas: ["Fraud Management", "Board Reporting", "Transaction Monitoring"],
    riskPoints: [
      { clause: "7-day fraud reporting", riskType: "Compliance Risk", action: "Update fraud reporting workflow" },
      { clause: "Quarterly board report", riskType: "Governance", action: "Create automated board report template" },
    ],
  },
];

// Agents for CRM
export const agents = [
  { id: "AGT001", name: "Arun Kumar", department: "Card Services" },
  { id: "AGT002", name: "Priya Menon", department: "Loan Department" },
  { id: "AGT003", name: "Sanjay Gupta", department: "Digital Banking" },
  { id: "AGT004", name: "Neha Sharma", department: "Customer Support" },
];

// Loan cross-sell products
export const loanProducts = [
  { name: "Personal Loan - Silver", acceptance: 68, interestRate: "12.5%", maxAmount: "₹5 Lakhs" },
  { name: "Personal Loan - Gold", acceptance: 52, interestRate: "11.5%", maxAmount: "₹10 Lakhs" },
  { name: "Credit Card - Platinum", acceptance: 45, interestRate: "N/A", maxAmount: "₹2 Lakhs limit" },
  { name: "Home Loan - Flexi", acceptance: 38, interestRate: "8.5%", maxAmount: "₹50 Lakhs" },
];

// Chatbot responses
export const chatResponses: Record<string, string> = {
  "balance": "Your current account balance is ₹45,230.50. Your savings account has ₹1,25,000. Would you like me to show recent transactions?",
  "transactions": "Here are your last 5 transactions:\n1. ₹2,500 - Swiggy - Jan 15\n2. ₹15,000 - Rent Transfer - Jan 12\n3. ₹890 - Amazon - Jan 10\n4. ₹5,000 - ATM Withdrawal - Jan 8\n5. ₹3,200 - Electricity Bill - Jan 5",
  "home loan": "Our current home loan interest rates start from 8.5% p.a. We offer:\n• Loan amount up to ₹5 Cr\n• Tenure up to 30 years\n• Processing fee: 0.5%\nWould you like me to connect you with a home loan specialist?",
  "branch": "The nearest branch to your registered address is:\n\n**Main Branch - Koramangala**\n123 Service Road, Koramangala\nBengaluru - 560034\n\nTimings: 10 AM - 4 PM (Mon-Sat)\nPhone: 080-12345678",
  "card lost": "I'm sorry to hear that. Here's what to do immediately:\n\n1. **Block your card** - I can do this for you right now\n2. **File a complaint** - For unauthorized transactions\n3. **Request replacement** - New card in 5-7 days\n\nShall I block your card now?",
  "default": "I understand you're asking about banking services. Could you please provide more details? I can help you with:\n• Account balance & transactions\n• Loan information\n• Branch locations\n• Card services\n• General FAQs",
};
