# BioAge

**How old is your body — really?**

BioAge calculates your biological age from 5 clinically validated health metrics, then tells you which ones to fix and how, ranked by longevity impact. Free, private, and science-backed. No sign-up. No upload. Your health data never leaves your device.

---

## What it does

Most health apps tell you what your numbers are. BioAge tells you what they *mean* for how your body is ageing — and what to do about it. It takes your raw health data, scores each metric against sex-specific clinical ranges, computes a single biological age estimate using peer-reviewed methodology, and produces a prioritised 30-day action plan ranked by the years of bio age you could recover.

---

## The 5 metrics

| Metric | Unit | Why it matters | How to measure |
|---|---|---|---|
| **VO₂ Max** | mL/kg/min | The single strongest predictor of long-term survival — stronger than blood pressure, cholesterol, or smoking. Each 1-unit improvement reduces all-cause mortality risk by ~13%. | Apple Watch outdoor run · 12-min Cooper Run · Lab test |
| **Resting Heart Rate** | bpm | A lower RHR means your heart pumps more blood per beat. RHR above 76 bpm is associated with significantly higher cardiovascular risk. | Apple Watch · Wear OS watch · 60-sec morning wrist count |
| **Blood Pressure** | mmHg systolic | High BP silently damages arteries and organs for years. Keeping systolic below 120 mmHg dramatically reduces risk of heart attack, stroke, and kidney disease. | Omron/Withings cuff — syncs to Apple Health or Google Fit |
| **Fasting Glucose** | mg/dL | Chronically elevated glucose accelerates cellular ageing even below the diabetic threshold. Optimal target 60–85 mg/dL — tighter than standard clinical guidelines. | ReliOn glucometer → Apple Health or Google Fit sync · CGM |
| **Body Fat %** | % (sex-specific) | Excess fat — especially visceral — drives insulin resistance and inflammation. Unlike BMI, body fat % correctly separates muscle from fat mass. | Smart scale (Withings/Renpho) → Apple Health or Google Fit |

---

## How it works

**1 — Import or log**
Drop your Apple Health ZIP or Google Fit Takeout ZIP into the browser — no upload, no account required. The streaming parser handles files of any size (600 MB+ Apple Health exports work fine) in 64 KB chunks entirely in memory. Or log any reading manually.

**2 — Score each metric**
Each metric is scored 15–100 against sex-specific clinical ranges from ACSM, AHA, ADA, and ACE. Ethnicity-adjusted thresholds are applied where peer-reviewed evidence supports them (South Asian, East Asian, Black/African American, Hispanic/Latino).

**3 — Estimate biological age**
Each biomarker implies an age based on where your value sits relative to population regression curves, calibrated from NHANES, the FRIEND Registry, and ACSM/AHA/ADA reference data. These implied ages are combined using the **Klemera-Doubal Method (KDM)** — a precision-weighted average that can show bio age both younger *and* older than your chronological age. Missing metrics anchor the estimate toward your actual age rather than distorting the result.

**4 — Prioritised action plan**
Each metric is ranked by the years of bio age you could recover if it reached optimal. The 30-day plan gives specific, research-backed protocols for each — not generic health tips.

---

## Features

- **Biological age estimate** using KDM — the most validated bio age algorithm in peer-reviewed literature. Bio age can be younger or older than your chronological age.
- **iOS import** — Apple Health ZIP parsed via browser-native DecompressionStream API. No upload, any file size.
- **Android import** — Google Fit Takeout ZIP auto-detected and parsed from Fit/All Data JSON files.
- **Trend tracking** — monthly bio age trajectory over 12 months; per-metric sparklines with optimal reference lines.
- **Rolling snapshot** — exportable JPEG of all 5 metric trends for a chosen period (1, 3, or 6 calendar months), with bio age trajectory and 30-day priority plan.
- **Ethnicity-adjusted ranges** — evidence-based threshold adjustments from WHO, ADA, AHA, and Lancet.
- **Impact-ranked action plan** — each metric ranked by years of bio age recoverable at optimal.
- **Session-only privacy** — health data lives in browser memory only; gone the moment the tab closes.

---

## Privacy

BioAge runs entirely in your browser.

