import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function ScatterPlot({
  points,
  slope,
  intercept,
  onLineChange,
  bestSlope,
  bestIntercept,
  showResiduals,
  showBest,
  xLabel,
  yLabel,
  xRange,
  yRange,
  width = 620,
  height = 440,
}) {
  const svgRef = useRef(null);
  const stateRef = useRef({ slope, intercept });
  const elemsRef = useRef({});
  const onChangeRef = useRef(onLineChange);

  useEffect(() => {
    onChangeRef.current = onLineChange;
  }, [onLineChange]);

  // Structural setup: rebuilds when data, axes or canvas size change.
  useEffect(() => {
    const margin = { top: 18, right: 24, bottom: 56, left: 68 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear().domain(xRange).range([0, innerW]).nice();
    const yScale = d3.scaleLinear().domain(yRange).range([innerH, 0]).nice();

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

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

    // Layers
    const residualsG = root.append('g').attr('class', 'residuals');
    const pointsG = root.append('g').attr('class', 'points');
    const linesG = root.append('g').attr('class', 'lines');

    // Points
    pointsG
      .selectAll('circle')
      .data(points)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 4)
      .attr('fill', '#1f6feb')
      .attr('opacity', 0.78);

    // Best fit line (hidden until toggled)
    const bestLine = linesG
      .append('line')
      .attr('class', 'best-line')
      .attr('stroke', '#2ca02c')
      .attr('stroke-dasharray', '6 4')
      .attr('stroke-width', 2)
      .style('display', 'none');

    // User line + handles
    const userLine = linesG
      .append('line')
      .attr('class', 'user-line')
      .attr('stroke', '#e07b00')
      .attr('stroke-width', 3)
      .attr('cursor', 'grab');

    const handleL = linesG
      .append('circle')
      .attr('class', 'handle-l')
      .attr('r', 9)
      .attr('fill', '#e07b00')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'ns-resize');

    const handleR = linesG
      .append('circle')
      .attr('class', 'handle-r')
      .attr('r', 9)
      .attr('fill', '#e07b00')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'ns-resize');

    const x1 = xScale.domain()[0];
    const x2 = xScale.domain()[1];

    function pushChange(yL, yR) {
      const m = (yR - yL) / (x2 - x1);
      const b = yL - m * x1;
      stateRef.current = { slope: m, intercept: b };
      onChangeRef.current?.({ slope: m, intercept: b });
      updateLine();
      updateResiduals();
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
    }

    function updateResiduals() {
      const sel = residualsG.selectAll('line').data(residualsG.datum() ? points : []);
      const { slope: m, intercept: b } = stateRef.current;
      sel
        .attr('y1', (d) => yScale(d.y))
        .attr('y2', (d) => yScale(m * d.x + b));
    }

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

    // Drag the line itself (translate intercept)
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
          stateRef.current = { slope: m, intercept: newI };
          onChangeRef.current?.({ slope: m, intercept: newI });
          updateLine();
          updateResiduals();
        })
        .on('end', () => userLine.attr('cursor', 'grab'))
    );

    elemsRef.current = {
      xScale,
      yScale,
      x1,
      x2,
      residualsG,
      bestLine,
      updateLine,
      updateResiduals,
    };

    updateLine();
  }, [points, xLabel, yLabel, xRange, yRange, width, height]);

  // React to external slope/intercept changes (snap-to-best, reset, etc.)
  useEffect(() => {
    stateRef.current = { slope, intercept };
    elemsRef.current.updateLine?.();
    elemsRef.current.updateResiduals?.();
  }, [slope, intercept]);

  // Toggle residuals
  useEffect(() => {
    const e = elemsRef.current;
    if (!e.residualsG) return;
    e.residualsG.selectAll('line').remove();
    if (showResiduals) {
      const m = stateRef.current.slope;
      const b = stateRef.current.intercept;
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
        .attr('stroke', 'rgba(224,123,0,0.55)')
        .attr('stroke-width', 1.5);
    } else {
      e.residualsG.datum(false);
    }
  }, [showResiduals, points]);

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
