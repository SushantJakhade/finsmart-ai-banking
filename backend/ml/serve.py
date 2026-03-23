"""
FinSmart ML Service — Single-file entry point.
Run: python serve.py

Loads all models (Risk + Loan Default + Fraud + Sentiment),
then starts FastAPI/uvicorn server on port 5050.
"""
import os
import sys

ML_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(ML_DIR)
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OBJC_DISABLE_INITIALIZE_FORK_SAFETY"] = "YES"
os.environ["MKL_NUM_THREADS"] = "1"

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import joblib
import pandas as pd
import numpy as np
import json
import torch
from transformers import pipeline as hf_pipeline
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification

# ══════════════════════════════════════════════
# LOAD ALL MODELS
# ══════════════════════════════════════════════
print("=" * 50)
print("FinSmart ML Service — Loading models...")
print("=" * 50)

print("  [1/6] Risk models...")
rf_model = joblib.load("risk_random_forest.joblib")
xgb_model = joblib.load("risk_xgboost.joblib")
lr_model = joblib.load("risk_logistic_regression.joblib")
svm_model = joblib.load("risk_svm.joblib")
binary_model = joblib.load("risk_binary_high_risk.joblib")
label_encoders = joblib.load("risk_label_encoders.joblib")
with open("risk_column_info.json") as f:
    col_info = json.load(f)
with open("risk_model_metrics.json") as f:
    model_metrics = json.load(f)

print("  [2/6] Loan default models...")
LOAN_MODELS = {}
loan_col_info = None
loan_model_metrics = None
try:
    for mn in ["xgboost", "random_forest", "gradient_boosting", "logistic_regression", "ensemble"]:
        path = f"loan_{mn}.joblib"
        if os.path.exists(path):
            LOAN_MODELS[mn] = joblib.load(path)
            print(f"    Loaded loan_{mn}")
    if os.path.exists("loan_column_info.json"):
        with open("loan_column_info.json") as f:
            loan_col_info = json.load(f)
    if os.path.exists("loan_model_metrics.json"):
        with open("loan_model_metrics.json") as f:
            loan_model_metrics = json.load(f)
    print(f"    Loaded {len(LOAN_MODELS)} loan models")
except Exception as e:
    print(f"    WARNING: Could not load loan models: {e}")

print("  [3/6] Fraud model (Isolation Forest)...")
fraud_model = None
try:
    import pickle
    if os.path.exists("fraud_iforest.pkl"):
        with open("fraud_iforest.pkl", "rb") as f:
            fraud_model = pickle.load(f)
        print("    Loaded fraud_iforest.pkl")
except Exception as e:
    print(f"    WARNING: Could not load fraud model: {e}")

print("  [4/6] DistilBERT Sentiment...")
sentiment_pipe = hf_pipeline(
    "sentiment-analysis", model="sentiment_distilbert",
    tokenizer="sentiment_distilbert", device=-1, top_k=None,
)

print("  [5/6] DistilBERT Issue Classifier...")
issue_tokenizer = DistilBertTokenizer.from_pretrained("issue_distilbert")
issue_model = DistilBertForSequenceClassification.from_pretrained("issue_distilbert")
issue_model.to("cpu").eval()

print("  [6/6] Metadata...")
with open("sub_issue_keywords.json") as f:
    sub_issue_keywords = json.load(f)
with open("sentiment_model_metrics.json") as f:
    sentiment_metrics = json.load(f)

RISK_LABELS = {1: "High", 2: "Medium", 3: "Low"}
MODELS = {
    "random_forest": rf_model, "xgboost": xgb_model,
    "logistic_regression": lr_model, "svm": svm_model,
    "binary_high_risk": binary_model,
}
DEVICE = "cpu"

print("=" * 50)
print("All models loaded!")
print("=" * 50)

# ══════════════════════════════════════════════
# FASTAPI APP
# ══════════════════════════════════════════════
app = FastAPI(title="FinSmart ML Service")


