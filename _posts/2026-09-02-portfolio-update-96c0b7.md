---
title: "Automated NHBI Tomato Price Data Pipeline"
date: "2024-06-23"
techStack: ["Python", "Pandas", "NumPy", "Matplotlib"]
summary: "Built a Python pipeline processing 240+ monthly CSVs from NHBI to deliver cleaned Kaggle-ready tomato price datasets, saving 30+ hours of effort."
---

## Situation
Monthly National Horticulture Board of India (NHBI) tomato price CSVs were being downloaded and processed by hand every month. With 240+ historical files already accumulated and a new file landing regularly, manual cleanup could not keep pace with the growing dataset or the need for trend analysis and forecasting.

## Task
Design and deliver an automated ingestion and processing pipeline that could pull every NHBI monthly CSV, consistently clean and aggregate the records, and publish a trustworthy dataset suitable for tomato price trend analysis and future price prediction.

## Action
- Wrote a Python pipeline that ingests 240+ monthly CSV files directly from the NHBI website and standardizes their structure.
- Used Pandas and NumPy to clean the raw records and aggregate them into a consistent time-series schema suitable for downstream analysis.
- Added logging throughout the run so file-level ingestion issues and transformations were traceable end to end.
- Produced the cleaned, aggregated output as a published Kaggle dataset and used Matplotlib for exploratory trend visualizations that informed the dataset design.

## Result
- Replaced a fully manual workflow and reclaimed 30+ hours of effort that had been spent hand-cleaning CSVs each cycle.
- Delivered a single, analysis-ready Kaggle dataset covering 240+ months of NHBI tomato prices, enabling downstream trend discovery and future price prediction models.
- Standardized logging made ingestion failures and data quality issues immediately visible, reducing the risk of silent bad rows making it into the published dataset.