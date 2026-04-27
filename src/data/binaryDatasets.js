// Seedable PRNG so each (dataset, seed) pair produces a stable cohort.
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

export const binaryDatasets = [
  {
    id: 'tumor-malignancy',
    label: 'Tumor diameter → malignant vs. benign',
    short: 'Tumor → malignancy',
    description:
      'A breast or thyroid clinic measures tumor diameter at presentation. Larger lesions are more often malignant on biopsy — but the relationship is probabilistic, not absolute.',
    clinicalNote:
      'Diameter alone is a weak classifier in real practice; histology, imaging features, and risk factors add far more information. We use it here because the clinical intuition (bigger ≈ scarier) is universal.',
    xLabel: 'Tumor diameter (mm)',
    yLabel: 'P(malignant)',
    xShort: 'diameter',
    yShort: 'P(malignant)',
    xUnit: 'mm',
    positiveLabel: 'malignant',
    negativeLabel: 'benign',
    xRange: [3, 50],
    n: 80,
    truth: { beta0: -3.2, beta1: 0.18 },
    sample(seed, n = this.n) {
      const rng = mulberry32(seed);
      const pts = [];
      for (let i = 0; i < n; i++) {
        const x = uniform(rng, 4, 48);
        const z = this.truth.beta0 + this.truth.beta1 * x;
        pts.push({ x, y: bernoulliFromLogit(rng, z) });
      }
      return pts;
    },
  },
  {
    id: 'age-mortality-mi',
    label: 'Age → 1-yr mortality after MI',
    short: 'Age vs. post-MI mortality',
    description:
      'Among patients hospitalized for myocardial infarction, age is one of the strongest single predictors of 1-year mortality. We simulate a registry to see the relationship clearly.',
    clinicalNote:
      'Real risk scores (TIMI, GRACE) include heart rate, blood pressure, ECG, troponin, and comorbidities. Age alone overestimates the apparent strength of "elderly = doomed".',
    xLabel: 'Age at MI (years)',
    yLabel: 'P(death within 1 year)',
    xShort: 'age',
    yShort: 'P(death)',
    xUnit: 'yr',
    positiveLabel: 'died',
    negativeLabel: 'survived',
    xRange: [40, 95],
    n: 100,
    truth: { beta0: -8.5, beta1: 0.105 },
    sample(seed, n = this.n) {
      const rng = mulberry32(seed);
      const pts = [];
      for (let i = 0; i < n; i++) {
        const x = uniform(rng, 42, 92);
        const z = this.truth.beta0 + this.truth.beta1 * x;
        pts.push({ x, y: bernoulliFromLogit(rng, z) });
      }
      return pts;
    },
  },
  {
    id: 'psa-cancer',
    label: 'PSA → biopsy-confirmed prostate cancer',
    short: 'PSA → cancer',
    description:
      'Prostate-specific antigen is a continuous biomarker; a higher value raises (but does not guarantee) the probability of cancer on biopsy. Logistic regression turns the level into a probability.',
    clinicalNote:
      'PSA has well-known false positives (BPH, prostatitis) and false negatives. Modern practice uses PSA density, free/total ratio, and MRI — not PSA alone.',
    xLabel: 'PSA (ng/mL)',
    yLabel: 'P(cancer on biopsy)',
    xShort: 'PSA',
    yShort: 'P(cancer)',
    xUnit: 'ng/mL',
    positiveLabel: 'cancer',
    negativeLabel: 'no cancer',
    xRange: [0, 20],
    n: 90,
    truth: { beta0: -2.4, beta1: 0.42 },
    sample(seed, n = this.n) {
      const rng = mulberry32(seed);
      const pts = [];
      for (let i = 0; i < n; i++) {
        const x = uniform(rng, 0.5, 18);
        const z = this.truth.beta0 + this.truth.beta1 * x;
        pts.push({ x, y: bernoulliFromLogit(rng, z) });
      }
      return pts;
    },
  },
];

export function generateBinaryDataset(dataset, seed, n) {
  return dataset.sample(seed, n);
}