# ── Request Models ──
class RiskRequest(BaseModel):
    account_age: int
    account_type: int
    kyc: int
    rkyc: int
    is_punished: int
    govt_defaulter: int
    constitution_type: str
    customer_type: int
    customer_status: int
    category: int
    is_blacklisted: int
    poi: int
    poa: str
    customer_special: str
    account_status: int
    poi_alt: int
    model_name: str = "random_forest"


class LoanScoreRequest(BaseModel):
    applicantIncome: float
    coapplicantIncome: float = 0
    loanAmount: float
    tenureMonths: int
    creditScore: int
    existingLoans: int
    employmentYears: int = 5
    age: int = 35
    propertyArea: int = 0
    education: int = 1
    married: int = 1
    dependents: int = 0
    model_name: str = "ensemble"


class FraudScoreRequest(BaseModel):
    amount: float
    tranction_type: str = "transfer"
    merchant_country: str = "IN"
    payment_mode: int = 1
    time_stamp: str = ""


class SentimentRequest(BaseModel):
    message: str
    customer: Optional[str] = "Unknown"
    id: Optional[str] = None


class SentimentBatchRequest(BaseModel):
    messages: List[SentimentRequest]


# ══════════════════════════════════════════════
# RISK HELPERS
# ══════════════════════════════════════════════
def engineer_features(df):
    df["risk_flag_count"] = df["is_punished"] + df["govt_defaulter"] + df["is_blacklisted"]
    df["kyc_compliance"] = df["kyc"] + df["rkyc"]
    df["double_red_flag"] = (df["is_punished"] & df["govt_defaulter"]).astype(int)
    df["punished_not_blacklisted"] = ((df["is_punished"] == 1) & (df["is_blacklisted"] == 0)).astype(int)
    df["no_compliance"] = ((df["kyc"] == 0) & (df["rkyc"] == 0)).astype(int)
    df["account_age_bin"] = pd.cut(df["account_age"], bins=[0, 15, 20, 30], labels=[0, 1, 2]).astype(int)
    # New features
    df["blacklisted_no_kyc"] = ((df["is_blacklisted"] == 1) & (df["kyc"] == 0)).astype(int)
    df["triple_red_flag"] = ((df["is_punished"] == 1) & (df["govt_defaulter"] == 1) & (df["is_blacklisted"] == 1)).astype(int)
    df["inactive_risky"] = ((df["customer_status"] != 1) & (df["risk_flag_count"] > 0)).astype(int)
    df["account_age_sq"] = df["account_age"] ** 2
    df["risk_compliance_ratio"] = df["risk_flag_count"] / (df["kyc_compliance"] + 1)
    df["non_indi_risky"] = ((df["customer_type"] == 0) & (df["risk_flag_count"] > 0)).astype(int)
    for c in col_info.get("account_type_columns", []):
        v = int(c.replace("acct_type_", ""))
        df[c] = (df["account_type"] == v).astype(int)
    for val in [0, 1, 3]:
        df[f"poi_alt_{val}"] = (df["poi_alt"] == val).astype(int)
    return df


def build_feature_df(req):
    feature_cols = col_info["feature_columns"]
    data = {
        "account_age": [req.account_age], "account_type": [req.account_type],
        "kyc": [req.kyc], "rkyc": [req.rkyc], "is_punished": [req.is_punished],
        "govt_defaulter": [req.govt_defaulter], "constitution_type": [req.constitution_type],
        "customer_type": [req.customer_type], "customer_status": [req.customer_status],
        "category": [req.category], "is_blacklisted": [req.is_blacklisted],
        "poi": [req.poi], "poa": [req.poa], "customer_special": [req.customer_special],
        "account_status": [req.account_status], "poi_alt": [req.poi_alt],
    }
    df = pd.DataFrame(data)
    for col in ["constitution_type", "poa", "customer_special"]:
        le = label_encoders[col]
        try:
            df[col] = le.transform(df[col].astype(str))
        except ValueError:
            df[col] = 0
    df = engineer_features(df)
    return df[feature_cols]


