function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uniform(rng, lo, hi) {
  return lo + (hi - lo) * rng();
}

function bernoulliFromLogit(rng, logit) {
  const p = 1 / (1 + Math.exp(-logit));
  return rng() < p ? 1 : 0;
}

export const treeDatasets = [
  {
    id: 'glucose-hba1c',
    label: 'Glucose + HbA1c → diabetes',
    short: 'Glucose, HbA1c → diabetes',
    description:
      'Two of the most common laboratory markers used to diagnose diabetes. Each one alone can identify many cases; together they cover most. A decision tree learns thresholds reminiscent of the ADA criteria (FPG ≥ 126 mg/dL or HbA1c ≥ 6.5%).',
    clinicalNote:
      'Real-world diagnosis adds repeat testing, oral glucose tolerance, and clinical context. The tree we fit here is a teaching cartoon, not a clinical algorithm.',
    x1Label: 'Fasting glucose (mg/dL)',
    x2Label: 'HbA1c (%)',
    x1Short: 'glucose',
    x2Short: 'HbA1c',
    x1Unit: 'mg/dL',
    x2Unit: '%',
    x1Range: [70, 200],
    x2Range: [4.5, 11],
    positiveLabel: 'diabetic',
    negativeLabel: 'non-diabetic',
    n: 110,
    sample(seed, n = this.n) {
      const rng = mulberry32(seed);
      const pts = [];
      for (let i = 0; i < n; i++) {
        const x1 = uniform(rng, 72, 195);
        const x2 = uniform(rng, 4.7, 10.5);
        // Logit increases with both features, with a soft elbow that the
        // tree will approximate as a step function.
        const z =
          -10 + 0.035 * (x1 - 100) + 1.6 * (x2 - 5.7) + 0.02 * (x1 - 100) * (x2 - 5.7) * 0.05;
        pts.push({ x1, x2, y: bernoulliFromLogit(rng, z) });
      }
      return pts;
    },
  },
  {
    id: 'tumor-age-malignancy',
    label: 'Tumor diameter + age → malignancy',
    short: 'Tumor + age → malignancy',
    description:
      'Larger tumors at presentation and older patients are both more likely to be malignant on biopsy. A tree captures this with axis-aligned splits, e.g. "if tumor > 25 mm, look at age, otherwise call benign".',
    clinicalNote:
      'Real malignancy risk depends on histology, imaging features, and family history. We use diameter and age purely because they make for a clean two-dimensional teaching demo.',
    x1Label: 'Tumor diameter (mm)',
    x2Label: 'Age (years)',
    x1Short: 'diameter',
    x2Short: 'age',
    x1Unit: 'mm',
    x2Unit: 'yr',
    x1Range: [3, 55],
    x2Range: [25, 85],
    positiveLabel: 'malignant',
    negativeLabel: 'benign',
    n: 110,
    sample(seed, n = this.n) {
      const rng = mulberry32(seed);
      const pts = [];
      for (let i = 0; i < n; i++) {
        const x1 = uniform(rng, 4, 50);
        const x2 = uniform(rng, 28, 82);
        const z = -6 + 0.16 * x1 + 0.05 * x2;
        pts.push({ x1, x2, y: bernoulliFromLogit(rng, z) });
      }
      return pts;
    },
  },
  {
    id: 'hr-bp-cardiac',
    label: 'Resting HR + systolic BP → 1-yr cardiac event',
    short: 'HR, BP → cardiac event',
    description:
      'In a cardiology follow-up cohort, very high resting heart rate and very high systolic blood pressure both raise the chance of a major adverse cardiac event within a year. The interaction is non-linear: trees are good at carving out the "high-risk corner".',
    clinicalNote:
      'Risk scores (e.g. Framingham, SCORE2) include cholesterol, smoking, diabetes, and family history. Two features are enough to illustrate decision trees but never enough for clinical use.',
    x1Label: 'Resting HR (bpm)',
    x2Label: 'Systolic BP (mmHg)',
    x1Short: 'HR',
    x2Short: 'SBP',
    x1Unit: 'bpm',
    x2Unit: 'mmHg',
    x1Range: [50, 110],
    x2Range: [100, 180],
    positiveLabel: 'event',
    negativeLabel: 'no event',
    n: 110,
    sample(seed, n = this.n) {
      const rng = mulberry32(seed);
      const pts = [];
      for (let i = 0; i < n; i++) {
        const x1 = uniform(rng, 52, 108);
        const x2 = uniform(rng, 102, 178);
        // Threshold-y truth: high risk only when both HR > 80 AND BP > 145ish,
        // approximately. Tree should carve this corner well.
        const hr = (x1 - 80) / 12;
        const bp = (x2 - 140) / 18;
        const z = -3 + 1.6 * hr + 1.4 * bp + 1.0 * Math.max(0, hr) * Math.max(0, bp);
        pts.push({ x1, x2, y: bernoulliFromLogit(rng, z) });
      }
      return pts;
    },
  },
];

export function generateTreeDataset(dataset, seed, n) {
  return dataset.sample(seed, n);
}
