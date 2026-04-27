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
