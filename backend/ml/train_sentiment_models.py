"""
Train sentiment analysis and issue classification models using DistilBERT.

- Sentiment: Uses pre-trained `distilbert-base-uncased-finetuned-sst-2-english`
  (no training needed — it's already fine-tuned for sentiment)
- Issue Classification: Fine-tunes DistilBERT on synthetic banking CRM data
"""

import json
import os
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import (
    DistilBertTokenizer,
    DistilBertForSequenceClassification,
    pipeline,
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

DEVICE = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
print(f"Using device: {DEVICE}")

# ──────────────────────────────────────────────
# STEP 1: DOWNLOAD SENTIMENT MODEL (pre-trained)
# ──────────────────────────────────────────────
print("\n[1/3] Downloading pre-trained DistilBERT sentiment model...")
sentiment_pipe = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english",
    device=DEVICE,
)

# Test it
test_results = sentiment_pipe([
    "This is the worst banking service ever",
    "Thank you for the amazing help",
    "What are the documents needed for KYC",
])
for text, result in zip(["negative", "positive", "neutral"], test_results):
    print(f"  {text}: {result}")

# Save the sentiment model locally
sentiment_save_path = "sentiment_distilbert"
sentiment_pipe.model.save_pretrained(sentiment_save_path)
sentiment_pipe.tokenizer.save_pretrained(sentiment_save_path)
print(f"  Saved to: {sentiment_save_path}/")

# ──────────────────────────────────────────────
# STEP 2: TRAINING DATA FOR ISSUE CLASSIFICATION
# ──────────────────────────────────────────────
print("\n[2/3] Preparing issue classification training data...")

