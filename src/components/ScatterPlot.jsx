import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const RESIDUAL_COLOR = '#dc2626';
const SQUARE_FILL = 'rgba(220, 38, 38, 0.18)';
const SQUARE_STROKE = 'rgba(220, 38, 38, 0.55)';
const USER_COLOR = '#e07b00';
const BEST_COLOR = '#2ca02c';
const POINT_COLOR = '#1f6feb';
const PREDICTION_COLOR = '#7c3aed';
const TRUE_COLOR = '#1f6feb';
const PREDICTED_COLOR = '#e07b00';

export default function ScatterPlot({
  points,
  slope,
  intercept,
  onLineChange,
  bestSlope,
  bestIntercept,
  showResiduals,
  showBest,
  showSquares,
  predictionMode,
  predictX,
  onPredictXChange,
  xLabel,
  yLabel,
  xShort,
  yShort,
  xUnit,
  yUnit,
  xRange,
  yRange,
  width = 620,
  height = 460,
}) {
  const svgRef = useRef(null);
  const stateRef = useRef({ slope, intercept, predictX });
  const elemsRef = useRef({});
  const onChangeRef = useRef(onLineChange);
  const onPredictXChangeRef = useRef(onPredictXChange);

  useEffect(() => {
    onChangeRef.current = onLineChange;
    onPredictXChangeRef.current = onPredictXChange;
  }, [onLineChange, onPredictXChange]);

  // Structural setup: rebuilds when data or axes change.
  useEffect(() => {
    const margin = { top: 18, right: 28, bottom: 56, left: 68 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear().domain(xRange).range([0, innerW]).nice();
    const yScale = d3.scaleLinear().domain(yRange).range([innerH, 0]).nice();

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Clip path so error squares don't leak past the plot edge
    svg
      .append('defs')
      .append('clipPath')
      .attr('id', 'plot-clip')
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerH);

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Subtle grid
    const grid = root.append('g').attr('class', 'grid');
    grid
      .selectAll('line.gx')
      .data(xScale.ticks(7))
      .enter()
      .append('line')
      .attr('class', 'gx')
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
      .attr('class', 'gy')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', 'rgba(0,0,0,0.06)');

    // Axes
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

    // Layered groups (z-order matters)
    const squaresG = root.append('g').attr('class', 'squares').attr('clip-path', 'url(#plot-clip)');
    const residualsG = root.append('g').attr('class', 'residuals');
    const linesG = root.append('g').attr('class', 'lines');
    const predictionG = root.append('g').attr('class', 'prediction').style('display', 'none');
    const pointsG = root.append('g').attr('class', 'points');
    const handlesG = root.append('g').attr('class', 'handles');
    const hoverG = root.append('g').attr('class', 'hover-overlay').style('pointer-events', 'none');

    // Best fit line (hidden until toggled)
    const bestLine = linesG
      .append('line')
      .attr('class', 'best-line')
      .attr('stroke', BEST_COLOR)
      .attr('stroke-dasharray', '6 4')
      .attr('stroke-width', 2)
      .style('display', 'none');

    // User line
    const userLine = linesG
      .append('line')
      .attr('class', 'user-line')
      .attr('stroke', USER_COLOR)
      .attr('stroke-width', 3)
      .attr('cursor', 'grab');

    // Drag handles for tilting the user line
    const handleL = handlesG
      .append('circle')
      .attr('class', 'handle-l')
      .attr('r', 9)
      .attr('fill', USER_COLOR)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'ns-resize');
    const handleR = handlesG
      .append('circle')
      .attr('class', 'handle-r')
      .attr('r', 9)
      .attr('fill', USER_COLOR)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'ns-resize');

    // Prediction overlay elements
    const predGuideV = predictionG
      .append('line')
      .attr('class', 'pred-guide-v')
      .attr('stroke', PREDICTION_COLOR)
      .attr('stroke-dasharray', '4 4')
      .attr('stroke-width', 1.5);
    const predGuideH = predictionG
      .append('line')
      .attr('class', 'pred-guide-h')
      .attr('stroke', PREDICTION_COLOR)
      .attr('stroke-dasharray', '4 4')
      .attr('stroke-width', 1.5);
    const predTickX = predictionG
      .append('line')
      .attr('class', 'pred-tick-x')
      .attr('stroke', PREDICTION_COLOR)
      .attr('stroke-width', 2);
    const predTickY = predictionG
      .append('line')
      .attr('class', 'pred-tick-y')
      .attr('stroke', PREDICTION_COLOR)
      .attr('stroke-width', 2);
    const predLabelX = predictionG
      .append('text')
      .attr('class', 'pred-label')
      .attr('text-anchor', 'middle')
      .attr('fill', PREDICTION_COLOR);
    const predLabelY = predictionG
      .append('text')
      .attr('class', 'pred-label')
      .attr('text-anchor', 'end')
      .attr('fill', PREDICTION_COLOR);
    const predMarker = predictionG
      .append('circle')
      .attr('class', 'pred-marker')
      .attr('r', 7)
      .attr('fill', PREDICTION_COLOR)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('cursor', 'ew-resize');

    // Points + hover handlers
    const pointSel = pointsG
      .selectAll('circle')
      .data(points)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 4.5)
      .attr('fill', POINT_COLOR)
      .attr('opacity', 0.78)
      .attr('cursor', 'crosshair');

    pointSel
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('r', 7).attr('opacity', 1);
        showHover(d);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('r', 4.5).attr('opacity', 0.78);
        hoverG.selectAll('*').remove();
      });

    function showHover(d) {
      const { slope: m, intercept: b } = stateRef.current;
      const yPred = m * d.x + b;
      const px = xScale(d.x);
      const pyTrue = yScale(d.y);
      const pyPred = yScale(yPred);

      hoverG.selectAll('*').remove();

      // Connector segment from true to predicted
      hoverG
        .append('line')
        .attr('x1', px)
        .attr('x2', px)
        .attr('y1', pyTrue)
        .attr('y2', pyPred)
        .attr('stroke', RESIDUAL_COLOR)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3 2');

      // Marker on the line
      hoverG
        .append('circle')
        .attr('cx', px)
        .attr('cy', pyPred)
        .attr('r', 6)
        .attr('fill', PREDICTED_COLOR)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      // Label boxes
      const trueAbove = pyTrue < pyPred;
      const labelOffset = 14;
      const trueY = trueAbove ? pyTrue - labelOffset : pyTrue + labelOffset + 4;
      const predY = trueAbove ? pyPred + labelOffset + 4 : pyPred - labelOffset;
      const xShift = px > innerW - 90 ? -10 : 10;
      const anchor = px > innerW - 90 ? 'end' : 'start';

      hoverG
        .append('text')
        .attr('class', 'hover-label hover-true')
        .attr('x', px + xShift)
        .attr('y', trueY)
        .attr('text-anchor', anchor)
        .attr('fill', TRUE_COLOR)
        .text(`actual ${yShort} = ${d.y.toFixed(2)} ${yUnit}`);

      hoverG
        .append('text')
        .attr('class', 'hover-label hover-pred')
        .attr('x', px + xShift)
        .attr('y', predY)
        .attr('text-anchor', anchor)
        .attr('fill', PREDICTED_COLOR)
        .text(`predicted ${yShort} = ${yPred.toFixed(2)} ${yUnit}`);

      const err = d.y - yPred;
      hoverG
        .append('text')
        .attr('class', 'hover-label hover-err')
        .attr('x', px + xShift)
        .attr('y', (pyTrue + pyPred) / 2)
        .attr('text-anchor', anchor)
        .attr('fill', RESIDUAL_COLOR)
        .text(`error = ${err >= 0 ? '+' : ''}${err.toFixed(2)}`);
    }

    const x1 = xScale.domain()[0];
    const x2 = xScale.domain()[1];

    function pushChange(yL, yR) {
      const m = (yR - yL) / (x2 - x1);
      const b = yL - m * x1;
      stateRef.current = { ...stateRef.current, slope: m, intercept: b };
      onChangeRef.current?.({ slope: m, intercept: b });
      updateLine();
    }

    function updateLine() {
      const { slope: m, intercept: b } = stateRef.current;
      const yL = m * x1 + b;
      const yR = m * x2 + b;
      userLine
        .attr('x1', xScale(x1))
        .attr('x2', xScale(x2))
        .attr('y1', yScale(yL))
        .attr('y2', yScale(yR));
      handleL.attr('cx', xScale(x1)).attr('cy', yScale(yL));
      handleR.attr('cx', xScale(x2)).attr('cy', yScale(yR));

      updateResiduals();
      updateSquares();
      updatePrediction();
    }

    function updateResiduals() {
      if (residualsG.datum() !== true) return;
      const { slope: m, intercept: b } = stateRef.current;
      residualsG
        .selectAll('line')
        .attr('y1', (d) => yScale(d.y))
        .attr('y2', (d) => yScale(m * d.x + b));
    }

    function updateSquares() {
      if (squaresG.datum() !== true) return;
      const { slope: m, intercept: b } = stateRef.current;
      squaresG
        .selectAll('rect')
        .each(function (d) {
          const px = xScale(d.x);
          const pyTrue = yScale(d.y);
          const pyPred = yScale(m * d.x + b);
          const sidePx = Math.abs(pyTrue - pyPred);
          const top = Math.min(pyTrue, pyPred);
          d3.select(this)
            .attr('x', px)
            .attr('y', top)
            .attr('width', sidePx)
            .attr('height', sidePx);
        });
    }

    function updatePrediction() {
      if (!predictionG.datum()) return;
      const { slope: m, intercept: b, predictX: xv } = stateRef.current;
      const xClamped = Math.max(x1, Math.min(x2, xv));
      const yPred = m * xClamped + b;
      const px = xScale(xClamped);
      const py = yScale(yPred);

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
        .text(yPred.toFixed(1));
    }

    // Drag handlers
    handleL.call(
      d3
        .drag()
        .on('start', () => userLine.attr('cursor', 'grabbing'))
        .on('drag', (event) => {
          const yLData = yScale.invert(Math.max(0, Math.min(innerH, event.y)));
          const { slope: m, intercept: b } = stateRef.current;
          const yR = m * x2 + b;
          pushChange(yLData, yR);
        })
        .on('end', () => userLine.attr('cursor', 'grab'))
    );
    handleR.call(
      d3
        .drag()
        .on('start', () => userLine.attr('cursor', 'grabbing'))
        .on('drag', (event) => {
          const yRData = yScale.invert(Math.max(0, Math.min(innerH, event.y)));
          const { slope: m, intercept: b } = stateRef.current;
          const yL = m * x1 + b;
          pushChange(yL, yRData);
        })
        .on('end', () => userLine.attr('cursor', 'grab'))
    );

    let startInt = 0;
    let startY = 0;
    userLine.call(
      d3
        .drag()
        .on('start', (event) => {
          startInt = stateRef.current.intercept;
          startY = event.y;
          userLine.attr('cursor', 'grabbing');
        })
        .on('drag', (event) => {
          const range = yScale.domain()[1] - yScale.domain()[0];
          const dyData = (-(event.y - startY) * range) / innerH;
          const newI = startInt + dyData;
          const m = stateRef.current.slope;
          stateRef.current = { ...stateRef.current, slope: m, intercept: newI };
          onChangeRef.current?.({ slope: m, intercept: newI });
          updateLine();
        })
        .on('end', () => userLine.attr('cursor', 'grab'))
    );

    // Drag the prediction marker horizontally
    predMarker.call(
      d3
        .drag()
        .on('drag', (event) => {
          const newX = Math.max(x1, Math.min(x2, xScale.invert(event.x)));
          stateRef.current = { ...stateRef.current, predictX: newX };
          onPredictXChangeRef.current?.(newX);
          updatePrediction();
        })
    );

    elemsRef.current = {
      xScale,
      yScale,
      x1,
      x2,
      innerW,
      innerH,
      residualsG,
      squaresG,
      bestLine,
      predictionG,
      updateLine,
    };

    updateLine();
  }, [points, xLabel, yLabel, xRange, yRange, xShort, yShort, xUnit, yUnit, width, height]);

  // External slope/intercept changes
  useEffect(() => {
    stateRef.current = { ...stateRef.current, slope, intercept };
    elemsRef.current.updateLine?.();
  }, [slope, intercept]);

  // External predictX changes
  useEffect(() => {
    stateRef.current = { ...stateRef.current, predictX };
    elemsRef.current.updateLine?.();
  }, [predictX]);

  // Toggle residuals
  useEffect(() => {
    const e = elemsRef.current;
    if (!e.residualsG) return;
    e.residualsG.selectAll('line').remove();
    if (showResiduals) {
      const { slope: m, intercept: b } = stateRef.current;
      e.residualsG
        .datum(true)
        .selectAll('line')
        .data(points)
        .enter()
        .append('line')
        .attr('x1', (d) => e.xScale(d.x))
        .attr('x2', (d) => e.xScale(d.x))
        .attr('y1', (d) => e.yScale(d.y))
        .attr('y2', (d) => e.yScale(m * d.x + b))
        .attr('stroke', RESIDUAL_COLOR)
        .attr('stroke-width', 2)
        .attr('opacity', 0.85);
    } else {
      e.residualsG.datum(false);
    }
  }, [showResiduals, points]);

  // Toggle error squares
  useEffect(() => {
    const e = elemsRef.current;
    if (!e.squaresG) return;
    e.squaresG.selectAll('rect').remove();
    if (showSquares) {
      e.squaresG
        .datum(true)
        .selectAll('rect')
        .data(points)
        .enter()
        .append('rect')
        .attr('fill', SQUARE_FILL)
        .attr('stroke', SQUARE_STROKE)
        .attr('stroke-width', 1);
      // positions get set by updateLine
      elemsRef.current.updateLine?.();
    } else {
      e.squaresG.datum(false);
    }
  }, [showSquares, points]);

  // Toggle prediction mode
  useEffect(() => {
    const e = elemsRef.current;
    if (!e.predictionG) return;
    if (predictionMode) {
      e.predictionG.datum(true).style('display', null);
      elemsRef.current.updateLine?.();
    } else {
      e.predictionG.datum(false).style('display', 'none');
    }
  }, [predictionMode]);

  // Toggle best-fit line
  useEffect(() => {
    const e = elemsRef.current;
    if (!e.bestLine) return;
    if (showBest && Number.isFinite(bestSlope)) {
      e.bestLine
        .attr('x1', e.xScale(e.x1))
        .attr('x2', e.xScale(e.x2))
        .attr('y1', e.yScale(bestSlope * e.x1 + bestIntercept))
        .attr('y2', e.yScale(bestSlope * e.x2 + bestIntercept))
        .style('display', null);
    } else {
      e.bestLine.style('display', 'none');
    }
  }, [showBest, bestSlope, bestIntercept]);

  return <svg ref={svgRef} width={width} height={height} className="scatter-svg" />;
}
