import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const LINEAR_COLOR = '#e07b00';
const POLY_COLOR = '#7c3aed';
const TRUTH_COLOR = '#2ca02c';
const RESIDUAL_COLOR = '#dc2626';
const POINT_COLOR = '#1f6feb';

const N_SAMPLES = 160;

function curvePoints(predictFn, xRange) {
  const [a, b] = xRange;
  const out = [];
  for (let i = 0; i < N_SAMPLES; i++) {
    const x = a + ((b - a) * i) / (N_SAMPLES - 1);
    out.push([x, predictFn(x)]);
  }
  return out;
}

export default function NonlinearPlot({
  points,
  linearFit,
  polyFit,
  truthFn,
  showTruth,
  residualMaxAbs,
  xLabel,
  yLabel,
  xRange,
  yRange,
  width = 620,
  height = 380,
  resHeight = 150,
}) {
  const mainRef = useRef(null);
  const residRef = useRef(null);

  // Main scatter with linear, polynomial, and (optional) truth curves.
  useEffect(() => {
    const margin = { top: 16, right: 24, bottom: 50, left: 64 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear().domain(xRange).range([0, innerW]).nice();
    const yScale = d3.scaleLinear().domain(yRange).range([innerH, 0]).nice();

    const svg = d3.select(mainRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const grid = root.append('g').attr('class', 'grid');
    grid
      .selectAll('line.gx')
      .data(xScale.ticks(7))
      .enter()
      .append('line')
      .attr('x1', (d) => xScale(d))
      .attr('x2', (d) => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', 'rgba(0,0,0,0.06)');
    grid
      .selectAll('line.gy')
      .data(yScale.ticks(6))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', 'rgba(0,0,0,0.06)');

    root
      .append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(7));
    root.append('g').attr('class', 'axis').call(d3.axisLeft(yScale).ticks(6));

    root
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', innerW / 2)
      .attr('y', innerH + 40)
      .attr('text-anchor', 'middle')
      .text(xLabel);
    root
      .append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -48)
      .attr('text-anchor', 'middle')
      .text(yLabel);

    // Truth curve (under everything else)
    if (showTruth && truthFn) {
      const truthLine = d3
        .line()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]))
        .curve(d3.curveMonotoneX);
      root
        .append('path')
        .attr('d', truthLine(curvePoints(truthFn, xRange)))
        .attr('fill', 'none')
        .attr('stroke', TRUTH_COLOR)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6 4')
        .attr('opacity', 0.85);
    }

    // Linear fit
    if (linearFit) {
      const x1 = xRange[0];
      const x2 = xRange[1];
      root
        .append('line')
        .attr('x1', xScale(x1))
        .attr('x2', xScale(x2))
        .attr('y1', yScale(linearFit.slope * x1 + linearFit.intercept))
        .attr('y2', yScale(linearFit.slope * x2 + linearFit.intercept))
        .attr('stroke', LINEAR_COLOR)
        .attr('stroke-width', 2.5)
        .attr('opacity', 0.95);
    }

    // Polynomial fit (degree ≥ 2)
    if (polyFit && polyFit.degree >= 2) {
      const polyLine = d3
        .line()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]))
        .curve(d3.curveMonotoneX);
      root
        .append('path')
        .attr('d', polyLine(curvePoints((x) => polyFit.predict(x), xRange)))
        .attr('fill', 'none')
        .attr('stroke', POLY_COLOR)
        .attr('stroke-width', 2.5);
    }

    // Points on top
    root
      .append('g')
      .selectAll('circle')
      .data(points)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 4)
      .attr('fill', POINT_COLOR)
      .attr('opacity', 0.78);
  }, [points, linearFit, polyFit, truthFn, showTruth, xLabel, yLabel, xRange, yRange, width, height]);

  // Residuals-vs-x mini chart. Residuals computed from `polyFit` (so degree=1
  // shows the linear residuals — the structured-pattern smoking gun).
  useEffect(() => {
    const margin = { top: 8, right: 24, bottom: 36, left: 64 };
    const innerW = width - margin.left - margin.right;
    const innerH = resHeight - margin.top - margin.bottom;

    const xScale = d3.scaleLinear().domain(xRange).range([0, innerW]).nice();
    const residuals = points.map((p) => ({ x: p.x, r: p.y - polyFit.predict(p.x) }));
    const fallback = Math.max(0.001, ...residuals.map((r) => Math.abs(r.r))) * 1.15;
    const yMax = Number.isFinite(residualMaxAbs) && residualMaxAbs > 0
      ? residualMaxAbs
      : fallback;
    const yScale = d3.scaleLinear().domain([-yMax, yMax]).range([innerH, 0]);

    const svg = d3.select(residRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${resHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Zero line
    root
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', 'rgba(0,0,0,0.4)')
      .attr('stroke-width', 1);

    root
      .append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(7));
    root
      .append('g')
      .attr('class', 'axis')
      .call(d3.axisLeft(yScale).ticks(4));

    root
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', innerW / 2)
      .attr('y', innerH + 32)
      .attr('text-anchor', 'middle')
      .text(xLabel);
    root
      .append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -48)
      .attr('text-anchor', 'middle')
      .text('residual');

    // Vertical sticks from zero to each residual
    root
      .append('g')
      .selectAll('line')
      .data(residuals)
      .enter()
      .append('line')
      .attr('x1', (d) => xScale(d.x))
      .attr('x2', (d) => xScale(d.x))
      .attr('y1', yScale(0))
      .attr('y2', (d) => yScale(d.r))
      .attr('stroke', RESIDUAL_COLOR)
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.75);

    root
      .append('g')
      .selectAll('circle')
      .data(residuals)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.r))
      .attr('r', 2.5)
      .attr('fill', RESIDUAL_COLOR);
  }, [points, polyFit, residualMaxAbs, xLabel, xRange, width, resHeight]);

  return (
    <div className="nonlinear-plots">
      <svg ref={mainRef} width={width} height={height} className="scatter-svg" />
      <svg
        ref={residRef}
        width={width}
        height={resHeight}
        className="scatter-svg residuals-svg"
      />
    </div>
  );
}