training_data = [
    # ─── Card Issues (30) ───
    ("My card got declined at the store", "Card Issues"),
    ("Card declined while making payment", "Card Issues"),
    ("ATM card is not working", "Card Issues"),
    ("My debit card was declined at POS", "Card Issues"),
    ("Card got blocked for no reason", "Card Issues"),
    ("My credit card is not accepted anywhere", "Card Issues"),
    ("Card payment failed at restaurant", "Card Issues"),
    ("I lost my card and need a replacement", "Card Issues"),
    ("Card expired and I haven't received the new one", "Card Issues"),
    ("International transaction declined on my card", "Card Issues"),
    ("Card swipe not working at petrol pump", "Card Issues"),
    ("My card keeps getting declined even though I have balance", "Card Issues"),
    ("Card PIN is not working at ATM", "Card Issues"),
    ("ATM ate my card and money was debited", "Card Issues"),
    ("Online card payment keeps failing", "Card Issues"),
    ("Card was stolen please block immediately", "Card Issues"),
    ("I want to increase my credit card limit", "Card Issues"),
    ("I am unable to make online purchase with my card", "Card Issues"),
    ("Card CVV is not being accepted online", "Card Issues"),
    ("I want to activate my new debit card", "Card Issues"),
    ("Why is my card showing insufficient balance", "Card Issues"),
    ("Card transactions are showing wrong amounts", "Card Issues"),
    ("I didn't make this card transaction it's fraud", "Card Issues"),
    ("My card has been compromised", "Card Issues"),
    ("Virtual card is not working on Amazon", "Card Issues"),
    ("Unable to add card to Google Pay", "Card Issues"),
    ("Card chip is damaged need replacement", "Card Issues"),
    ("Duplicate card charges on my statement", "Card Issues"),
    ("I need to change my card PIN", "Card Issues"),
    ("Card delivery is taking too long", "Card Issues"),

    # ─── UPI Failures (30) ───
    ("UPI payment failed but money got deducted", "UPI Failures"),
    ("UPI transaction stuck and amount debited", "UPI Failures"),
    ("PhonePe transaction failed amount deducted from account", "UPI Failures"),
    ("Google Pay payment not going through", "UPI Failures"),
    ("UPI ID is showing invalid", "UPI Failures"),
    ("Unable to send money through UPI", "UPI Failures"),
    ("UPI transaction timed out but money debited", "UPI Failures"),
    ("Paytm UPI payment failed need refund", "UPI Failures"),
    ("My UPI PIN is not working", "UPI Failures"),
    ("Failed UPI transaction money not returned", "UPI Failures"),
    ("UPI collect request not receiving on my phone", "UPI Failures"),
    ("UPI limit exceeded error but I haven't done many transactions", "UPI Failures"),
    ("Bank server down for UPI payments", "UPI Failures"),
    ("UPI transaction shows pending for 2 days", "UPI Failures"),
    ("Money sent via UPI but beneficiary didn't receive", "UPI Failures"),
    ("UPI app showing incorrect bank balance", "UPI Failures"),
    ("BHIM app not connecting to bank account", "UPI Failures"),
    ("UPI mandate payment failed for loan EMI", "UPI Failures"),
    ("UPI scan and pay not working", "UPI Failures"),
    ("QR code payment failed via UPI", "UPI Failures"),
    ("Unable to register for UPI getting error", "UPI Failures"),
    ("Wrong amount sent through UPI by mistake", "UPI Failures"),
    ("UPI refund not received after 10 days", "UPI Failures"),
    ("UPI autopay for subscription failed", "UPI Failures"),
    ("Unable to link my bank to UPI app", "UPI Failures"),
    ("NEFT transfer failed amount stuck", "UPI Failures"),
    ("IMPS transaction failed but debited", "UPI Failures"),
    ("Online transfer showing failed status", "UPI Failures"),
    ("Fund transfer pending since yesterday", "UPI Failures"),
    ("Payment to merchant via UPI is showing error", "UPI Failures"),

    # ─── Loan Queries (30) ───
    ("What is the current home loan interest rate", "Loan Queries"),
    ("I want to apply for personal loan", "Loan Queries"),
    ("What documents are needed for home loan", "Loan Queries"),
    ("I need information about education loan", "Loan Queries"),
    ("Loan EMI is too high can I restructure", "Loan Queries"),
    ("My loan application status", "Loan Queries"),
    ("How to check my loan balance", "Loan Queries"),
    ("When is my next EMI due date", "Loan Queries"),
    ("I want to foreclose my personal loan", "Loan Queries"),
    ("Interest rate on car loan", "Loan Queries"),
    ("Loan disbursement is delayed", "Loan Queries"),
    ("Thank you for quick loan approval", "Loan Queries"),
    ("I want to apply for a gold loan", "Loan Queries"),
    ("What is the eligibility for business loan", "Loan Queries"),
    ("Loan top up facility available", "Loan Queries"),
    ("How to transfer my home loan from another bank", "Loan Queries"),
    ("EMI auto debit failed this month", "Loan Queries"),
    ("I need my loan statement for tax purposes", "Loan Queries"),
    ("Pre-approved loan offer details", "Loan Queries"),
    ("Loan processing fee is too high", "Loan Queries"),
    ("Can I get a moratorium on my loan EMI", "Loan Queries"),
    ("Loan insurance premium details", "Loan Queries"),
    ("What is CIBIL score requirement for home loan", "Loan Queries"),
    ("My loan application was rejected why", "Loan Queries"),
    ("How to get loan NOC after full repayment", "Loan Queries"),
    ("Partial prepayment charges on home loan", "Loan Queries"),
    ("Loan tenure extension request", "Loan Queries"),
    ("I want to switch from floating to fixed rate", "Loan Queries"),
    ("Loan subsidy under PMAY scheme", "Loan Queries"),
    ("Co-applicant details for joint home loan", "Loan Queries"),

    # ─── KYC (30) ───
    ("I need to update my KYC documents", "KYC"),
    ("My KYC is pending since last month", "KYC"),
    ("Can I complete KYC online", "KYC"),
    ("RKYC verification for my account", "KYC"),
    ("What documents needed for KYC update", "KYC"),
    ("My address has changed need to update KYC", "KYC"),
    ("Video KYC is not connecting", "KYC"),
    ("Aadhaar based e-KYC not working", "KYC"),
    ("KYC deadline reminder received what to do", "KYC"),
    ("PAN card update in bank records", "KYC"),
    ("I want to update my mobile number linked to account", "KYC"),
    ("My name is spelled wrong in bank records", "KYC"),
    ("Nomination update in my account", "KYC"),
    ("How to change registered email ID", "KYC"),
    ("Aadhaar linking to bank account", "KYC"),
    ("Account frozen due to KYC not updated", "KYC"),
    ("When is the last date for KYC renewal", "KYC"),
    ("I submitted KYC documents at branch but still pending", "KYC"),
    ("Video KYC appointment scheduling", "KYC"),
    ("My Aadhaar number has changed need to update", "KYC"),
    ("How to link PAN to my bank account", "KYC"),
    ("KYC verification officer never came for visit", "KYC"),
    ("eKYC through Digilocker not working", "KYC"),
    ("I need to update my passport in bank records", "KYC"),
    ("Voter ID update for bank KYC", "KYC"),
    ("Which documents are valid for proof of address", "KYC"),
    ("Driving license update in KYC", "KYC"),
    ("My account is restricted because of incomplete KYC", "KYC"),
    ("CKYC number not showing in records", "KYC"),
    ("How to download KYC acknowledgement receipt", "KYC"),

    # ─── Account Issues (30) ───
    ("My account has been blocked without notice", "Account Issues"),
    ("Account balance showing zero incorrectly", "Account Issues"),
    ("Unable to login to net banking", "Account Issues"),
    ("My salary credit is missing from account", "Account Issues"),
    ("Unauthorized debit from my account", "Account Issues"),
    ("I want to close my bank account", "Account Issues"),
    ("Minimum balance charges debited unfairly", "Account Issues"),
    ("How to open a new savings account", "Account Issues"),
    ("Fixed deposit interest not credited", "Account Issues"),
    ("Account statement download not working", "Account Issues"),
    ("Wrong charges deducted from my account", "Account Issues"),
    ("My mobile banking app is not working", "Account Issues"),
    ("Account access blocked after wrong password attempts", "Account Issues"),
    ("I want to convert my account to zero balance", "Account Issues"),
    ("Pension not credited to my account", "Account Issues"),
    ("Account number changed after branch transfer", "Account Issues"),
    ("How to activate dormant account", "Account Issues"),
    ("SMS alerts not coming for transactions", "Account Issues"),
    ("Passbook printing machine not working at branch", "Account Issues"),
    ("I want to add joint holder to my account", "Account Issues"),
    ("Net banking OTP not being received", "Account Issues"),
    ("Account is showing under lien why", "Account Issues"),
    ("Cheque book request not fulfilled", "Account Issues"),
    ("My account type was changed without permission", "Account Issues"),
    ("Interest rate on savings account too low", "Account Issues"),
    ("Standing instruction not executed", "Account Issues"),
    ("Demat account linking issue", "Account Issues"),
    ("Bank lockers availability", "Account Issues"),
    ("How to get account opening certificate", "Account Issues"),
    ("TDS deducted on FD interest is too much", "Account Issues"),

    # ─── General (30) ───
    ("What are your branch timings", "General"),
    ("Where is the nearest ATM", "General"),
    ("How to register for internet banking", "General"),
    ("What is your customer care number", "General"),
    ("Thank you for the excellent service", "General"),
    ("The bank staff was very helpful today", "General"),
    ("I have a general query about banking services", "General"),
    ("How to apply for a cheque book", "General"),
    ("What are the charges for demand draft", "General"),
    ("RTGS and NEFT timings", "General"),
    ("Holiday list for bank this year", "General"),
    ("How to get bank reference letter", "General"),
    ("I want to update my nominee details", "General"),
    ("What is the IFSC code of your branch", "General"),
    ("Foreign exchange rates today", "General"),
    ("How to open PPF account", "General"),
    ("Recurring deposit scheme details", "General"),
    ("What are the benefits of senior citizen account", "General"),
    ("How to apply for locker facility", "General"),
    ("I appreciate your quick response", "General"),
    ("Is there a mobile app for your bank", "General"),
    ("How to register for WhatsApp banking", "General"),
    ("Your website is very easy to use", "General"),
    ("What are NRI account options", "General"),
    ("Sukanya Samriddhi Yojana account opening", "General"),
    ("How to get income certificate from bank", "General"),
    ("What is the process for SWIFT transfer", "General"),
    ("Corporate account opening procedure", "General"),
    ("What are current account charges", "General"),
    ("I want to give feedback about branch service", "General"),
]

