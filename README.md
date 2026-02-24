# bioage-dashboard
BioAge is an evidence‑based dashboard for tracking the health signals that actually matter — VO2Max, Resting Heart Rate, Fasting Glucose, Blood Pressure, and Body Fat %. It estimates your Biological Age over time and gives clear, actionable recommendations to improve it. Get practical steps to become a healthier, younger-feeling you!

BioAge is a decision-support and tracking tool, not medical advice. Always consult a qualified healthcare professional for diagnosis or treatment. The recommendations are evidence-informed but not a substitute for personalized medical care.

Why this exists (and why it’s useful)
Chronological age is a poor performance metric. Your biology tells the real story.
Track trends, not single numbers. Small improvements compound.
Recommendations are rooted in scientific and medical research (peer‑reviewed studies and clinical guidelines such as AHA/ADA/WHO where applicable) and target optimal ranges are customized based on one's gender and ethnicity.

Key features
1) Import from your Apple Health data: The app will automatically pull the VO2Max, Resting Heart Rate (RHR), Fasting Blood Glucose, Blood Pressure, and Body Fat % data from your Apple Health data export. Alternatively, you can manually log the datapoints directly.

2) Privacy guarantee: All data are kept private within your browser and not transmitted over the internet. The app never receives, stores, or logs any health data. The Apple Health file is opened and parsed entirely client-side in your browser tab. You can verify this by checking the Network tab in browser DevTools — no health data payloads will ever appear.

3) Biological Age estimate: The app converts metric values into a single, interpretable biological age and shows deviation from chronological age.

4) Trend visualizations: Each health metric has a clear graph visualization so you can tell temporary blips from real progress.

5) Evidence‑based targets: Default optimal ranges derived from scientific literature and clinical guidelines. The user can specify their gender and ethnicity to ensure that the optimal targets are adjusted appropriately if there are differing medical guidance based on these factors.

6) Actionable recommendations: Personalized, prioritized 30-day plan based on scientific research tied to the metrics driving your BioAge.

7) Snapshot exports for easy sharing: You can take point-in-time snapshots of your BioAge, 30-day Action Plan, and Critical Health Metrics trends over 1/3/6 months period, so you can easily share your results with family and friends.
=======
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
>>>>>>> 617361b (BioAge dashboard v1)
