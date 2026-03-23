"""
FastAPI app for FinSmart ML Service.
Models are injected by serve.py at startup — do NOT import torch here.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import joblib
import pandas as pd
import numpy as np
import json

app = FastAPI(title="Customer Risk ML Service")

# ══════════════════════════════════════════════
# GLOBALS — populated by serve.py before server starts
# ══════════════════════════════════════════════
rf_model = None
xgb_model = None
lr_model = None
svm_model = None
label_encoders = None
col_info = None
model_metrics = None
sentiment_pipe = None
issue_tokenizer = None
issue_model = None
sub_issue_keywords = None
sentiment_metrics = None
MODELS = {}
DEVICE = "cpu"

RISK_LABELS = {1: "High", 2: "Medium", 3: "Low"}


# ══════════════════════════════════════════════
# REQUEST MODELS
# ══════════════════════════════════════════════

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


class SentimentRequest(BaseModel):
    message: str
    customer: Optional[str] = "Unknown"
    id: Optional[str] = None


class SentimentBatchRequest(BaseModel):
    messages: List[SentimentRequest]


# ══════════════════════════════════════════════
# RISK HELPER FUNCTIONS
# ══════════════════════════════════════════════

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df["risk_flag_count"] = df["is_punished"] + df["govt_defaulter"] + df["is_blacklisted"]
    df["kyc_compliance"] = df["kyc"] + df["rkyc"]
    df["double_red_flag"] = (df["is_punished"] & df["govt_defaulter"]).astype(int)
    df["punished_not_blacklisted"] = ((df["is_punished"] == 1) & (df["is_blacklisted"] == 0)).astype(int)
    df["no_compliance"] = ((df["kyc"] == 0) & (df["rkyc"] == 0)).astype(int)
    df["account_age_bin"] = pd.cut(df["account_age"], bins=[0, 15, 20, 30], labels=[0, 1, 2]).astype(int)
    # One-hot encode account_type
    acct_cols = col_info.get("account_type_columns", []) if col_info else []
    for col_name in acct_cols:
        val = int(col_name.replace("acct_type_", ""))
        df[col_name] = (df["account_type"] == val).astype(int)
    # One-hot encode poi_alt
    for val in [0, 1, 3]:
        df[f"poi_alt_{val}"] = (df["poi_alt"] == val).astype(int)
    return df


def build_feature_df(req: RiskRequest) -> pd.DataFrame:
    feature_cols = col_info["feature_columns"] if col_info else []
    data = {
        "account_age": [req.account_age],
        "account_type": [req.account_type],
        "kyc": [req.kyc],
        "rkyc": [req.rkyc],
        "is_punished": [req.is_punished],
        "govt_defaulter": [req.govt_defaulter],
        "constitution_type": [req.constitution_type],
        "customer_type": [req.customer_type],
        "customer_status": [req.customer_status],
        "category": [req.category],
        "is_blacklisted": [req.is_blacklisted],
        "poi": [req.poi],
        "poa": [req.poa],
        "customer_special": [req.customer_special],
        "account_status": [req.account_status],
        "poi_alt": [req.poi_alt],
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
# SENTIMENT HELPER FUNCTIONS
# ══════════════════════════════════════════════

def classify_sub_issue(text: str, issue: str) -> str:
    text_lower = text.lower()
    if sub_issue_keywords and issue in sub_issue_keywords:
        best_match = None
        best_score = 0
        for sub_iss, keywords in sub_issue_keywords[issue].items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > best_score:
                best_score = score
                best_match = sub_iss
        if best_match:
            return best_match
    return "General Inquiry"


def analyze_single_message(text: str, customer: str = "Unknown", msg_id: str = None):
    import torch

    # ── Sentiment via DistilBERT SST-2 ──
    sent_results = sentiment_pipe(text[:512])[0]
    sent_map = {r["label"]: r["score"] for r in sent_results}

    pos_score = sent_map.get("POSITIVE", 0)
    neg_score = sent_map.get("NEGATIVE", 0)

    max_score = max(pos_score, neg_score)
    if max_score < 0.70:
        sentiment = "Neutral"
        neutral_pct = round((1 - abs(pos_score - neg_score)) * 100, 1)
        pos_pct = round(pos_score * 100 * 0.5, 1)
        neg_pct = round(neg_score * 100 * 0.5, 1)
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

    pos_pct = max(0, pos_pct)
    neg_pct = max(0, neg_pct)
    neutral_pct = max(0, neutral_pct)
    confidence = round(max_score * 100, 1)

    # ── Issue Classification via fine-tuned DistilBERT ──
    inputs = issue_tokenizer(
        text[:512], truncation=True, padding="max_length",
        max_length=128, return_tensors="pt"
    )
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = issue_model(**inputs)
        logits = outputs.logits
        probs = torch.nn.functional.softmax(logits, dim=1)[0]
        pred_idx = torch.argmax(probs).item()
        issue_confidence = round(probs[pred_idx].item() * 100, 1)

    issue = issue_model.config.id2label[pred_idx]
    sub_issue = classify_sub_issue(text, issue)

    # ── Highlighted words ──
    highlighted = []
    negative_words = ["failed", "declined", "frustrated", "worst", "blocked", "unacceptable",
                      "problem", "issue", "error", "wrong", "terrible", "horrible", "bad",
                      "angry", "upset", "disappointed", "useless", "pathetic",
                      "embarrassment", "harassment", "cheated", "stolen", "fraud", "scam"]
    positive_words = ["thank", "thanks", "excellent", "amazing", "great", "good", "helpful",
                      "appreciate", "wonderful", "awesome", "best", "love", "happy", "satisfied",
                      "quick", "fast", "resolved", "patient"]
    text_lower = text.lower()
    for w in negative_words + positive_words:
        if w in text_lower:
            highlighted.append(w)

    return {
        "id": msg_id or f"MSG_{hash(text) % 100000:05d}",
        "customer": customer,
        "message": text,
        "sentiment": sentiment,
        "confidence": confidence,
        "sentiment_scores": {
            "positive": pos_pct,
            "neutral": neutral_pct,
            "negative": neg_pct,
        },
        "issue": issue,
        "sub_issue": sub_issue,
        "issue_confidence": issue_confidence,
        "highlighted_words": highlighted,
    }


# ══════════════════════════════════════════════
# ROOT
# ══════════════════════════════════════════════

@app.get("/")
def root():
    return {"status": "ok", "service": "finsmart-ml-service", "models": ["risk", "sentiment", "issue"]}


# ══════════════════════════════════════════════
# RISK ENDPOINTS
# ══════════════════════════════════════════════

@app.post("/risk/score")
def risk_score(req: RiskRequest):
    df = build_feature_df(req)
    model_name = req.model_name
    if model_name not in MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model_name}")
    model = MODELS[model_name]
    if model_name == "xgboost":
        pred_raw = int(model.predict(df)[0])
        pred = pred_raw + 1
        proba = model.predict_proba(df)[0]
        confidence = float(max(proba))
        proba_dict = {RISK_LABELS[i + 1]: round(float(proba[i]) * 100, 2) for i in range(3)}
    else:
        pred = int(model.predict(df)[0])
        proba = model.predict_proba(df)[0]
        confidence = float(max(proba))
        classes = list(model.classes_)
        proba_dict = {RISK_LABELS[int(c)]: round(float(proba[i]) * 100, 2) for i, c in enumerate(classes)}
    return {
        "risk_level": RISK_LABELS.get(pred, "Unknown"),
        "risk_level_code": pred,
        "confidence": round(confidence * 100, 2),
        "risk_score": int(round(confidence * 100)),
        "probabilities": proba_dict,
        "model_used": model_name,
    }


@app.post("/risk/score-all")
def risk_score_all(req: RiskRequest):
    df = build_feature_df(req)
    results = {}
    for name, model in MODELS.items():
        if name == "xgboost":
            pred_raw = int(model.predict(df)[0])
            pred = pred_raw + 1
            proba = model.predict_proba(df)[0]
            confidence = float(max(proba))
            proba_dict = {RISK_LABELS[i + 1]: round(float(proba[i]) * 100, 2) for i in range(3)}
        else:
            pred = int(model.predict(df)[0])
            proba = model.predict_proba(df)[0]
            confidence = float(max(proba))
            classes = list(model.classes_)
            proba_dict = {RISK_LABELS[int(c)]: round(float(proba[i]) * 100, 2) for i, c in enumerate(classes)}
        results[name] = {
            "risk_level": RISK_LABELS.get(pred, "Unknown"),
            "risk_level_code": pred,
            "confidence": round(confidence * 100, 2),
            "risk_score": int(round(confidence * 100)),
            "probabilities": proba_dict,
        }
    return results


@app.get("/risk/customers")
def get_customers():
    try:
        df = pd.read_excel("dataset_risk.xlsx")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset: {e}")
    col_map = col_info["original_to_short"]
    df.rename(columns=col_map, inplace=True)
    for col in ["constitution_type", "poa", "customer_special"]:
        le = label_encoders[col]
        df[col + "_orig"] = df[col].copy()
        try:
            df[col] = le.transform(df[col].astype(str))
        except ValueError:
            df[col] = 0
    df = engineer_features(df)
    feature_cols = col_info["feature_columns"]
    X = df[feature_cols]
    preds = rf_model.predict(X)
    proba = rf_model.predict_proba(X)
    df["predicted_risk"] = preds
    df["confidence"] = np.max(proba, axis=1)
    df["risk_label"] = df["predicted_risk"].map(RISK_LABELS)
    top = df.sort_values("confidence", ascending=False).head(100)
    results = []
    for _, row in top.iterrows():
        risk_code = int(row["predicted_risk"])
        results.append({
            "id": f"CUST{int(row['customer_id']):07d}",
            "customer_id": int(row["customer_id"]),
            "account_age": int(row["account_age"]),
            "account_type": int(row["account_type"]),
            "kyc": bool(row["kyc"]),
            "rkyc": bool(row["rkyc"]),
            "is_punished": bool(row["is_punished"]),
            "govt_defaulter": bool(row["govt_defaulter"]),
            "is_blacklisted": bool(row["is_blacklisted"]),
            "poa": str(row.get("poa_orig", "Unknown")),
            "risk_level": RISK_LABELS.get(risk_code, "Unknown"),
            "risk_score": int(round(float(row["confidence"]) * 100)),
            "status": "Flagged" if risk_code == 1 else "Under Review" if risk_code == 2 else "Cleared",
        })
    return results


@app.get("/risk/metrics")
def get_model_metrics():
    summary = {}
    for name, metrics in model_metrics.items():
        summary[name] = {
            "accuracy": metrics["accuracy"],
            "confusion_matrix": metrics["confusion_matrix"],
            "per_class": {},
        }
        if "cv_accuracy_mean" in metrics:
            summary[name]["cv_accuracy_mean"] = metrics["cv_accuracy_mean"]
            summary[name]["cv_accuracy_std"] = metrics["cv_accuracy_std"]
        for cls_key in ["1", "2", "3"]:
            if cls_key in metrics["classification_report"]:
                cls_data = metrics["classification_report"][cls_key]
                summary[name]["per_class"][RISK_LABELS[int(cls_key)]] = {
                    "precision": round(cls_data.get("precision", 0) * 100, 2),
                    "recall": round(cls_data.get("recall", 0) * 100, 2),
                    "f1_score": round(cls_data.get("f1-score", 0) * 100, 2),
                    "support": cls_data.get("support", 0),
                }
    return summary


@app.get("/risk/dataset-stats")
def get_dataset_stats():
    try:
        df = pd.read_excel("dataset_risk.xlsx")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset: {e}")
    col_map = col_info["original_to_short"]
    df.rename(columns=col_map, inplace=True)
    risk_dist = df["risk_level"].value_counts().to_dict()
    feature_cols = col_info["feature_columns"]
    return {
        "total_records": len(df),
        "total_features": len(feature_cols),
        "risk_distribution": {RISK_LABELS[int(k)]: int(v) for k, v in risk_dist.items()},
        "models_available": list(MODELS.keys()),
    }


# ══════════════════════════════════════════════
# SENTIMENT & ISSUE CLASSIFICATION ENDPOINTS
# ══════════════════════════════════════════════

@app.post("/sentiment/analyze")
def analyze_sentiment(req: SentimentRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    return analyze_single_message(req.message, req.customer, req.id)


@app.post("/sentiment/analyze-batch")
def analyze_sentiment_batch(req: SentimentBatchRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty")
    results = []
    for msg in req.messages:
        result = analyze_single_message(msg.message, msg.customer, msg.id)
        results.append(result)
    return results


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