texts = [t[0] for t in training_data]
labels_str = [t[1] for t in training_data]

# Create label mapping
label_names = sorted(set(labels_str))
label2id = {name: idx for idx, name in enumerate(label_names)}
id2label = {idx: name for name, idx in label2id.items()}
labels = [label2id[l] for l in labels_str]

print(f"Total samples: {len(texts)}")
print(f"Categories: {label_names}")
print(f"Label mapping: {label2id}")

# ──────────────────────────────────────────────
# STEP 3: FINE-TUNE DISTILBERT FOR ISSUE CLASSIFICATION
# ──────────────────────────────────────────────
print("\n[3/3] Fine-tuning DistilBERT for issue classification...")

tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")


class BankingDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len=128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        encoding = self.tokenizer(
            self.texts[idx],
            truncation=True,
            padding="max_length",
            max_length=self.max_len,
            return_tensors="pt",
        )
        return {
            "input_ids": encoding["input_ids"].squeeze(),
            "attention_mask": encoding["attention_mask"].squeeze(),
            "labels": torch.tensor(self.labels[idx], dtype=torch.long),
        }


# Split data
X_train, X_test, y_train, y_test = train_test_split(
    texts, labels, test_size=0.2, random_state=42, stratify=labels
)

train_dataset = BankingDataset(X_train, y_train, tokenizer)
test_dataset = BankingDataset(X_test, y_test, tokenizer)

