# FinSmart - AI Banking Intelligence Suite

A full-stack AI-powered banking intelligence platform that combines multiple machine learning models for customer risk assessment, loan default prediction, fraud detection, and sentiment analysis.

## Features

### 1. Customer Risk Assessment
- Classifies customers into **High / Medium / Low** risk using KYC, POI, POA, and compliance data
- **5 ML models**: Random Forest, XGBoost, Logistic Regression, SVM, Binary High-Risk Classifier
- Live scoring form with real-time multi-model comparison
- Searchable customer risk table with filters
- Risk distribution charts (bar + pie)

### 2. Loan Default Prediction
- Predicts loan default probability using applicant financial profile
- **5 ML models**: XGBoost (86%), Gradient Boosting (86.7%), Random Forest (82%), Logistic Regression, Ensemble Voting Classifier
- **SMOTE oversampling** to handle class imbalance
- 22 features including 10 engineered features (DTI ratio, EMI estimates, risk flags)
- Live scoring with 12 input fields + all-models comparison
- AUC-ROC and accuracy charts, per-model confusion matrices

### 3. Fraud Detection Dashboard
- Transaction-level fraud detection using **Isolation Forest** anomaly detection
- Live transaction fraud scoring (amount, type, country, payment mode)
- Transaction monitoring table with status filters
- KPI cards: total transactions, flagged suspicious, high-risk clients
- Status distribution and channel breakdown charts

### 4. Sentiment Analysis CRM
- Customer message sentiment analysis using **DistilBERT** (pre-trained SST-2)
- Issue classification using **fine-tuned DistilBERT** (7 banking categories)
- Sub-issue detection with keyword matching
- Message inbox with sentiment/issue filters
- Highlighted positive/negative keywords

### 5. Model Comparison Dashboard
- Side-by-side comparison of all risk assessment models
- Per-class metrics: Precision, Recall, F1-Score
- Radar chart for F1-score across risk classes
- Confusion matrices for each model
- Cross-validation scores

### 6. AI Chatbot Assistant
- Conversational interface for banking queries
- Quick action buttons and message history

### 7. Regulation NLP Monitor
- Scans RBI, SEBI, GST regulations for compliance risks
- Filter by regulator and risk level

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** (60+ components)
- **Recharts** for data visualization
- **TanStack React Query** for data fetching
- **React Router DOM** for navigation
- **React Hook Form** + **Zod** for validation

