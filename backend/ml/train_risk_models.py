"""
Train Customer Risk Assessment Models for FinSmart.
Improved with SMOTE, better hyperparameters, and additional feature engineering.
"""
import pandas as pd
import numpy as np
import joblib
import json
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

df = pd.read_excel("dataset_risk.xlsx")
print(f"Raw dataset: {df.shape}")

# Shorten column names for easier handling
col_map = {
    "Customer Id": "customer_id",
    "Account Age": "account_age",
    "Risk Level (1 - High ,2-Mideum,3-Low)": "risk_level",
    "Account Type ( 101 -Saving Deposit , 151- Current Deposit, 518-Loan Against Medium Term F.D. ,601- House Secured Loan": "account_type",
    "KYC(binary)": "kyc",
    "RKYC (verification binary)": "rkyc",
    "isPunished(0/1)": "is_punished",
    "GovernmentDefaulter(0/1)": "govt_defaulter",
    "ConstitutionType(non indi- ss)": "constitution_type",
    "CustomerType(individual-1/nonindividual-0)": "customer_type",
    "CustomerStatus(1-1,2-in1,3-expired)": "customer_status",
    "Category-major-1,minor-2,senior-3": "category",
    "isBlacklisted(0/1)": "is_blacklisted",
    "POI(0-Adhaar,1-PAN,2-Passport)": "poi",
    "POA": "poa",
    "CustomerSpecial": "customer_special",
    "AccountStatus(0-0 , 1-1)": "account_status",
    "POI(0-Adhaar,1-PAN,3-Passport)": "poi_alt",
}
df.rename(columns=col_map, inplace=True)

# ──────────────────────────────────────────────
# DATA CLEANING
# ──────────────────────────────────────────────

before = len(df)
df.drop_duplicates(inplace=True)
print(f"Dropped {before - len(df)} duplicate rows, remaining: {len(df)}")

if df["customer_special"].nunique() <= 1:
    print(f"Dropping zero-variance column: customer_special (all '{df['customer_special'].iloc[0]}')")

# Encode categorical columns
label_encoders = {}
for col in ["constitution_type", "poa", "customer_special"]:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    label_encoders[col] = le

joblib.dump(label_encoders, "risk_label_encoders.joblib")

# ──────────────────────────────────────────────
# FEATURE ENGINEERING (expanded)
# ──────────────────────────────────────────────

# Original features
df["risk_flag_count"] = df["is_punished"] + df["govt_defaulter"] + df["is_blacklisted"]
df["kyc_compliance"] = df["kyc"] + df["rkyc"]
df["double_red_flag"] = (df["is_punished"] & df["govt_defaulter"]).astype(int)
df["punished_not_blacklisted"] = ((df["is_punished"] == 1) & (df["is_blacklisted"] == 0)).astype(int)
df["no_compliance"] = ((df["kyc"] == 0) & (df["rkyc"] == 0)).astype(int)
df["account_age_bin"] = pd.cut(df["account_age"], bins=[0, 15, 20, 30], labels=[0, 1, 2]).astype(int)

# NEW: Additional feature engineering for better accuracy
df["blacklisted_no_kyc"] = ((df["is_blacklisted"] == 1) & (df["kyc"] == 0)).astype(int)
df["triple_red_flag"] = ((df["is_punished"] == 1) & (df["govt_defaulter"] == 1) & (df["is_blacklisted"] == 1)).astype(int)
df["inactive_risky"] = ((df["customer_status"] != 1) & (df["risk_flag_count"] > 0)).astype(int)
df["account_age_sq"] = df["account_age"] ** 2
df["risk_compliance_ratio"] = df["risk_flag_count"] / (df["kyc_compliance"] + 1)
df["non_indi_risky"] = ((df["customer_type"] == 0) & (df["risk_flag_count"] > 0)).astype(int)

# One-hot encode account_type
account_type_dummies = pd.get_dummies(df["account_type"], prefix="acct_type", dtype=int)
df = pd.concat([df, account_type_dummies], axis=1)
account_type_columns = list(account_type_dummies.columns)

account_type_values = sorted(df["account_type"].unique().tolist())

# One-hot encode poi_alt
df["poi_alt_0"] = (df["poi_alt"] == 0).astype(int)
df["poi_alt_1"] = (df["poi_alt"] == 1).astype(int)
df["poi_alt_3"] = (df["poi_alt"] == 3).astype(int)

# ──────────────────────────────────────────────
# DEFINE FEATURES
# ──────────────────────────────────────────────