train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=16)

# Load pre-trained DistilBERT and add classification head
model = DistilBertForSequenceClassification.from_pretrained(
    "distilbert-base-uncased",
    num_labels=len(label_names),
    id2label=id2label,
    label2id=label2id,
)
model.to(DEVICE)

# Training setup
optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5, weight_decay=0.01)
num_epochs = 12

# Training loop
model.train()
for epoch in range(num_epochs):
    total_loss = 0
    correct = 0
    total = 0

    for batch in train_loader:
        input_ids = batch["input_ids"].to(DEVICE)
        attention_mask = batch["attention_mask"].to(DEVICE)
        batch_labels = batch["labels"].to(DEVICE)

        optimizer.zero_grad()
        outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=batch_labels)
        loss = outputs.loss
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        preds = torch.argmax(outputs.logits, dim=1)
        correct += (preds == batch_labels).sum().item()
        total += len(batch_labels)

    train_acc = correct / total * 100
    avg_loss = total_loss / len(train_loader)
    if (epoch + 1) % 2 == 0 or epoch == 0:
        print(f"  Epoch {epoch+1}/{num_epochs}: loss={avg_loss:.4f}, train_acc={train_acc:.1f}%")

# Evaluate
model.eval()
all_preds = []
all_labels = []

with torch.no_grad():
    for batch in test_loader:
        input_ids = batch["input_ids"].to(DEVICE)
        attention_mask = batch["attention_mask"].to(DEVICE)
        batch_labels = batch["labels"].to(DEVICE)

        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        preds = torch.argmax(outputs.logits, dim=1)
        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(batch_labels.cpu().numpy())

pred_names = [id2label[p] for p in all_preds]
true_names = [id2label[l] for l in all_labels]

