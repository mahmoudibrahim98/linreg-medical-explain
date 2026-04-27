export function fitOLS(points) {
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const denom = sumX2 - n * meanX * meanX;
  const slope = denom === 0 ? 0 : (sumXY - n * meanX * meanY) / denom;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

export function mse(points, slope, intercept) {
  if (points.length === 0) return 0;
  let s = 0;
  for (const { x, y } of points) {
    const d = y - (slope * x + intercept);
    s += d * d;
  }
  return s / points.length;
}

export function r2(points, slope, intercept) {
  if (points.length === 0) return 0;
  const meanY = points.reduce((a, p) => a + p.y, 0) / points.length;
  let ssRes = 0, ssTot = 0;
  for (const { x, y } of points) {
    const pred = slope * x + intercept;
    ssRes += (y - pred) * (y - pred);
    ssTot += (y - meanY) * (y - meanY);
  }
  if (ssTot === 0) return 0;
  return 1 - ssRes / ssTot;
}

// Gauss elimination with partial pivoting. Solves A x = b in place.
function solve(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[pivot][i])) pivot = k;
    }
    if (pivot !== i) {
      [A[i], A[pivot]] = [A[pivot], A[i]];
      [b[i], b[pivot]] = [b[pivot], b[i]];
    }
    const piv = A[i][i];
    if (Math.abs(piv) < 1e-12) continue;
    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / piv;
      for (let j = i; j < n; j++) A[k][j] -= factor * A[i][j];
      b[k] -= factor * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
    x[i] = A[i][i] === 0 ? 0 : s / A[i][i];
  }
  return x;
}

// Polynomial OLS in standardized x (centered + scaled) for numerical stability.
// Returns coefficients in standardized space plus a `predict(x)` helper.
export function fitPolynomial(points, degree) {
  const n = points.length;
  if (n === 0) return { degree, coefficients: [], predict: () => 0, xMean: 0, xStd: 1 };
  const xVals = points.map((p) => p.x);
  const yVals = points.map((p) => p.y);
  const xMean = xVals.reduce((a, v) => a + v, 0) / n;
  const variance = xVals.reduce((s, v) => s + (v - xMean) * (v - xMean), 0) / n;
  const xStd = Math.sqrt(variance) || 1;

  const k = degree + 1;
  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    const xz = (xVals[i] - xMean) / xStd;
    const row = new Array(k);
    let pv = 1;
    for (let j = 0; j < k; j++) {
      row[j] = pv;
      pv *= xz;
    }
    for (let j = 0; j < k; j++) {
      b[j] += row[j] * yVals[i];
      for (let l = 0; l < k; l++) A[j][l] += row[j] * row[l];
    }
  }

  const beta = solve(A, b);

  return {
    degree,
    coefficients: beta,
    xMean,
    xStd,
    predict(x) {
      const xz = (x - xMean) / xStd;
      let s = 0;
      let pv = 1;
      for (let j = 0; j < k; j++) {
        s += beta[j] * pv;
        pv *= xz;
      }
      return s;
    },
  };
}

export function msePredict(points, predictFn) {
  if (points.length === 0) return 0;
  let s = 0;
  for (const { x, y } of points) {
    const d = y - predictFn(x);
    s += d * d;
  }
  return s / points.length;
}

export function r2Predict(points, predictFn) {
  if (points.length === 0) return 0;
  const meanY = points.reduce((a, p) => a + p.y, 0) / points.length;
  let ssRes = 0;
  let ssTot = 0;
  for (const { x, y } of points) {
    const pred = predictFn(x);
    ssRes += (y - pred) * (y - pred);
    ssTot += (y - meanY) * (y - meanY);
  }
  if (ssTot === 0) return 0;
  return 1 - ssRes / ssTot;
}

/* -------------------------------------------------------------------------
 * Logistic regression
 * --------------------------------------------------------------------- */