feature_cols = [
    "account_age", "account_age_bin",
    "kyc", "rkyc", "is_punished",
    "govt_defaulter", "constitution_type", "customer_type",
    "customer_status", "category", "is_blacklisted", "poi",
    "poa", "account_status",
    # Engineered features
    "risk_flag_count", "kyc_compliance", "double_red_flag",
    "punished_not_blacklisted", "no_compliance",
    # NEW engineered features
    "blacklisted_no_kyc", "triple_red_flag", "inactive_risky",
    "account_age_sq", "risk_compliance_ratio", "non_indi_risky",
    # One-hot encoded
    "poi_alt_0", "poi_alt_1", "poi_alt_3",
] + account_type_columns

col_info = {
    "original_to_short": col_map,
    "short_to_original": {v: k for k, v in col_map.items()},
    "categorical_columns": ["constitution_type", "poa", "customer_special"],
    "feature_columns": feature_cols,
    "base_feature_columns": [
        "account_age", "account_type", "kyc", "rkyc", "is_punished",
        "govt_defaulter", "constitution_type", "customer_type",
        "customer_status", "category", "is_blacklisted", "poi",
        "poa", "customer_special", "account_status", "poi_alt",
    ],
    "engineered_features": [
        "risk_flag_count", "kyc_compliance", "double_red_flag",
        "punished_not_blacklisted", "no_compliance", "account_age_bin",
        "blacklisted_no_kyc", "triple_red_flag", "inactive_risky",
        "account_age_sq", "risk_compliance_ratio", "non_indi_risky",
    ],
    "account_type_columns": account_type_columns,
    "account_type_values": account_type_values,
    "poi_alt_columns": ["poi_alt_0", "poi_alt_1", "poi_alt_3"],
    "target_column": "risk_level",
    "risk_labels": {1: "High", 2: "Medium", 3: "Low"},
}
with open("risk_column_info.json", "w") as f:
    json.dump(col_info, f, indent=2)

X = df[feature_cols]
y = df["risk_level"]
y_shifted = y - 1

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
X_train_xgb, X_test_xgb, y_train_xgb, y_test_xgb = train_test_split(
    X, y_shifted, test_size=0.2, random_state=42, stratify=y_shifted
)

print(f"\nTrain: {X_train.shape}, Test: {X_test.shape}")
print(f"Features: {len(feature_cols)}")
print(f"Class distribution:\n{y.value_counts().sort_index()}\n")

# ──────────────────────────────────────────────
# SMOTE OVERSAMPLING (for non-XGBoost models)
# ──────────────────────────────────────────────
try:
    from imblearn.over_sampling import SMOTE
    smote = SMOTE(random_state=42, k_neighbors=3)
    X_train_smote, y_train_smote = smote.fit_resample(X_train, y_train)
    X_train_xgb_smote, y_train_xgb_smote = smote.fit_resample(X_train_xgb, y_train_xgb)
    print(f"After SMOTE: {X_train_smote.shape}")
    print(f"Resampled distribution:\n{pd.Series(y_train_smote).value_counts().sort_index()}")
    USE_SMOTE = True
except ImportError:
    print("WARNING: imbalanced-learn not installed. Using class_weight='balanced' only.")
    X_train_smote, y_train_smote = X_train, y_train
    X_train_xgb_smote, y_train_xgb_smote = X_train_xgb, y_train_xgb
    USE_SMOTE = False

# ──────────────────────────────────────────────
# CLASS WEIGHTS FOR XGBOOST
# ──────────────────────────────────────────────
class_counts = y.value_counts().sort_index()
total = len(y)
n_classes = len(class_counts)
xgb_sample_weights_train = np.zeros(len(y_train_xgb_smote))
for cls_idx, cls_label in enumerate(sorted(class_counts.index)):
    count = class_counts[cls_label]
    weight = total / (n_classes * count)
    mask = y_train_xgb_smote == (cls_label - 1)
    xgb_sample_weights_train[mask] = weight
    print(f"  Class {cls_label}: count={count}, weight={weight:.3f}")

# ──────────────────────────────────────────────
# TRAIN MODELS (improved hyperparameters)
# ──────────────────────────────────────────────
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