acc = accuracy_score(true_names, pred_names)
print(f"\nIssue Classifier Test Accuracy: {acc * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(true_names, pred_names))

# Save model
issue_save_path = "issue_distilbert"
model.save_pretrained(issue_save_path)
tokenizer.save_pretrained(issue_save_path)
print(f"Issue classifier saved to: {issue_save_path}/")

# Save metadata
metadata = {
    "sentiment_model": {
        "type": "DistilBERT (fine-tuned SST-2)",
        "path": "sentiment_distilbert",
        "description": "distilbert-base-uncased-finetuned-sst-2-english",
    },
    "issue_classifier": {
        "type": "DistilBERT (fine-tuned on banking data)",
        "path": "issue_distilbert",
        "accuracy": round(acc * 100, 2),
        "categories": label_names,
        "label2id": label2id,
        "id2label": {str(k): v for k, v in id2label.items()},
        "total_training_samples": len(texts),
        "classification_report": classification_report(true_names, pred_names, output_dict=True),
    },
}
with open("sentiment_model_metrics.json", "w") as f:
    json.dump(metadata, f, indent=2)

# Save sub-issue keywords
sub_issue_keywords = {
    "Card Issues": {
        "Card Declined at POS": ["declined", "not accepted", "not working", "failed", "swipe"],
        "Card Blocked": ["blocked", "block", "frozen"],
        "Card Lost/Stolen": ["lost", "stolen", "compromised", "fraud"],
        "Card Replacement": ["replacement", "new card", "expired", "damaged", "delivery"],
        "Card PIN Issue": ["pin", "cvv", "activate"],
        "Card Limit": ["limit", "increase", "insufficient"],
        "Card Online Payment": ["online", "virtual", "amazon", "google pay", "add card"],
        "Card Charges": ["charges", "duplicate", "wrong amount", "statement"],
    },
    "UPI Failures": {
        "Failed Transaction - Amount Debited": ["failed", "debited", "deducted", "stuck", "pending"],
        "UPI Registration Issue": ["register", "link", "connecting", "invalid"],
        "UPI Refund Pending": ["refund", "not returned", "not received"],
        "UPI App Issue": ["app", "bhim", "scan", "qr code"],
        "UPI Limit Issue": ["limit", "exceeded"],
        "UPI Mandate/Autopay": ["mandate", "autopay", "subscription", "emi"],
    },
    "Loan Queries": {
        "Loan Status Inquiry": ["status", "application", "disbursement", "approval", "rejected"],
        "Home Loan Inquiry": ["home loan", "flat", "house", "pmay", "property"],
        "Personal Loan Inquiry": ["personal loan", "foreclose", "top up", "pre-approved"],
        "Loan EMI Issue": ["emi", "due date", "moratorium", "restructure", "auto debit"],
        "Loan Interest/Charges": ["interest rate", "processing fee", "charges", "fixed", "floating"],
        "Loan Documents": ["documents", "statement", "noc", "certificate", "tax"],
        "Education/Vehicle Loan": ["education", "car", "vehicle", "gold", "business"],
    },
    "KYC": {
        "KYC Update": ["update", "change", "link", "add", "new"],
        "KYC Pending": ["pending", "not completed", "deadline", "last date", "frozen", "restricted"],
        "Video KYC": ["video kyc", "appointment", "connecting"],
        "eKYC Issue": ["ekyc", "aadhaar", "digilocker", "online"],
        "Document Update": ["pan", "aadhaar", "passport", "voter", "driving", "address", "name", "mobile", "email"],
    },
    "Account Issues": {
        "Account Blocked": ["blocked", "frozen", "lien", "restricted", "access"],
        "Account Balance Issue": ["balance", "zero", "missing", "wrong", "incorrect"],
        "Net Banking Issue": ["login", "net banking", "otp", "password", "app"],
        "Account Charges": ["charges", "minimum balance", "tds", "interest rate"],
        "Account Services": ["close", "open", "convert", "joint", "dormant", "activate"],
        "Transaction Issue": ["unauthorized", "debit", "credit", "salary", "pension", "standing instruction"],
        "Account Documents": ["statement", "passbook", "cheque", "certificate"],
    },
    "General": {
        "Branch/ATM Inquiry": ["branch", "atm", "timings", "nearest", "holiday"],
        "Service Inquiry": ["register", "apply", "cheque book", "locker", "demand draft"],
        "Positive Feedback": ["thank", "excellent", "helpful", "appreciate", "easy", "great"],
        "General Inquiry": ["general", "query", "ifsc", "swift", "foreign", "nri"],
        "Account Products": ["ppf", "rd", "recurring", "sukanya", "senior citizen", "corporate"],
    },
}
with open("sub_issue_keywords.json", "w") as f:
    json.dump(sub_issue_keywords, f, indent=2)

print("\n" + "=" * 50)
print("ALL MODELS READY!")
print("=" * 50)
print(f"  Sentiment:  {sentiment_save_path}/ (DistilBERT SST-2)")
print(f"  Issue:      {issue_save_path}/ (DistilBERT fine-tuned, {acc*100:.1f}%)")
print(f"  Metrics:    sentiment_model_metrics.json")
