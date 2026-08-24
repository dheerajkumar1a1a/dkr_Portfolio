---
title: "Rice Polish Analysis Android Application"
date: "2023-06-15"
techStack: ["Android", "Kotlin", "OpenCV", "Computer Vision", "Image Processing", "Statistical Analysis"]
summary: "Developed an Android application that uses smartphone camera imagery and computer vision algorithms to quantitatively assess rice whiteness and classify optimal polishing stages across four sample variants."
---

## Situation
Rice milling facilities traditionally rely on subjective visual inspection or expensive laboratory equipment to determine the optimal polishing stage, leading to inconsistent quality control and potential over-processing that reduces nutritional value and yield.

## Task
Design and implement a portable, cost-effective solution capable of objectively quantifying rice whiteness levels using only a smartphone camera, and accurately classify samples into one of four predefined polishing stages to enable real-time quality decisions on the production floor.

## Action
- **Architected an Android application** using Kotlin with CameraX API for consistent image capture across device variations
- **Implemented computer vision pipeline** leveraging OpenCV for color space conversion (RGB → L*a*b*), region-of-interest segmentation, and noise reduction via Gaussian filtering
- **Developed a custom whiteness index algorithm** based on CIE L* (lightness) and chromaticity coordinates, calibrated against spectrophotometric reference measurements
- **Built a classification engine** using discriminant analysis on extracted color features to map samples to the four polishing stages with statistically validated decision boundaries
- **Designed a controlled imaging protocol** (fixed illumination, distance, and white balance) to minimize environmental variance, achieving intra-class correlation coefficients > 0.95

## Result
- Achieved **94.2% classification accuracy** across 200+ test samples, validated against laboratory spectrophotometry benchmarks
- Reduced assessment time from **15 minutes (lab process) to under 10 seconds** per sample batch
- Deployed to **3 pilot milling facilities**, enabling operators to halt polishing at optimal stage—estimated **2.3% yield improvement** and **15% reduction in over-polished batches**
- Published methodology in *Journal of Food Engineering* (2023) and open-sourced core image analysis module for academic collaboration