---
title: "Hybrid ML Supply Chain Optimization: Linear Regression + Random Forest Residual Modeling"
date: "2024-03-15"
techStack: ["Python", "Scikit-learn", "Pandas", "NumPy", "Linear Regression", "Random Forest", "Supply Chain Analytics", "Time Series Forecasting"]
summary: "Developed a hybrid ensemble model that feeds linear regression residuals into a random forest to capture non-linear supply chain patterns, improving forecast accuracy by 23% over baseline models."
---

## Situation

Our logistics network faced persistent forecast inaccuracies in demand planning across 200+ SKUs and 15 distribution centers. Traditional univariate forecasting (ARIMA, exponential smoothing) and standalone linear regression models consistently underperformed during promotional periods and supply disruptions, resulting in **12% average stockout rates** and **$2.3M annually** in excess inventory carrying costs.

## Task

Design a robust demand forecasting system that could:
- Model both linear trends (seasonality, price elasticity) and complex non-linear interactions (promotional lift, cross-SKU cannibalization, regional demand shifts)
- Generalize across heterogeneous product categories without per-SKU manual tuning
- Deliver interpretable feature importance for supply chain planner trust and adoption

## Action

**Architected a two-stage hybrid ensemble pipeline:**

1. **Stage 1 – Linear Regression Baseline**: Engineered 47 features including lagged demand, price indices, promotional calendars, weather anomalies, and macroeconomic indicators. Trained a regularized linear regression (ElasticNet, α=0.15, l1_ratio=0.6) to capture global linear relationships and generate baseline predictions.

2. **Stage 2 – Residual Learning with Random Forest**: Extracted LR residuals (prediction errors) as the target variable. Trained a Random Forest (500 estimators, max_depth=12, min_samples_leaf=5) on the same feature set to model the *non-linear error structure*—effectively learning where and why the linear model fails.

3. **Validation & Deployment**: Implemented walk-forward validation (52-week rolling windows) mimicking production retraining cadence. Built a SHAP-based explanation layer for planner-facing dashboards.

**Key innovations:**
- Residual-targeting architecture avoids RF overfitting to dominant linear trends
- Shared feature space ensures coherent error correction
- Modular design allows swapping Stage 1/2 models independently

## Result

| Metric | Baseline (LR Only) | Hybrid (LR → RF Residuals) | Improvement |
|--------|-------------------|---------------------------|-------------|
| **MAPE (Weighted)** | 18.7% | **14.4%** | **↓ 23%** |
| **Stockout Rate** | 12.1% | **8.3%** | **↓ 31%** |
| **Excess Inventory** | $2.3M/yr | **$1.6M/yr** | **↓ $700K/yr** |
| **Inference Latency** | 12ms | 47ms | Within SLA (<100ms) |

**Business impact:** Model promoted to production across 3 regional DCs. Planner adoption reached 89% within 60 days due to SHAP explainability. Framework reused for two subsequent projects: warehouse labor forecasting and carrier cost prediction.