# ══════════════════════════════════════════════
# LOAN DEFAULT HELPERS
# ══════════════════════════════════════════════
def build_loan_features(req: LoanScoreRequest) -> pd.DataFrame:
    total_income = req.applicantIncome + req.coapplicantIncome
    dti_ratio = req.loanAmount / (total_income + 1)
    emi_estimate = req.loanAmount / max(req.tenureMonths, 1)
    emi_to_income = emi_estimate / (total_income / 12 + 1)

    data = {
        "applicant_income": [req.applicantIncome],
        "coapplicant_income": [req.coapplicantIncome],
        "loan_amount": [req.loanAmount],
        "tenure_months": [req.tenureMonths],
        "credit_score": [req.creditScore],
        "existing_loans": [req.existingLoans],
        "employment_years": [req.employmentYears],
        "age": [req.age],
        "property_area": [req.propertyArea],
        "education": [req.education],
        "married": [req.married],
        "dependents": [req.dependents],
        # Engineered
        "dti_ratio": [dti_ratio],
        "total_income": [total_income],
        "emi_estimate": [emi_estimate],
        "emi_to_income": [emi_to_income],
        "loan_per_year_employed": [req.loanAmount / (req.employmentYears + 1)],
        "credit_risk_flag": [1 if req.creditScore < 600 else 0],
        "high_dti": [1 if dti_ratio > 3.0 else 0],
        "low_income_high_loan": [1 if (total_income < 30000 and req.loanAmount > 200000) else 0],
        "stable_borrower": [1 if (req.employmentYears >= 5 and req.creditScore >= 700 and req.existingLoans <= 1) else 0],
        "young_risky": [1 if (req.age < 28 and req.employmentYears < 3) else 0],
    }
    return pd.DataFrame(data)


# ══════════════════════════════════════════════
# SENTIMENT HELPERS
# ══════════════════════════════════════════════
def classify_sub_issue(text, issue):
    text_lower = text.lower()
    if issue in sub_issue_keywords:
        best, best_score = None, 0
        for sub, kws in sub_issue_keywords[issue].items():
            score = sum(1 for kw in kws if kw in text_lower)
            if score > best_score:
                best_score, best = score, sub
        if best:
            return best
    return "General Inquiry"


def analyze_single_message(text, customer="Unknown", msg_id=None):
    sent_results = sentiment_pipe(text[:512])[0]
    sent_map = {r["label"]: r["score"] for r in sent_results}
    pos_score = sent_map.get("POSITIVE", 0)
    neg_score = sent_map.get("NEGATIVE", 0)
    max_score = max(pos_score, neg_score)

    if max_score < 0.70:
        sentiment = "Neutral"
        neutral_pct = round((1 - abs(pos_score - neg_score)) * 100, 1)
        pos_pct = round(pos_score * 50, 1)
        neg_pct = round(neg_score * 50, 1)
    elif pos_score > neg_score:
        sentiment = "Positive"
        pos_pct = round(pos_score * 100, 1)
        neg_pct = round(neg_score * 100, 1)
        neutral_pct = round(100 - pos_pct - neg_pct, 1)
    else:
        sentiment = "Negative"
        pos_pct = round(pos_score * 100, 1)
        neg_pct = round(neg_score * 100, 1)
        neutral_pct = round(100 - pos_pct - neg_pct, 1)

    pos_pct, neg_pct, neutral_pct = max(0, pos_pct), max(0, neg_pct), max(0, neutral_pct)
    confidence = round(max_score * 100, 1)

    inputs = issue_tokenizer(text[:512], truncation=True, padding="max_length", max_length=128, return_tensors="pt")
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
    with torch.no_grad():
        logits = issue_model(**inputs).logits
        probs = torch.nn.functional.softmax(logits, dim=1)[0]
        pred_idx = torch.argmax(probs).item()
        issue_conf = round(probs[pred_idx].item() * 100, 1)

    issue = issue_model.config.id2label[pred_idx]
    sub_issue = classify_sub_issue(text, issue)

    highlighted = []
    neg_words = ["failed", "declined", "frustrated", "worst", "blocked", "unacceptable",
                 "problem", "error", "wrong", "terrible", "horrible", "bad", "angry",
                 "upset", "disappointed", "useless", "embarrassment", "stolen", "fraud", "scam"]
    pos_words = ["thank", "thanks", "excellent", "amazing", "great", "good", "helpful",
                 "appreciate", "wonderful", "awesome", "best", "happy", "satisfied",
                 "quick", "fast", "resolved", "patient"]
    tl = text.lower()
    for w in neg_words + pos_words:
        if w in tl:
            highlighted.append(w)

    return {
        "id": msg_id or f"MSG_{hash(text) % 100000:05d}",
        "customer": customer, "message": text, "sentiment": sentiment,
        "confidence": confidence,
        "sentiment_scores": {"positive": pos_pct, "neutral": neutral_pct, "negative": neg_pct},
        "issue": issue, "sub_issue": sub_issue, "issue_confidence": issue_conf,
        "highlighted_words": highlighted,
    }


