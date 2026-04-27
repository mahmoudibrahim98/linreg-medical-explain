// One-feature-at-a-time CART-style decision tree for binary classification
// over a 2D feature space (x1, x2). Splits chosen by gini-impurity reduction.

export function gini(points) {
  if (!points.length) return 0;
  let pos = 0;
  for (let i = 0; i < points.length; i++) if (points[i].y === 1) pos++;
  const p1 = pos / points.length;
  const p0 = 1 - p1;
  return 1 - p1 * p1 - p0 * p0;
}

function makeLeaf(points, depth) {
  const pos = points.reduce((a, p) => a + (p.y === 1 ? 1 : 0), 0);
  const n = points.length;
  const probability = n === 0 ? 0 : pos / n;
  return {
    type: 'leaf',
    prediction: probability >= 0.5 ? 1 : 0,
    probability,
    n,
    pos,
    neg: n - pos,
    gini: gini(points),
    depth,
  };
}

function findBestSplit(points) {
  if (points.length < 2) return null;
  const baseGini = gini(points);
  if (baseGini === 0) return null;

  let best = null;
  for (const feature of ['x1', 'x2']) {
    const sorted = [...points].sort((a, b) => a[feature] - b[feature]);
    for (let i = 0; i < sorted.length - 1; i++) {
      const v1 = sorted[i][feature];
      const v2 = sorted[i + 1][feature];
      if (v1 === v2) continue;
      const threshold = (v1 + v2) / 2;
      const left = sorted.slice(0, i + 1);
      const right = sorted.slice(i + 1);
      const wgini =
        (left.length / sorted.length) * gini(left) +
        (right.length / sorted.length) * gini(right);
      const gain = baseGini - wgini;
      if (gain > 1e-9 && (!best || gain > best.gain)) {
        best = { feature, threshold, gain, gini: wgini };
      }
    }
  }
  return best;
}

export function buildTree(points, maxDepth, minSamplesSplit = 2, depth = 0) {
  if (
    depth >= maxDepth ||
    points.length < minSamplesSplit ||
    gini(points) === 0
  ) {
    return makeLeaf(points, depth);
  }
  const split = findBestSplit(points);
  if (!split) return makeLeaf(points, depth);

  const left = points.filter((p) => p[split.feature] <= split.threshold);
  const right = points.filter((p) => p[split.feature] > split.threshold);
  if (!left.length || !right.length) return makeLeaf(points, depth);

  const pos = points.reduce((a, p) => a + (p.y === 1 ? 1 : 0), 0);
  return {
    type: 'split',
    feature: split.feature,
    threshold: split.threshold,
    gain: split.gain,
    gini: gini(points),
    n: points.length,
    pos,
    neg: points.length - pos,
    depth,
    left: buildTree(left, maxDepth, minSamplesSplit, depth + 1),
    right: buildTree(right, maxDepth, minSamplesSplit, depth + 1),
  };
}

export function predict(tree, x1, x2) {
  let node = tree;
  while (node.type === 'split') {
    const v = node.feature === 'x1' ? x1 : x2;
    node = v <= node.threshold ? node.left : node.right;
  }
  return node;
}

// All leaves expressed as axis-aligned rectangles in (x1, x2) space.
export function leafRectangles(tree, x1Range, x2Range) {
  const rects = [];
  function traverse(node, bounds) {
    if (node.type === 'leaf') {
      rects.push({ ...bounds, ...node });
      return;
    }
    if (node.feature === 'x1') {
      traverse(node.left, {
        ...bounds,
        x1Max: Math.min(bounds.x1Max, node.threshold),
      });
      traverse(node.right, {
        ...bounds,
        x1Min: Math.max(bounds.x1Min, node.threshold),
      });
    } else {
      traverse(node.left, {
        ...bounds,
        x2Max: Math.min(bounds.x2Max, node.threshold),
      });
      traverse(node.right, {
        ...bounds,
        x2Min: Math.max(bounds.x2Min, node.threshold),
      });
    }
  }
  traverse(tree, {
    x1Min: x1Range[0],
    x1Max: x1Range[1],
    x2Min: x2Range[0],
    x2Max: x2Range[1],
  });
  return rects;
}

export function treeAccuracy(tree, points) {
  if (!points.length) return 0;
  let correct = 0;
  for (const p of points) {
    const leaf = predict(tree, p.x1, p.x2);
    if (leaf.prediction === p.y) correct++;
  }
  return correct / points.length;
}

export function countLeaves(tree) {
  if (tree.type === 'leaf') return 1;
  return countLeaves(tree.left) + countLeaves(tree.right);
}

export function maxDepthOf(tree) {
  if (tree.type === 'leaf') return tree.depth;
  return Math.max(maxDepthOf(tree.left), maxDepthOf(tree.right));
}