models = {
    "random_forest": RandomForestClassifier(
        n_estimators=1200, max_depth=None, min_samples_split=2,
        min_samples_leaf=1, max_features="sqrt",
        class_weight="balanced_subsample", random_state=42, n_jobs=-1,
    ),
    "xgboost": XGBClassifier(
        n_estimators=1200, max_depth=6, learning_rate=0.02,
        subsample=0.8, colsample_bytree=0.8,
        min_child_weight=2, gamma=0.05,
        reg_alpha=0.01, reg_lambda=1.0,
        random_state=42, use_label_encoder=False, eval_metric="mlogloss",
        n_jobs=-1,
    ),
    "logistic_regression": Pipeline([
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(
            max_iter=5000, random_state=42, multi_class="multinomial",
            class_weight="balanced", C=0.5, solver="lbfgs",
        )),
    ]),
    "svm": Pipeline([
        ("scaler", StandardScaler()),
        ("model", SVC(
            kernel="rbf", probability=True, random_state=42,
            C=100, gamma="scale", class_weight="balanced",
        )),
    ]),
}

results = {}
for name, model in models.items():
    print(f"\nTraining {name}...")

    if name == "xgboost":
        model.fit(X_train_xgb_smote, y_train_xgb_smote, sample_weight=xgb_sample_weights_train)
        y_pred_raw = model.predict(X_test_xgb)
        y_pred = y_pred_raw + 1
        y_true = y_test_xgb + 1
        cv_scores = cross_val_score(model, X.values, y_shifted.values, cv=cv, scoring="accuracy")
    else:
        model.fit(X_train_smote, y_train_smote)
        y_pred = model.predict(X_test)
        y_true = y_test
        cv_scores = cross_val_score(model, X.values, y.values, cv=cv, scoring="accuracy")

    acc = accuracy_score(y_true, y_pred)
    report = classification_report(y_true, y_pred, output_dict=True)
    cm = confusion_matrix(y_true, y_pred).tolist()

    results[name] = {
        "accuracy": round(acc * 100, 2),
        "cv_accuracy_mean": round(cv_scores.mean() * 100, 2),
        "cv_accuracy_std": round(cv_scores.std() * 100, 2),
        "classification_report": report,
        "confusion_matrix": cm,
    }

    joblib.dump(model, f"risk_{name}.joblib")
    print(f"  {name}: Test Accuracy = {acc*100:.2f}%")
    print(f"  {name}: CV Accuracy = {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*100:.2f}%)")
    print(f"  Confusion Matrix:\n  {cm}")

with open("risk_model_metrics.json", "w") as f:
    json.dump(results, f, indent=2)

# ──────────────────────────────────────────────
# BINARY MODEL: High Risk vs Not-High Risk
# ──────────────────────────────────────────────
print("\n" + "=" * 50)
print("Training BINARY model (High Risk vs Not-High)...")
print("=" * 50)

y_binary = (y == 1).astype(int)
X_train_b, X_test_b, y_train_b, y_test_b = train_test_split(
    X, y_binary, test_size=0.2, random_state=42, stratify=y_binary
)

binary_model = RandomForestClassifier(
    n_estimators=500, max_depth=20, min_samples_split=3,
    min_samples_leaf=1, class_weight="balanced",
    random_state=42, n_jobs=-1,
)
binary_model.fit(X_train_b, y_train_b)
y_pred_b = binary_model.predict(X_test_b)
acc_b = accuracy_score(y_test_b, y_pred_b)
cv_scores_b = cross_val_score(binary_model, X.values, y_binary.values, cv=cv, scoring="accuracy")
report_b = classification_report(y_test_b, y_pred_b, output_dict=True, target_names=["Not High", "High"])
cm_b = confusion_matrix(y_test_b, y_pred_b).tolist()

results["binary_high_risk"] = {
    "accuracy": round(acc_b * 100, 2),
    "cv_accuracy_mean": round(cv_scores_b.mean() * 100, 2),
    "cv_accuracy_std": round(cv_scores_b.std() * 100, 2),
    "classification_report": report_b,
    "confusion_matrix": cm_b,
}

joblib.dump(binary_model, "risk_binary_high_risk.joblib")
print(f"  Binary: Test Accuracy = {acc_b*100:.2f}%")
print(f"  Binary: CV Accuracy = {cv_scores_b.mean()*100:.2f}% (+/- {cv_scores_b.std()*100:.2f}%)")

with open("risk_model_metrics.json", "w") as f:
    json.dump(results, f, indent=2)

print("\n" + "=" * 50)
print("All models trained and saved!")
print("=" * 50)
print("\nModel Comparison:")
print(f"{'Model':<25} {'Test Acc':>10} {'CV Acc':>10}")
print("-" * 50)
for name, res in results.items():
    print(f"  {name:<23} {res['accuracy']:>8.2f}%  {res['cv_accuracy_mean']:>6.2f}% +/- {res['cv_accuracy_std']:.2f}%")
