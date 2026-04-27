import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sigmoid } from '../stats/regression';

const POSITIVE_COLOR = '#dc2626';
const NEGATIVE_COLOR = '#1f6feb';
const CURVE_COLOR = '#e07b00';
const FIT_COLOR = '#2ca02c';
const LINEAR_COLOR = '#7c3aed';
const N_SAMPLES = 200;

function curvePath(fn, xRange, xScale, yScale) {
  const [a, b] = xRange;
  let d = '';
  for (let i = 0; i < N_SAMPLES; i++) {
    const t = i / (N_SAMPLES - 1);
    const x = a + (b - a) * t;
    const y = fn(x);
    d += i === 0 ? `M ${xScale(x)} ${yScale(y)}` : ` L ${xScale(x)} ${yScale(y)}`;
  }
  return d;
}

export default function LogisticPlot({
  points,
  curve,
  onCurveChange,
  fit,
  linearFit,
  showFit,
  showLinear,
  showUserCurve = true,
  threshold,
  showThreshold = false,
  predictionMode = false,
  predictX,
  onPredictXChange,
  predictWith = 'user', // 'user' or 'fit'
  xLabel,
  yLabel,
  xRange,
  positiveLabel,
  negativeLabel,
  width = 620,
  height = 380,
}) {
  const svgRef = useRef(null);
  const stateRef = useRef({
    curve,
    threshold,
    showThreshold,
    showFit,
    showLinear,
    showUserCurve,
    fit,
    linearFit,
    predictionMode,
    predictX,
    predictWith,
  });
  const elemsRef = useRef({});
  const onChangeRef = useRef(onCurveChange);
  const onPredictXChangeRef = useRef(onPredictXChange);

  useEffect(() => {
    onChangeRef.current = onCurveChange;
    onPredictXChangeRef.current = onPredictXChange;
  }, [onCurveChange, onPredictXChange]);

  // Structural setup
  useEffect(() => {
    const margin = { top: 18, right: 28, bottom: 56, left: 64 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear().domain(xRange).range([0, innerW]).nice();
    const yScale = d3.scaleLinear().domain([-0.15, 1.15]).range([innerH, 0]);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // [0, 1] band shading and reference lines
    const bandTop = yScale(1);
    const bandBottom = yScale(0);
    root
      .append('rect')
      .attr('x', 0)
      .attr('y', bandTop)
      .attr('width', innerW)
      .attr('height', bandBottom - bandTop)
      .attr('fill', 'rgba(31, 111, 235, 0.04)');
    root
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', 'rgba(0,0,0,0.4)')
      .attr('stroke-dasharray', '3 3');
    root
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', yScale(1))
      .attr('y2', yScale(1))
      .attr('stroke', 'rgba(0,0,0,0.4)')
      .attr('stroke-dasharray', '3 3');

    // Axes
    root
      .append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(7));
    root
      .append('g')
      .attr('class', 'axis')
      .call(
        d3
          .axisLeft(yScale)
          .tickValues([0, 0.25, 0.5, 0.75, 1])
          .tickFormat(d3.format('.2f'))
      );

    root
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', innerW / 2)
      .attr('y', innerH + 44)
      .attr('text-anchor', 'middle')
      .text(xLabel);
    root
      .append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .text(yLabel);

    // Group order: linear/fit/threshold below, user curve above, points top
    const linearG = root.append('g').attr('class', 'linear-fit-layer');
    const fitG = root.append('g').attr('class', 'fit-layer');
    const userG = root.append('g').attr('class', 'user-curve-layer');
    const thresholdG = root.append('g').attr('class', 'threshold-layer');
    const predictionG = root
      .append('g')
      .attr('class', 'prediction-layer')
      .style('display', 'none');
    const pointsG = root.append('g').attr('class', 'points-layer');

    // Outcome row labels at right
    root
      .append('text')
      .attr('class', 'outcome-label')
      .attr('x', innerW + 4)
      .attr('y', yScale(1) + 4)
      .attr('text-anchor', 'start')
      .attr('fill', POSITIVE_COLOR)
      .text(`y = 1`);
    root
      .append('text')
      .attr('class', 'outcome-label')
      .attr('x', innerW + 4)
      .attr('y', yScale(0) + 4)
      .attr('text-anchor', 'start')
      .attr('fill', NEGATIVE_COLOR)
      .text(`y = 0`);

    // Jitter y for visibility. Disable pointer events so the points never
    // intercept clicks meant for the draggable curve underneath.
    pointsG.style('pointer-events', 'none');
    function plotPoints() {
      pointsG.selectAll('circle').remove();
      const rng = mulberry(42);
      pointsG
        .selectAll('circle')
        .data(points)
        .enter()
        .append('circle')
        .attr('cx', (d) => xScale(d.x))
        .attr('cy', (d) => {
          const base = d.y === 1 ? 1 : 0;
          const jitter = (rng() - 0.5) * 0.12;
          return yScale(base + jitter);
        })
        .attr('r', 4)
        .attr('fill', (d) => (d.y === 1 ? POSITIVE_COLOR : NEGATIVE_COLOR))
        .attr('opacity', 0.7);
    }
    plotPoints();

    // User curve (orange) with a transparent hit path layered on top so
    // dragging is forgiving even where the visible stroke is thin.
    const userPath = userG
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', CURVE_COLOR)
      .attr('stroke-width', 3)
      .attr('pointer-events', 'none');
    const userHit = userG
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 22)
      .attr('cursor', 'ns-resize')
      .style('pointer-events', 'stroke');

    // Middle handle (translate β₀ horizontally).
    const handleM = userG
      .append('circle')
      .attr('r', 10)
      .attr('fill', CURVE_COLOR)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'ew-resize');

    // ML fit curve (green dashed)
    const fitPath = fitG
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', FIT_COLOR)
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '6 4')
      .style('display', 'none');

    // Linear (OLS) fit on 0/1 — shows why a line fails
    const linearPath = linearG
      .append('line')
      .attr('stroke', LINEAR_COLOR)
      .attr('stroke-width', 2)
      .style('display', 'none');

    // Threshold marker
    const thresholdLine = thresholdG
      .append('line')
      .attr('stroke', '#0d9488')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 3')
      .style('display', 'none');
    const thresholdLabel = thresholdG
      .append('text')
      .attr('class', 'threshold-label')
      .attr('text-anchor', 'middle')
      .attr('fill', '#0d9488')
      .style('display', 'none');
    // Region labels: which class the model predicts above and below the line.
    const aboveLabel = thresholdG
      .append('text')
      .attr('class', 'threshold-region-label region-above')
      .attr('text-anchor', 'middle')
      .style('display', 'none');
    const belowLabel = thresholdG
      .append('text')
      .attr('class', 'threshold-region-label region-below')
      .attr('text-anchor', 'middle')
      .style('display', 'none');

    // Prediction overlay: dashed guides from the chosen x to the curve and
    // across to the y-axis, plus a draggable marker on the curve.
    const PRED = '#7c3aed';
    const predGuideV = predictionG
      .append('line')
      .attr('stroke', PRED)
      .attr('stroke-dasharray', '4 4')
      .attr('stroke-width', 1.5);
    const predGuideH = predictionG
      .append('line')
      .attr('stroke', PRED)
      .attr('stroke-dasharray', '4 4')
      .attr('stroke-width', 1.5);
    const predTickX = predictionG
      .append('line')
      .attr('stroke', PRED)
      .attr('stroke-width', 2);
    const predTickY = predictionG
      .append('line')
      .attr('stroke', PRED)
      .attr('stroke-width', 2);
    const predLabelX = predictionG
      .append('text')
      .attr('class', 'pred-label')
      .attr('text-anchor', 'middle')
      .attr('fill', PRED);
    const predLabelY = predictionG
      .append('text')
      .attr('class', 'pred-label')
      .attr('text-anchor', 'end')
      .attr('fill', PRED);
    const predMarker = predictionG
      .append('circle')
      .attr('r', 7)
      .attr('fill', PRED)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('cursor', 'ew-resize');

    function updateUserCurve() {
      const { showUserCurve: shown, curve: c } = stateRef.current;
      if (!shown) {
        userPath.style('display', 'none');
        userHit.style('display', 'none');
        handleM.style('display', 'none');
        return;
      }
      userPath.style('display', null);
      userHit.style('display', null);
      handleM.style('display', null);
      const { beta0, beta1 } = c;
      const d = curvePath((x) => sigmoid(beta0 + beta1 * x), xRange, xScale, yScale);
      userPath.attr('d', d);
      userHit.attr('d', d);

      // Middle handle: place at p = 0.5 if it falls inside, else at center of x range
      let midX;
      if (beta1 === 0) {
        midX = (xRange[0] + xRange[1]) / 2;
      } else {
        midX = -beta0 / beta1;
        if (midX < xRange[0] || midX > xRange[1]) {
          midX = (xRange[0] + xRange[1]) / 2;
        }
      }
      handleM
        .attr('cx', xScale(midX))
        .attr('cy', yScale(sigmoid(beta0 + beta1 * midX)));
      // Keep the prediction marker stuck to the curve as it moves.
      if (stateRef.current.predictWith !== 'fit') updatePrediction();
    }

    function updateFitCurve() {
      const { showFit: shown, fit: f } = stateRef.current;
      if (!shown || !f) {
        fitPath.style('display', 'none');
        return;
      }
      fitPath
        .style('display', null)
        .attr('d', curvePath((x) => sigmoid(f.beta0 + f.beta1 * x), xRange, xScale, yScale));
      if (stateRef.current.predictWith === 'fit') updatePrediction();
    }

    function updateLinear() {
      const { showLinear: shown, linearFit: lf } = stateRef.current;
      if (!shown || !lf) {
        linearPath.style('display', 'none');
        return;
      }
      const x1 = xRange[0];
      const x2 = xRange[1];
      linearPath
        .style('display', null)
        .attr('x1', xScale(x1))
        .attr('x2', xScale(x2))
        .attr('y1', yScale(lf.slope * x1 + lf.intercept))
        .attr('y2', yScale(lf.slope * x2 + lf.intercept));
    }

    function updatePrediction() {
      const {
        predictionMode: shown,
        predictX: xv,
        predictWith,
        curve: c,
        fit: f,
      } = stateRef.current;
      if (!shown || xv === undefined || xv === null) {
        predictionG.style('display', 'none');
        return;
      }
      const params = predictWith === 'fit' && f ? f : c;
      const xClamped = Math.max(xRange[0], Math.min(xRange[1], xv));
      const z = params.beta0 + params.beta1 * xClamped;
      const p = sigmoid(z);
      const px = xScale(xClamped);
      const py = yScale(p);
      predictionG.style('display', null);
      predGuideV.attr('x1', px).attr('x2', px).attr('y1', py).attr('y2', innerH);
      predGuideH.attr('x1', 0).attr('x2', px).attr('y1', py).attr('y2', py);
      predTickX.attr('x1', px).attr('x2', px).attr('y1', innerH).attr('y2', innerH + 6);
      predTickY.attr('x1', -6).attr('x2', 0).attr('y1', py).attr('y2', py);
      predMarker.attr('cx', px).attr('cy', py);
      predLabelX
        .attr('x', px)
        .attr('y', innerH + 22)
        .text(xClamped.toFixed(1));
      predLabelY
        .attr('x', -8)
        .attr('y', py + 4)
        .text(p.toFixed(2));
    }

    function updateThreshold() {
      const { showThreshold: shown, threshold: t } = stateRef.current;
      if (!shown || t === undefined || t === null) {
        thresholdLine.style('display', 'none');
        thresholdLabel.style('display', 'none');
        aboveLabel.style('display', 'none');
        belowLabel.style('display', 'none');
        return;
      }
      const yT = yScale(t);
      const yTop = yScale(1);
      const yBottom = yScale(0);
      thresholdLine
        .style('display', null)
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', yT)
        .attr('y2', yT);
      thresholdLabel
        .style('display', null)
        .attr('x', innerW / 2)
        .attr('y', yT - 6)
        .text(`threshold = ${t.toFixed(2)}`);
      aboveLabel
        .style('display', null)
        .attr('x', innerW / 2)
        .attr('y', (yTop + yT) / 2 + 4)
        .text(`above the line: model predicts ${positiveLabel}`);
      belowLabel
        .style('display', null)
        .attr('x', innerW / 2)
        .attr('y', (yT + yBottom) / 2 + 4)
        .text(`below the line: model predicts ${negativeLabel}`);
    }

    // Drag: middle handle horizontally → translate β₀ (curve slides left/right)
    handleM.call(
      d3.drag()
        .on('drag', (event) => {
          const newMidX = Math.max(xRange[0], Math.min(xRange[1], xScale.invert(event.x)));
          const { beta1 } = stateRef.current.curve;
          // P=0.5 at -β₀/β₁. So β₀ = -newMidX * β₁
          const newB0 = -newMidX * beta1;
          stateRef.current = {
            ...stateRef.current,
            curve: { beta0: newB0, beta1 },
          };
          onChangeRef.current?.({ beta0: newB0, beta1 });
          updateUserCurve();
        })
    );

    // Drag the curve itself vertically → change steepness (β₁). The drag is
    // attached to the wide transparent hit path so users can grab anywhere
    // near the curve, not just on the 3-pixel stroke.
    let dragStartB1 = 0;
    let dragStartY = 0;
    let dragB0 = 0;
    userHit.call(
      d3.drag()
        .on('start', (event) => {
          dragStartB1 = stateRef.current.curve.beta1;
          dragStartY = event.y;
          dragB0 = stateRef.current.curve.beta0;
        })
        .on('drag', (event) => {
          // Make β₁ respond to vertical drag scaled by the data x range.
          // Up = increase steepness, down = decrease.
          const dy = (dragStartY - event.y) / innerH;
          const xSpan = xRange[1] - xRange[0];
          // Map dy in [-1, 1] to a multiplicative scaling of β₁.
          const scale = Math.exp(dy * 2.5);
          let newB1 = dragStartB1 * scale;
          // If the original β₁ is near zero, allow seeding it from the drag direction.
          if (Math.abs(dragStartB1) < 1e-3) {
            newB1 = (dy * 6) / xSpan;
          }
          // Keep the inflection (P=0.5) point fixed under the cursor's x.
          let mid;
          if (Math.abs(dragStartB1) > 1e-6) {
            mid = -dragB0 / dragStartB1;
          } else {
            mid = (xRange[0] + xRange[1]) / 2;
          }
          if (mid < xRange[0] || mid > xRange[1]) {
            mid = (xRange[0] + xRange[1]) / 2;
          }
          const newB0 = -mid * newB1;
          stateRef.current = {
            ...stateRef.current,
            curve: { beta0: newB0, beta1: newB1 },
          };
          onChangeRef.current?.({ beta0: newB0, beta1: newB1 });
          updateUserCurve();
        })
    );

    // Drag the prediction marker horizontally to scrub through x.
    predMarker.call(
      d3.drag().on('drag', (event) => {
        const newX = Math.max(
          xRange[0],
          Math.min(xRange[1], xScale.invert(event.x))
        );
        stateRef.current = { ...stateRef.current, predictX: newX };
        onPredictXChangeRef.current?.(newX);
        updatePrediction();
      })
    );

    elemsRef.current = {
      xScale,
      yScale,
      updateUserCurve,
      updateFitCurve,
      updateLinear,
      updateThreshold,
      updatePrediction,
    };

    updateUserCurve();
    updateFitCurve();
    updateLinear();
    updateThreshold();
    updatePrediction();
  }, [points, xLabel, yLabel, xRange, width, height]);

  // Update on prop changes — keep stateRef in sync so the imperative update
  // functions (defined inside the structural effect) read fresh values via
  // their stateRef closure rather than stale prop closures.
  useEffect(() => {
    stateRef.current = { ...stateRef.current, curve };
    elemsRef.current.updateUserCurve?.();
  }, [curve]);

  useEffect(() => {
    stateRef.current = { ...stateRef.current, showUserCurve };
    elemsRef.current.updateUserCurve?.();
  }, [showUserCurve]);

  useEffect(() => {
    stateRef.current = { ...stateRef.current, showFit, fit };
    elemsRef.current.updateFitCurve?.();
  }, [showFit, fit]);

  useEffect(() => {
    stateRef.current = { ...stateRef.current, showLinear, linearFit };
    elemsRef.current.updateLinear?.();
  }, [showLinear, linearFit]);

  useEffect(() => {
    stateRef.current = { ...stateRef.current, showThreshold, threshold };
    elemsRef.current.updateThreshold?.();
  }, [showThreshold, threshold]);

  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      predictionMode,
      predictX,
      predictWith,
    };
    elemsRef.current.updatePrediction?.();
  }, [predictionMode, predictX, predictWith]);

  return <svg ref={svgRef} width={width} height={height} className="scatter-svg" />;
}

// Tiny seedable RNG just for jitter, so jitter doesn't reshuffle on each
// render (which would cause points to dance around).
function mulberry(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
