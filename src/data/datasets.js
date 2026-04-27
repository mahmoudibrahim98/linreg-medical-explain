// Seedable PRNG so each (dataset, seed) pair produces a stable point cloud.
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

function gaussian(rng) {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function uniform(rng, lo, hi) {
  return lo + (hi - lo) * rng();
}

export const datasets = [
  {
    id: 'bmi-sbp',
    label: 'BMI → Systolic blood pressure',
    short: 'BMI vs. SBP',
    description:
      'In adult outpatient cohorts, body mass index is positively associated with systolic blood pressure. We simulate a small clinic of patients to see how strong that relationship looks at the individual level.',
    clinicalNote:
      'A useful screening relationship — but BP is influenced by age, salt intake, medications, and stress, so any single line is a coarse summary.',
    xLabel: 'BMI (kg/m²)',
    yLabel: 'Systolic BP (mmHg)',
    xUnit: 'kg/m²',
    yUnit: 'mmHg',
    xRange: [17, 42],
    yRange: [90, 180],
    n: 80,
    truth: { slope: 1.6, intercept: 82, noise: 11 },
    sample(seed) {
      const rng = mulberry32(seed);
      const pts = [];
      for (let i = 0; i < this.n; i++) {
        const x = uniform(rng, 18, 40);
        const y = this.truth.intercept + this.truth.slope * x + gaussian(rng) * this.truth.noise;
        pts.push({ x, y: Math.max(this.yRange[0] + 1, Math.min(this.yRange[1] - 1, y)) });
      }
      return pts;
    },
  },
  {
    id: 'age-hba1c',
    label: 'Age → HbA1c',
    short: 'Age vs. HbA1c',
    description:
      'Glycated hemoglobin (HbA1c) tends to creep upward with age in the general non-diabetic population. We simulate a community sample to inspect that trend.',
    clinicalNote:
      'The slope here is small and noisy — a reminder that statistically real effects can still be clinically modest.',
    xLabel: 'Age (years)',
    yLabel: 'HbA1c (%)',
    xUnit: 'yr',
    yUnit: '%',
    xRange: [20, 85],
    yRange: [4.0, 7.5],
    n: 100,
    truth: { slope: 0.025, intercept: 4.55, noise: 0.35 },
    sample(seed) {
      const rng = mulberry32(seed);
      const pts = [];
      for (let i = 0; i < this.n; i++) {
        const x = uniform(rng, 22, 82);
        const y = this.truth.intercept + this.truth.slope * x + gaussian(rng) * this.truth.noise;
        pts.push({ x, y: Math.max(this.yRange[0] + 0.05, Math.min(this.yRange[1] - 0.05, y)) });
      }
      return pts;
    },
  },
  {
    id: 'tumor-recurrence',
    label: 'Tumor diameter → 5-year recurrence risk',
    short: 'Tumor size vs. recurrence',
    description:
      'Larger primary tumors carry higher recurrence risk after resection. We simulate a registry of patients with a continuous risk score derived from a survival model.',
    clinicalNote:
      'In real practice this relationship is non-linear and confounded by stage, grade, and treatment — useful to compare a linear approximation to a true non-linear truth.',
    xLabel: 'Tumor diameter (mm)',
    yLabel: '5-yr recurrence risk score (%)',
    xUnit: 'mm',
    yUnit: '%',
    xRange: [4, 55],
    yRange: [0, 95],
    n: 70,
    truth: { slope: 1.45, intercept: 6, noise: 8 },
    sample(seed) {
      const rng = mulberry32(seed);
      const pts = [];
      for (let i = 0; i < this.n; i++) {
        const x = uniform(rng, 5, 50);
        const y = this.truth.intercept + this.truth.slope * x + gaussian(rng) * this.truth.noise;
        pts.push({ x, y: Math.max(0.5, Math.min(94, y)) });
      }
      return pts;
    },
  },
  {
    id: 'dose-response',
    label: 'Drug dose → Pain reduction',
    short: 'Dose vs. response',
    description:
      'For an analgesic in early-phase trials, the dose-response can look approximately linear over the tested range. We simulate a small dose-finding study with patient-reported pain reduction (VAS, 0–30 points).',
    clinicalNote:
      'Real dose-response curves often plateau or have side-effect ceilings — beware extrapolating a linear fit beyond the data range.',
    xLabel: 'Dose (mg)',
    yLabel: 'Pain reduction (VAS points)',
    xUnit: 'mg',
    yUnit: 'pts',
    xRange: [0, 105],
    yRange: [-5, 30],
    n: 60,
    truth: { slope: 0.18, intercept: 0.4, noise: 2.6 },
    sample(seed) {
      const rng = mulberry32(seed);
      const pts = [];
      for (let i = 0; i < this.n; i++) {
        const x = uniform(rng, 0, 100);
        const y = this.truth.intercept + this.truth.slope * x + gaussian(rng) * this.truth.noise;
        pts.push({ x, y });
      }
      return pts;
    },
  },
];

export function generateDataset(dataset, seed) {
  return dataset.sample(seed);
}
