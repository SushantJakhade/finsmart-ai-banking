"""
Train Loan Default Prediction Models for FinSmart.
Generates a realistic synthetic dataset and trains multiple models.
"""
import pandas as pd
import numpy as np
import joblib
import json
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score

np.random.seed(42)

# ──────────────────────────────────────────────
# GENERATE SYNTHETIC LOAN DATASET
# ──────────────────────────────────────────────
N = 5000
print(f"Generating synthetic loan dataset with {N} samples...")

applicant_income = np.random.lognormal(mean=10.5, sigma=0.6, size=N).astype(int)
applicant_income = np.clip(applicant_income, 15000, 500000)

loan_amount = (applicant_income * np.random.uniform(0.5, 5.0, size=N)).astype(int)
loan_amount = np.clip(loan_amount, 10000, 2000000)

tenure_months = np.random.choice([12, 24, 36, 48, 60, 84, 120, 180, 240, 360], size=N)
credit_score = np.random.normal(680, 80, size=N).astype(int)
credit_score = np.clip(credit_score, 300, 900)

existing_loans = np.random.choice([0, 1, 2, 3, 4, 5], size=N, p=[0.3, 0.3, 0.2, 0.1, 0.07, 0.03])
employment_years = np.random.exponential(5, size=N).astype(int)
employment_years = np.clip(employment_years, 0, 40)

age = np.random.normal(38, 10, size=N).astype(int)
age = np.clip(age, 21, 70)

# Property area: 0=Urban, 1=Semiurban, 2=Rural
property_area = np.random.choice([0, 1, 2], size=N, p=[0.4, 0.35, 0.25])

# Education: 1=Graduate, 0=Not Graduate
education = np.random.choice([0, 1], size=N, p=[0.3, 0.7])

# Marital status: 1=Married, 0=Single
married = np.random.choice([0, 1], size=N, p=[0.35, 0.65])

# Dependents
dependents = np.random.choice([0, 1, 2, 3], size=N, p=[0.4, 0.25, 0.2, 0.15])

# Co-applicant income
coapplicant_income = np.where(
    married == 1,
    np.random.lognormal(mean=9.5, sigma=0.8, size=N).astype(int),
    np.zeros(N, dtype=int)
)
coapplicant_income = np.clip(coapplicant_income, 0, 300000)

# ── Generate target (default) based on realistic factors ──
dti = loan_amount / (applicant_income + coapplicant_income + 1)
default_prob = (
    0.05
    + 0.15 * (credit_score < 600).astype(float)
    + 0.10 * (credit_score < 500).astype(float)
    + 0.08 * (dti > 3.0).astype(float)
    + 0.12 * (dti > 5.0).astype(float)
    + 0.05 * (existing_loans >= 3).astype(float)
    + 0.03 * (existing_loans >= 4).astype(float)
    + 0.04 * (employment_years < 2).astype(float)
    + 0.03 * (age < 25).astype(float)
    + 0.02 * (education == 0).astype(float)
    + 0.02 * (property_area == 2).astype(float)
    - 0.05 * (credit_score > 750).astype(float)
    - 0.03 * (employment_years > 10).astype(float)
    + np.random.normal(0, 0.05, size=N)
)
default_prob = np.clip(default_prob, 0.01, 0.95)
default = (np.random.random(N) < default_prob).astype(int)

df = pd.DataFrame({
    "applicant_income": applicant_income,
    "coapplicant_income": coapplicant_income,
    "loan_amount": loan_amount,
    "tenure_months": tenure_months,
    "credit_score": credit_score,
    "existing_loans": existing_loans,
    "employment_years": employment_years,
    "age": age,
    "property_area": property_area,
    "education": education,
    "married": married,
    "dependents": dependents,
    "default": default,
})

print(f"Dataset shape: {df.shape}")
print(f"Default rate: {df['default'].mean()*100:.1f}%")
print(f"Class distribution:\n{df['default'].value_counts()}")