export function sigmoid(z) {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

// Newton-Raphson on standardized x for one-feature logistic regression.
// Returns coefficients in the original (unstandardized) x space.
export function fitLogistic(points, { maxIter = 60, tol = 1e-8 } = {}) {
  const n = points.length;
  if (n === 0) return { beta0: 0, beta1: 0 };
  const xs = points.map((p) => p.x);
  const xMean = xs.reduce((a, v) => a + v, 0) / n;
  const variance = xs.reduce((s, v) => s + (v - xMean) * (v - xMean), 0) / n;
  const xStd = Math.sqrt(variance) || 1;

  let b0 = 0;
  let b1 = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    let g0 = 0;
    let g1 = 0;
    let h00 = 0;
    let h01 = 0;
    let h11 = 0;
    for (let i = 0; i < n; i++) {
      const xz = (xs[i] - xMean) / xStd;
      const z = b0 + b1 * xz;
      const pr = sigmoid(z);
      const r = points[i].y - pr;
      g0 += r;
      g1 += r * xz;
      const w = pr * (1 - pr);
      h00 += w;
      h01 += w * xz;
      h11 += w * xz * xz;
    }
    // Add a tiny ridge for numerical stability (helps when data is fully
    // separable or near-degenerate).
    h00 += 1e-6;
    h11 += 1e-6;
    const det = h00 * h11 - h01 * h01;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-14) break;
    const d0 = (g0 * h11 - g1 * h01) / det;
    const d1 = (g1 * h00 - g0 * h01) / det;
    b0 += d0;
    b1 += d1;
    if (Math.abs(d0) + Math.abs(d1) < tol) break;
  }

  // Convert back from standardized to original x.
  const beta1 = b1 / xStd;
  const beta0 = b0 - (b1 * xMean) / xStd;
  return { beta0, beta1 };
}

// Intercept-only logistic regression — the "always predict the base rate"
// null model. Useful as a baseline.
export function fitLogisticIntercept(points) {
  if (points.length === 0) return { beta0: 0 };
  const pos = points.reduce((a, p) => a + p.y, 0);
  const neg = points.length - pos;
  if (pos === 0) return { beta0: -50 };
  if (neg === 0) return { beta0: 50 };
  const odds = pos / neg;
  return { beta0: Math.log(odds) };
}

export function logLoss(points, predictFn) {
  if (points.length === 0) return 0;
  let s = 0;
  for (const { x, y } of points) {
    let p = predictFn(x);
    p = Math.min(1 - 1e-12, Math.max(1e-12, p));
    s += y === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return s / points.length;
}

// Classification metrics at a chosen probability threshold.
export function classificationCounts(points, predictFn, threshold) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const { x, y } of points) {
    const p = predictFn(x);
    const yhat = p >= threshold ? 1 : 0;
    if (y === 1 && yhat === 1) tp++;
    else if (y === 0 && yhat === 1) fp++;
    else if (y === 0 && yhat === 0) tn++;
    else if (y === 1 && yhat === 0) fn++;
  }
  return { tp, fp, tn, fn };
}

export function classificationStats(points, predictFn, threshold) {
  const c = classificationCounts(points, predictFn, threshold);
  const sensitivity = c.tp + c.fn === 0 ? 0 : c.tp / (c.tp + c.fn);
  const specificity = c.tn + c.fp === 0 ? 0 : c.tn / (c.tn + c.fp);
  const ppv = c.tp + c.fp === 0 ? 0 : c.tp / (c.tp + c.fp);
  const npv = c.tn + c.fn === 0 ? 0 : c.tn / (c.tn + c.fn);
  const accuracy =
    points.length === 0 ? 0 : (c.tp + c.tn) / points.length;
  return { ...c, sensitivity, specificity, ppv, npv, accuracy };
}

// ROC curve points and AUC via the rank-based formula.
export function rocCurve(points, predictFn) {
  const scored = points
    .map((p) => ({ score: predictFn(p.x), y: p.y }))
    .sort((a, b) => b.score - a.score);
  const totalPos = scored.reduce((a, p) => a + p.y, 0);
  const totalNeg = scored.length - totalPos;
  if (totalPos === 0 || totalNeg === 0) {
    return { curve: [{ fpr: 0, tpr: 0, threshold: 1 }, { fpr: 1, tpr: 1, threshold: 0 }], auc: 0.5 };
  }
  const curve = [{ fpr: 0, tpr: 0, threshold: 1 + 1e-9 }];
  let tp = 0;
  let fp = 0;
  let prevScore = Number.POSITIVE_INFINITY;
  for (const s of scored) {
    if (s.score !== prevScore) {
      curve.push({ fpr: fp / totalNeg, tpr: tp / totalPos, threshold: s.score });
      prevScore = s.score;
    }
    if (s.y === 1) tp++;
    else fp++;
  }
  curve.push({ fpr: 1, tpr: 1, threshold: -1e-9 });

  // Trapezoidal AUC.
  let auc = 0;
  for (let i = 1; i < curve.length; i++) {
    const dx = curve[i].fpr - curve[i - 1].fpr;
    const avgY = (curve[i].tpr + curve[i - 1].tpr) / 2;
    auc += dx * avgY;
  }
  return { curve, auc };
}