- Apple Health ZIPs are decompressed via the browser's built-in `DecompressionStream` API
- Google Fit ZIPs are parsed file-by-file in memory
- No data is ever sent to a server
- No accounts, no databases, no analytics on your health information
- Health entries are **session-only**: they live in memory while the tab is open and are permanently gone when you close it
- Preferences (age, sex, ethnicity) are stored locally in your browser only

## Bio age formula

Biological age is computed using the **Klemera-Doubal Method (KDM)**, introduced in Klemera & Doubal (2006, *Mechanisms of Ageing and Development*) and consistently shown to outperform simple averaging, PCA, and multiple linear regression in mortality prediction.

Each biomarker is modelled as a linear function of chronological age in the reference population. Your reading is converted into an implied age for that biomarker, then all implied ages are combined as a precision-weighted average — biomarkers that track age more tightly in the population receive more weight. Chronological age itself is included as an anchor so the estimate is appropriately conservative when data is sparse.

Population parameters are calibrated from NHANES III, the FRIEND Registry, and ACSM/AHA/ADA sex-stratified reference data.

---

## Scientific references

| Metric | Source | Finding used |
|---|---|---|
| VO₂ Max | [Mandsager et al., JAMA 2018](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428) | VO₂ Max is the strongest predictor of all-cause mortality; each 1-MET improvement reduces risk ~13% |
| VO₂ Max ranges | [ACSM Guidelines 11th Ed., 2022](https://acsm.org/education-resources/books/guidelines-exercise-testing-prescription/) | Sex-specific VO₂ Max reference ranges (Poor → Excellent) for all adult age groups |
| Resting Heart Rate | [Zhang et al., CMAJ 2016](https://www.cmaj.ca/content/188/3/E53) | RHR above 80 bpm independently associated with higher cardiovascular mortality; each 10 bpm increase ≈ 18% higher risk |
| Blood Pressure ranges | [Whelton et al., AHA/ACC 2017](https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065) | Landmark guideline lowering hypertension threshold to 130/80 mmHg |
| BP optimal target | [SPRINT Trial, NEJM 2015](https://www.nejm.org/doi/full/10.1056/NEJMoa1511939) | Targeting systolic <120 mmHg reduced cardiovascular events 25% and all-cause mortality 27% |
| Fasting Glucose | [ADA Standards of Care, 2023](https://diabetesjournals.org/care/issue/46/Supplement_1) | Glucose categories: Normal <100, Pre-diabetic 100–125, Diabetic ≥126 mg/dL |
| Glucose (optimal) | [Peter Attia MD — *Outlive*, 2022](https://peterattiamd.com/category/metabolic-health/glucose-and-insulin/) | Tighter optimal range 72–85 mg/dL based on CGM and insulin-sensitivity data |
| Body Fat % | [ACE Norms, 2022](https://www.acefitness.org/education-and-resources/lifestyle/blog/112/what-are-the-guidelines-for-percentage-of-body-fat-loss/) | Sex-stratified body fat reference ranges (Essential → Obese) |
| Asian BMI/body fat | [WHO Expert Consultation, Lancet 2004](https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(03)15268-3/fulltext) | East/South Asian populations develop cardiometabolic disease at lower body fat levels |
| BP (Black adults) | [Ferdinand & Nasser, PMC 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7301145/) | Earlier onset and higher severity of hypertension in Black/African American adults |
| Bio age formula | [Klemera & Doubal, Mech Ageing Dev 2006](https://pubmed.ncbi.nlm.nih.gov/16318865/) | KDM mathematical basis — outperforms averaging and PCA in mortality prediction |
| Ethnic metabolic risk | [Lancet Diabetes & Endocrinology, 2020](https://www.thelancet.com/journals/landia/article/PIIS2213-8587(20)30203-4/fulltext) | East/South Asian individuals develop insulin resistance at lower body fat thresholds |

---

## Disclaimer

BioAge is a personal health tracking tool for informational purposes only. It is not a medical device, and nothing in the app constitutes medical advice, diagnosis, or treatment. All reference ranges and recommendations are derived from published clinical guidelines but are not a substitute for personalised advice from a qualified healthcare professional. Always consult a physician before making changes to your health, diet, or exercise regimen.