# Save dataset
df.to_csv("loan_default_dataset.csv", index=False)

# ──────────────────────────────────────────────
# FEATURE ENGINEERING
# ──────────────────────────────────────────────
print("\nEngineering features...")

df["dti_ratio"] = df["loan_amount"] / (df["applicant_income"] + df["coapplicant_income"] + 1)
df["total_income"] = df["applicant_income"] + df["coapplicant_income"]
df["emi_estimate"] = df["loan_amount"] / df["tenure_months"]
df["emi_to_income"] = df["emi_estimate"] / (df["total_income"] / 12 + 1)
df["loan_per_year_employed"] = df["loan_amount"] / (df["employment_years"] + 1)
df["credit_risk_flag"] = (df["credit_score"] < 600).astype(int)
df["high_dti"] = (df["dti_ratio"] > 3.0).astype(int)
df["low_income_high_loan"] = ((df["total_income"] < 30000) & (df["loan_amount"] > 200000)).astype(int)
df["stable_borrower"] = ((df["employment_years"] >= 5) & (df["credit_score"] >= 700) & (df["existing_loans"] <= 1)).astype(int)
df["young_risky"] = ((df["age"] < 28) & (df["employment_years"] < 3)).astype(int)

feature_cols = [
    "applicant_income", "coapplicant_income", "loan_amount", "tenure_months",
    "credit_score", "existing_loans", "employment_years", "age",
    "property_area", "education", "married", "dependents",
    # Engineered
    "dti_ratio", "total_income", "emi_estimate", "emi_to_income",
    "loan_per_year_employed", "credit_risk_flag", "high_dti",
    "low_income_high_loan", "stable_borrower", "young_risky",
]

X = df[feature_cols]
y = df["default"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Train: {X_train.shape}, Test: {X_test.shape}")

# ──────────────────────────────────────────────
# HANDLE IMBALANCE WITH SMOTE
# ──────────────────────────────────────────────
try:
    from imblearn.over_sampling import SMOTE
    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    print(f"After SMOTE: {X_train_res.shape}")
    print(f"Resampled class distribution:\n{pd.Series(y_train_res).value_counts()}")
except ImportError:
    print("WARNING: imbalanced-learn not installed, using class_weight='balanced' instead")
    X_train_res, y_train_res = X_train, y_train

# ──────────────────────────────────────────────
# TRAIN MODELS
# ──────────────────────────────────────────────
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# Compute sample weights for XGBoost
pos_count = (y_train_res == 1).sum()
neg_count = (y_train_res == 0).sum()
scale_pos_weight = neg_count / max(pos_count, 1)

models = {
    "xgboost": XGBClassifier(
        n_estimators=500, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        min_child_weight=5, gamma=0.2,
        reg_alpha=0.1, reg_lambda=1.0,
        scale_pos_weight=scale_pos_weight,
        random_state=42, use_label_encoder=False, eval_metric="logloss",
        n_jobs=-1,
    ),
    "random_forest": Pipeline([
        ("scaler", StandardScaler()),
        ("model", RandomForestClassifier(
            n_estimators=500, max_depth=15, min_samples_split=5,
            min_samples_leaf=2, max_features="sqrt",
            class_weight="balanced", random_state=42, n_jobs=-1,
        )),
    ]),
    "gradient_boosting": GradientBoostingClassifier(
        n_estimators=300, max_depth=5, learning_rate=0.05,
        subsample=0.8, min_samples_split=10, min_samples_leaf=5,
        random_state=42,
    ),
    "logistic_regression": Pipeline([
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(
            max_iter=3000, random_state=42,
            class_weight="balanced", C=0.5, solver="lbfgs",
        )),
    ]),
}

results = {}
trained_models = {}