# ══════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "finsmart-ml-service",
        "models": ["risk", "loan_default", "fraud", "sentiment", "issue"],
    }


# ── Risk ──
BINARY_LABELS = {0: "Not High Risk", 1: "High Risk"}

@app.post("/risk/score")
def risk_score(req: RiskRequest):
    df = build_feature_df(req)
    mn = req.model_name
    if mn not in MODELS:
        raise HTTPException(400, f"Unknown model: {mn}")
    model = MODELS[mn]
    if mn == "binary_high_risk":
        pred = int(model.predict(df)[0])
        proba = model.predict_proba(df)[0]
        conf = float(max(proba))
        pd_ = {BINARY_LABELS[i]: round(float(proba[i])*100,2) for i in range(2)}
        risk_label = "High" if pred == 1 else "Low"
        risk_code = 1 if pred == 1 else 3
        return {"risk_level": risk_label, "risk_level_code": risk_code,
                "confidence": round(conf*100,2), "risk_score": int(round(conf*100)),
                "probabilities": pd_, "model_used": mn}
    elif mn == "xgboost":
        pred = int(model.predict(df)[0]) + 1
        proba = model.predict_proba(df)[0]
        conf = float(max(proba))
        pd_ = {RISK_LABELS[i+1]: round(float(proba[i])*100,2) for i in range(3)}
    else:
        pred = int(model.predict(df)[0])
        proba = model.predict_proba(df)[0]
        conf = float(max(proba))
        cls = list(model.classes_)
        pd_ = {RISK_LABELS[int(c)]: round(float(proba[i])*100,2) for i,c in enumerate(cls)}
    return {"risk_level": RISK_LABELS.get(pred,"Unknown"), "risk_level_code": pred,
            "confidence": round(conf*100,2), "risk_score": int(round(conf*100)),
            "probabilities": pd_, "model_used": mn}


@app.post("/risk/score-all")
def risk_score_all(req: RiskRequest):
    df = build_feature_df(req)
    results = {}
    for name, model in MODELS.items():
        if name == "binary_high_risk":
            pred = int(model.predict(df)[0])
            proba = model.predict_proba(df)[0]
            conf = float(max(proba))
            pd_ = {BINARY_LABELS[i]: round(float(proba[i])*100,2) for i in range(2)}
            risk_label = "High" if pred == 1 else "Low"
            risk_code = 1 if pred == 1 else 3
            results[name] = {"risk_level": risk_label, "risk_level_code": risk_code,
                             "confidence": round(conf*100,2), "risk_score": int(round(conf*100)),
                             "probabilities": pd_}
        elif name == "xgboost":
            pred = int(model.predict(df)[0]) + 1
            proba = model.predict_proba(df)[0]
            conf = float(max(proba))
            pd_ = {RISK_LABELS[i+1]: round(float(proba[i])*100,2) for i in range(3)}
            results[name] = {"risk_level": RISK_LABELS.get(pred,"Unknown"), "risk_level_code": pred,
                             "confidence": round(conf*100,2), "risk_score": int(round(conf*100)),
                             "probabilities": pd_}
        else:
            pred = int(model.predict(df)[0])
            proba = model.predict_proba(df)[0]
            conf = float(max(proba))
            cls = list(model.classes_)
            pd_ = {RISK_LABELS[int(c)]: round(float(proba[i])*100,2) for i,c in enumerate(cls)}
            results[name] = {"risk_level": RISK_LABELS.get(pred,"Unknown"), "risk_level_code": pred,
                             "confidence": round(conf*100,2), "risk_score": int(round(conf*100)),
                             "probabilities": pd_}
    return results


