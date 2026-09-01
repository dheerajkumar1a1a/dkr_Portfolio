---
title: "Supply Chain Optimization with Hybrid Linear Regression and Random Forest Model"
date: "2026-03-15"
techStack:
  - Python
  - scikit-learn
  - pandas
  - NumPy
  - Jupyter Notebook
summary: "Developed a hybrid machine learning pipeline that feeds linear regression residuals into a random forest to improve supply chain demand forecasting accuracy."
---

## Situation
The logistics team faced inconsistent demand forecasts from a pure linear regression model, leading to overstocking and stockouts across multiple distribution centers. The model captured overall trends but struggled with non-linear seasonal patterns and sudden demand spikes.

## Task
Design a more robust forecasting solution that retains the interpretability of linear regression while capturing complex, non-linear residuals to reduce forecast error and optimize inventory levels.

## Action
1. **Data Preparation**: Cleaned and engineered features from historical sales, promotions, weather, and holiday calendars (3 years, 10 k SKUs).
2. **Baseline Linear Regression**: Trained a multivariate LR model to establish a transparent baseline and extract residuals (noise).
3. **Hybrid Architecture**: Fed the LR residuals as additional features into a Random Forest regressor, allowing the ensemble to learn non-linear correction patterns.
4. **Model Tuning**: Used time-series cross-validation and grid search to optimize RF hyperparameters (n_estimators, max_depth, min_samples_leaf).
5. **Evaluation & Deployment**: Compared MAE, RMSE, and MAPE against the baseline; packaged the pipeline with MLflow for versioning and deployed as a batch inference job on Airflow.

## Result
- **Forecast Accuracy**: Reduced MAE by 18 % and MAPE from 12.4 % to 9.1 % across the test horizon.
- **Inventory Impact**: Enabled a 7 % reduction in safety stock while maintaining a 98 % service level.
- **Operational Efficiency**: Automated retraining monthly; inference latency < 2 seconds per 10 k predictions.
- **Stakeholder Adoption**: Supply chain planners adopted the hybrid forecasts for weekly replenishment planning, citing improved trust due to the interpretable LR component.