for name, model in models.items():
    print(f"\nTraining {name}...")
    model.fit(X_train_res, y_train_res)
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_proba)
    report = classification_report(y_test, y_pred, output_dict=True, target_names=["No Default", "Default"])
    cm = confusion_matrix(y_test, y_pred).tolist()
    cv_scores = cross_val_score(model, X.values, y.values, cv=cv, scoring="accuracy")

    results[name] = {
        "accuracy": round(acc * 100, 2),
        "auc_roc": round(auc * 100, 2),
        "cv_accuracy_mean": round(cv_scores.mean() * 100, 2),
        "cv_accuracy_std": round(cv_scores.std() * 100, 2),
        "classification_report": report,
        "confusion_matrix": cm,
    }
    trained_models[name] = model

    joblib.dump(model, f"loan_{name}.joblib")
    print(f"  {name}: Accuracy={acc*100:.2f}%, AUC-ROC={auc*100:.2f}%")
    print(f"  CV Accuracy={cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*100:.2f}%)")

# ──────────────────────────────────────────────
# ENSEMBLE VOTING CLASSIFIER
# ──────────────────────────────────────────────
print("\nTraining Ensemble Voting Classifier...")
ensemble = VotingClassifier(
    estimators=[
        ("xgb", trained_models["xgboost"]),
        ("rf", trained_models["random_forest"]),
        ("gb", trained_models["gradient_boosting"]),
    ],
    voting="soft",
)
ensemble.fit(X_train_res, y_train_res)
y_pred_ens = ensemble.predict(X_test)
y_proba_ens = ensemble.predict_proba(X_test)[:, 1]
acc_ens = accuracy_score(y_test, y_pred_ens)
auc_ens = roc_auc_score(y_test, y_proba_ens)
report_ens = classification_report(y_test, y_pred_ens, output_dict=True, target_names=["No Default", "Default"])
cm_ens = confusion_matrix(y_test, y_pred_ens).tolist()
cv_ens = cross_val_score(ensemble, X.values, y.values, cv=cv, scoring="accuracy")

results["ensemble"] = {
    "accuracy": round(acc_ens * 100, 2),
    "auc_roc": round(auc_ens * 100, 2),
    "cv_accuracy_mean": round(cv_ens.mean() * 100, 2),
    "cv_accuracy_std": round(cv_ens.std() * 100, 2),
    "classification_report": report_ens,
    "confusion_matrix": cm_ens,
}
joblib.dump(ensemble, "loan_ensemble.joblib")
print(f"  Ensemble: Accuracy={acc_ens*100:.2f}%, AUC-ROC={auc_ens*100:.2f}%")

# ──────────────────────────────────────────────
# SAVE METADATA
# ──────────────────────────────────────────────
loan_col_info = {
    "feature_columns": feature_cols,
    "base_features": [
        "applicant_income", "coapplicant_income", "loan_amount", "tenure_months",
        "credit_score", "existing_loans", "employment_years", "age",
        "property_area", "education", "married", "dependents",
    ],
    "engineered_features": [
        "dti_ratio", "total_income", "emi_estimate", "emi_to_income",
        "loan_per_year_employed", "credit_risk_flag", "high_dti",
        "low_income_high_loan", "stable_borrower", "young_risky",
    ],
    "target": "default",
    "dataset_size": N,
    "default_rate": round(df["default"].mean() * 100, 2),
}

with open("loan_column_info.json", "w") as f:
    json.dump(loan_col_info, f, indent=2)

with open("loan_model_metrics.json", "w") as f:
    json.dump(results, f, indent=2)

# ──────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("LOAN DEFAULT MODEL TRAINING COMPLETE")
print("=" * 60)
print(f"\n{'Model':<25} {'Accuracy':>10} {'AUC-ROC':>10} {'CV Acc':>10}")
print("-" * 60)
for name, res in results.items():
    print(f"  {name:<23} {res['accuracy']:>8.2f}%  {res['auc_roc']:>7.2f}%  {res['cv_accuracy_mean']:>6.2f}%")
print(f"\nModels saved: {list(results.keys())}")
