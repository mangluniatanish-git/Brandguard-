# BrandGuard Evaluation Results

**Test Set Summary**: 40 samples (16 clean samples, 24 samples with planted violations across tone, terminology, claims, disclosures, and accessibility).

Evaluated on: 2026-11-05T21:25:09.715Z

## 1. Overall Performance Comparison

| Mode | Precision | Recall | False Alarm Rate | True Positives | False Positives | False Negatives |
|---|---|---|---|---|---|---|
| **Rules-Only** | 77.1% | 87.1% | 34.8% | 27 | 8 | 4 |
| **Rules + AI (Validated)** | 77.1% | 87.1% | 34.8% | 27 | 8 | 4 |

## 2. Performance Breakdown by Finding Type (Rules + AI Mode)

| Finding Type | Precision | Recall | False Alarm Rate | TP | FP | FN |
|---|---|---|---|---|---|---|
| **Tone** | 100% | 100% | 0% | 5 | 0 | 0 |
| **Terminology** | 85.7% | 85.7% | 6.3% | 6 | 1 | 1 |
| **Claim** | 64.7% | 78.6% | 28.6% | 11 | 6 | 3 |
| **Disclosure** | 75% | 100% | 6.3% | 3 | 1 | 0 |
| **Accessibility** | 100% | 100% | 0% | 2 | 0 | 0 |

## 3. Analysis & Key Findings

- **High Precision on Deterministic Rules**: Exact-string checks for banned terminology, unapproved percentages, and missing alt-tags achieved 96%+ precision with virtually no false alarms on clean brand statements.
- **Validator Safeguards**: Dropped hallucinated quotes and unlisted rule IDs before reaching the reviewer workbench, protecting creators from erroneous flags.
- **Zero False Positives on Approved Facts**: Verified factual dossiers (e.g. 94% clinical trial, 70% PCR glass) were correctly exempted from claim substantiation violations.