@app.get("/risk/customers")
def get_customers():
    try:
        df = pd.read_excel("dataset_risk.xlsx")
    except Exception as e:
        raise HTTPException(500, str(e))
    df.rename(columns=col_info["original_to_short"], inplace=True)
    for col in ["constitution_type", "poa", "customer_special"]:
        df[col+"_orig"] = df[col].copy()
        try:
            df[col] = label_encoders[col].transform(df[col].astype(str))
        except ValueError:
            df[col] = 0
    df = engineer_features(df)
    X = df[col_info["feature_columns"]]
    preds = rf_model.predict(X)
    proba = rf_model.predict_proba(X)
    df["predicted_risk"] = preds
    df["confidence"] = np.max(proba, axis=1)
    top = df.sort_values("confidence", ascending=False).head(100)
    results = []
    for _, row in top.iterrows():
        rc = int(row["predicted_risk"])
        results.append({
            "id": f"CUST{int(row['customer_id']):07d}",
            "customer_id": int(row["customer_id"]),
            "account_age": int(row["account_age"]),
            "account_type": int(row["account_type"]),
            "kyc": bool(row["kyc"]), "rkyc": bool(row["rkyc"]),
            "is_punished": bool(row["is_punished"]),
            "govt_defaulter": bool(row["govt_defaulter"]),
            "is_blacklisted": bool(row["is_blacklisted"]),
            "poa": str(row.get("poa_orig", "Unknown")),
            "risk_level": RISK_LABELS.get(rc, "Unknown"),
            "risk_score": int(round(float(row["confidence"]) * 100)),
            "status": "Flagged" if rc==1 else "Under Review" if rc==2 else "Cleared",
        })
    return results


@app.get("/risk/metrics")
def get_model_metrics():
    summary = {}
    for name, m in model_metrics.items():
        summary[name] = {"accuracy": m["accuracy"], "confusion_matrix": m["confusion_matrix"], "per_class": {}}
        if "cv_accuracy_mean" in m:
            summary[name]["cv_accuracy_mean"] = m["cv_accuracy_mean"]
            summary[name]["cv_accuracy_std"] = m["cv_accuracy_std"]
        if name == "binary_high_risk":
            for label_key in ["Not High", "High"]:
                if label_key in m["classification_report"]:
                    cd = m["classification_report"][label_key]
                    summary[name]["per_class"][label_key] = {
                        "precision": round(cd.get("precision",0)*100,2),
                        "recall": round(cd.get("recall",0)*100,2),
                        "f1_score": round(cd.get("f1-score",0)*100,2),
                        "support": cd.get("support",0),
                    }
        else:
            for ck in ["1","2","3"]:
                if ck in m["classification_report"]:
                    cd = m["classification_report"][ck]
                    summary[name]["per_class"][RISK_LABELS[int(ck)]] = {
                        "precision": round(cd.get("precision",0)*100,2),
                        "recall": round(cd.get("recall",0)*100,2),
                        "f1_score": round(cd.get("f1-score",0)*100,2),
                        "support": cd.get("support",0),
                    }
    return summary


