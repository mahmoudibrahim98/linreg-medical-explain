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