### Backend API
- **ASP.NET Core 10** (C#)
- Proxies requests to Python ML service
- CORS configured for frontend dev server

### ML Service
- **FastAPI** + **Uvicorn** (Python)
- **scikit-learn** - Random Forest, Logistic Regression, SVM, Gradient Boosting
- **XGBoost** - Gradient boosted trees
- **imbalanced-learn** - SMOTE oversampling
- **Transformers (HuggingFace)** - DistilBERT for sentiment & issue classification
- **PyTorch** - Deep learning backend for transformers

## Architecture

```
Frontend (React/Vite)  :8080
       |
       v
.NET Backend API       :5200
       |
       v
Python ML Service      :5050
       |
       v
Trained Models (.joblib, DistilBERT)
```

## Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **.NET SDK** 10.0+
- **Python** 3.10+ with pip
- **Git**

### 1. Clone the repository
```bash
git clone https://github.com/SushantJakhade/finsmart-ai-banking.git
cd finsmart-ai-banking
```

### 2. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 3. Train ML models
```bash
cd backend/ml

# Train customer risk models (requires dataset_risk.xlsx)
python train_risk_models.py

# Train loan default models (generates synthetic data)
python train_loan_default_models.py

# Train sentiment & issue classifier models
python train_sentiment_models.py
```

### 4. Start the Python ML Service
```bash
cd backend/ml
OMP_NUM_THREADS=1 python serve.py
# Runs on http://localhost:5050
```

### 5. Start the .NET Backend
```bash
cd backend
dotnet run --urls "http://localhost:5200"
```

### 6. Start the Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:8080
```

### 7. Open the app
Navigate to **http://localhost:8080** in your browser.

## Project Structure

```
finsmart-ai-banking/
├── frontend/                    # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/              # 8 page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── FraudDetection.tsx      # Customer risk assessment
│   │   │   ├── FraudDashboard.tsx      # Transaction fraud detection
│   │   │   ├── LoanPrediction.tsx      # Loan default prediction
│   │   │   ├── ModelComparison.tsx     # Risk model comparison
│   │   │   ├── SentimentCRM.tsx        # Sentiment analysis
│   │   │   ├── Chatbot.tsx
│   │   │   └── RegulationMonitor.tsx
│   │   ├── api/                # API integration layer
│   │   │   ├── riskApi.ts
│   │   │   ├── fraudApi.ts
│   │   │   ├── loanApi.ts
│   │   │   ├── sentimentApi.ts
│   │   │   └── dashboardApi.ts
│   │   ├── components/         # Reusable UI components
│   │   └── App.tsx             # Routes & layout
│   └── package.json
│
├── backend/                     # .NET Core API + Python ML
│   ├── Controllers/            # API controllers (5)
│   ├── Models/                 # C# DTOs
│   ├── Program.cs              # .NET entry point
│   └── ml/                     # Python ML service
│       ├── serve.py            # FastAPI server (all endpoints)
│       ├── train_risk_models.py
│       ├── train_loan_default_models.py
│       ├── train_sentiment_models.py
│       ├── dataset_risk.xlsx   # Customer risk dataset
│       └── *.json              # Model metrics & config
│
└── requirements.txt            # Python dependencies
```

## API Endpoints

### Risk Assessment
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/risk/score` | Score single customer with selected model |
| POST | `/api/risk/score-all` | Score with all 4 multi-class models |
| GET | `/api/risk/customers` | List top 100 high-risk customers |
| GET | `/api/risk/metrics` | Model accuracy metrics |
| GET | `/api/risk/dataset-stats` | Dataset statistics |

### Loan Default Prediction
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/loan/score` | Predict loan default with selected model |
| POST | `/api/loan/score-all` | Predict with all 5 models |
| GET | `/api/loan/metrics` | Model performance metrics (accuracy, AUC-ROC) |
| GET | `/api/loan/dataset-stats` | Dataset info |

### Fraud Detection
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fraud/score` | Score transaction fraud probability |
| GET | `/api/fraud/transactions` | List recent transactions |
| GET | `/api/fraud/metrics` | Fraud metrics summary |

### Sentiment Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sentiment/analyze` | Analyze single message |
| POST | `/api/sentiment/analyze-batch` | Batch message analysis |
| GET | `/api/sentiment/metrics` | Model metrics |

## Model Performance

### Customer Risk Assessment
| Model | Accuracy | CV Accuracy |
|-------|----------|-------------|
| SVM | 67.98% | 67.06% |
| Logistic Regression | 67.78% | 66.35% |
| Random Forest | 67.63% | 67.75% |
| XGBoost | 67.28% | 67.12% |
| Binary High Risk | 100% | 100% |

### Loan Default Prediction
| Model | Accuracy | AUC-ROC | CV Accuracy |
|-------|----------|---------|-------------|
| Gradient Boosting | 86.70% | 64.29% | 86.96% |
| XGBoost | 86.00% | 63.87% | 87.04% |
| Ensemble (Voting) | 86.00% | 64.06% | 87.24% |
| Random Forest | 82.00% | 62.89% | 87.30% |
| Logistic Regression | 65.00% | 61.27% | 67.76% |

## Techniques Used for Accuracy Improvement

- **SMOTE Oversampling** - Synthetic Minority Over-sampling to balance classes
- **Feature Engineering** - 10+ engineered features (DTI ratio, risk flags, compliance scores, interaction features)
- **Class Weighting** - `balanced_subsample` for RF, sample weights for XGBoost
- **Ensemble Methods** - Soft voting classifier combining top 3 models
- **Cross-Validation** - 5-fold stratified K-fold for reliable evaluation
- **Hyperparameter Tuning** - Optimized estimators, depth, learning rate, regularization

## License

This project is for educational and demonstration purposes.