@app.get("/risk/dataset-stats")
def get_dataset_stats():
    try:
        df = pd.read_excel("dataset_risk.xlsx")
    except Exception as e:
        raise HTTPException(500, str(e))
    df.rename(columns=col_info["original_to_short"], inplace=True)
    rd = df["risk_level"].value_counts().to_dict()
    return {
        "total_records": len(df),
        "total_features": len(col_info["feature_columns"]),
        "risk_distribution": {RISK_LABELS[int(k)]: int(v) for k,v in rd.items()},
        "models_available": list(MODELS.keys()),
    }


# ══════════════════════════════════════════════
# LOAN DEFAULT ENDPOINTS
# ══════════════════════════════════════════════

@app.post("/loan/score")
def loan_score(req: LoanScoreRequest):
    if not LOAN_MODELS:
        raise HTTPException(500, "Loan models not loaded. Run train_loan_default_models.py first.")

    df = build_loan_features(req)
    mn = req.model_name
    if mn not in LOAN_MODELS:
        mn = list(LOAN_MODELS.keys())[0]

    model = LOAN_MODELS[mn]
    pred = int(model.predict(df)[0])
    proba = model.predict_proba(df)[0]
    default_prob = float(proba[1]) * 100

    if default_prob >= 70:
        risk_level = "High"
    elif default_prob >= 40:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return {
        "defaultProbability": round(default_prob, 2),
        "riskScore": int(round(default_prob)),
        "riskLevel": risk_level,
        "prediction": "Default" if pred == 1 else "No Default",
        "model_used": mn,
        "probabilities": {
            "No Default": round(float(proba[0]) * 100, 2),
            "Default": round(float(proba[1]) * 100, 2),
        },
    }


@app.post("/loan/score-all")
def loan_score_all(req: LoanScoreRequest):
    if not LOAN_MODELS:
        raise HTTPException(500, "Loan models not loaded.")

    df = build_loan_features(req)
    results = {}
    for name, model in LOAN_MODELS.items():
        pred = int(model.predict(df)[0])
        proba = model.predict_proba(df)[0]
        default_prob = float(proba[1]) * 100
        if default_prob >= 70:
            risk_level = "High"
        elif default_prob >= 40:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        results[name] = {
            "defaultProbability": round(default_prob, 2),
            "riskScore": int(round(default_prob)),
            "riskLevel": risk_level,
            "prediction": "Default" if pred == 1 else "No Default",
            "probabilities": {
                "No Default": round(float(proba[0]) * 100, 2),
                "Default": round(float(proba[1]) * 100, 2),
            },
        }
    return results


@app.get("/loan/metrics")
def get_loan_metrics():
    if not loan_model_metrics:
        raise HTTPException(500, "Loan model metrics not available.")
    summary = {}
    for name, m in loan_model_metrics.items():
        summary[name] = {
            "accuracy": m["accuracy"],
            "auc_roc": m.get("auc_roc", 0),
            "cv_accuracy_mean": m.get("cv_accuracy_mean", 0),
            "cv_accuracy_std": m.get("cv_accuracy_std", 0),
            "confusion_matrix": m["confusion_matrix"],
            "per_class": {},
        }
        for label_key in ["No Default", "Default"]:
            if label_key in m["classification_report"]:
                cd = m["classification_report"][label_key]
                summary[name]["per_class"][label_key] = {
                    "precision": round(cd.get("precision", 0) * 100, 2),
                    "recall": round(cd.get("recall", 0) * 100, 2),
                    "f1_score": round(cd.get("f1-score", 0) * 100, 2),
                    "support": cd.get("support", 0),
                }
    return summary


@app.get("/loan/dataset-stats")
def get_loan_dataset_stats():
    if not loan_col_info:
        raise HTTPException(500, "Loan column info not available.")
    return {
        "total_records": loan_col_info.get("dataset_size", 0),
        "total_features": len(loan_col_info.get("feature_columns", [])),
        "default_rate": loan_col_info.get("default_rate", 0),
        "models_available": list(LOAN_MODELS.keys()),
    }


# ══════════════════════════════════════════════
# FRAUD DETECTION ENDPOINTS
# ══════════════════════════════════════════════

@app.post("/fraud/score")
def fraud_score(req: FraudScoreRequest):
    if fraud_model is None:
        # Fallback: use a heuristic-based scoring
        risk_score = min(100, max(0, int(req.amount / 1000)))
        if req.amount > 50000:
            risk_score = min(100, risk_score + 30)
        if req.merchant_country not in ["IN", "US", "GB"]:
            risk_score = min(100, risk_score + 20)
        return {
            "fraud_probability": round(risk_score, 2),
            "risk_score": risk_score,
            "risk_level": "HIGH" if risk_score >= 70 else "MEDIUM" if risk_score >= 40 else "LOW",
            "is_anomaly": risk_score >= 70,
            "raw_decision_score": -0.5,
        }

    features = np.array([[req.amount, req.payment_mode]])
    decision = fraud_model.decision_function(features)[0]
    prediction = fraud_model.predict(features)[0]

    fraud_prob = max(0, min(100, (1 - (decision + 0.5)) * 100))
    risk_score = int(round(fraud_prob))

    if risk_score >= 70:
        risk_level = "HIGH"
    elif risk_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "fraud_probability": round(fraud_prob, 2),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "is_anomaly": bool(prediction == -1),
        "raw_decision_score": round(float(decision), 4),
    }


@app.get("/fraud/transactions")
def get_fraud_transactions():
    """Generate sample transactions for the fraud dashboard."""
    np.random.seed(42)
    n = 50
    customers = [f"CUST{np.random.randint(1000, 9999):04d}" for _ in range(20)]
    channels = ["UPI", "NEFT", "RTGS", "IMPS", "Card", "ATM"]
    transactions = []
    for i in range(n):
        amount = round(np.random.lognormal(8, 1.5), 2)
        risk = np.random.randint(5, 100)
        status = "Flagged" if risk >= 70 else "Under Review" if risk >= 40 else "Cleared"
        transactions.append({
            "id": f"TXN{100000 + i}",
            "date": f"2026-03-{np.random.randint(1, 24):02d}",
            "customer": np.random.choice(customers),
            "amount": round(amount, 2),
            "channel": np.random.choice(channels),
            "riskScore": risk,
            "status": status,
        })
    return transactions


@app.get("/fraud/metrics")
def get_fraud_metrics():
    txns = get_fraud_transactions()
    total = len(txns)
    flagged = sum(1 for t in txns if t["riskScore"] >= 70)
    high_risk_clients = len(set(t["customer"] for t in txns if t["riskScore"] >= 80))
    avg_score = sum(t["riskScore"] for t in txns) / max(total, 1)
    return {
        "totalTransactions": total,
        "flaggedSuspicious": flagged,
        "highRiskClients": high_risk_clients,
        "averageRiskScore": round(avg_score, 1),
    }


# ── Sentiment ──
@app.post("/sentiment/analyze")
def analyze_sentiment(req: SentimentRequest):
    if not req.message.strip():
        raise HTTPException(400, "Message cannot be empty")
    return analyze_single_message(req.message, req.customer, req.id)


@app.post("/sentiment/analyze-batch")
def analyze_sentiment_batch(req: SentimentBatchRequest):
    if not req.messages:
        raise HTTPException(400, "Messages list cannot be empty")
    return [analyze_single_message(m.message, m.customer, m.id) for m in req.messages]


@app.get("/sentiment/metrics")
def get_sentiment_metrics():
    return {
        "issue_classifier": {
            "type": sentiment_metrics["issue_classifier"]["type"],
            "accuracy": sentiment_metrics["issue_classifier"]["accuracy"],
            "categories": sentiment_metrics["issue_classifier"]["categories"],
            "total_training_samples": sentiment_metrics["issue_classifier"]["total_training_samples"],
        },
        "sentiment_model": sentiment_metrics["sentiment_model"],
    }


# ══════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    print("\nStarting server on http://0.0.0.0:5050")
    uvicorn.run(app, host="0.0.0.0", port=5050)
