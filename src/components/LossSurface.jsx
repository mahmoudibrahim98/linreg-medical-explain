import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const GRID = 64;

export default function LossSurface({
  points,
  slope,
  intercept,
  bestSlope,
  bestIntercept,
  slopeRange,
  interceptRange,
  width = 380,
  height = 320,
}) {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const stateRef = useRef({});

  // Build grid + axes when data or ranges change.
  useEffect(() => {
    const margin = { top: 14, right: 14, bottom: 44, left: 56 };
    const W = width - margin.left - margin.right;
    const H = height - margin.top - margin.bottom;

    const sScale = d3.scaleLinear().domain(slopeRange).range([0, W]);
    const iScale = d3.scaleLinear().domain(interceptRange).range([H, 0]);

    // Loss grid
    const losses = new Float64Array(GRID * GRID);
    let minL = Infinity;
    let maxL = -Infinity;
    for (let j = 0; j < GRID; j++) {
      const b =
        interceptRange[0] +
        ((interceptRange[1] - interceptRange[0]) * j) / (GRID - 1);
      for (let i = 0; i < GRID; i++) {
        const m =
          slopeRange[0] + ((slopeRange[1] - slopeRange[0]) * i) / (GRID - 1);
        let s = 0;
        for (let k = 0; k < points.length; k++) {
          const p = points[k];
          const r = p.y - (m * p.x + b);
          s += r * r;
        }
        s /= points.length;
        losses[j * GRID + i] = s;
        if (s < minL) minL = s;
        if (s > maxL) maxL = s;
      }
    }

    const colorScale = d3
      .scaleSequentialLog(d3.interpolateViridis)
      .domain([Math.max(minL, 1e-6), maxL]);

    // Canvas heatmap
    const canvas = canvasRef.current;
    canvas.width = W;
    canvas.height = H;
    canvas.style.left = margin.left + 'px';
    canvas.style.top = margin.top + 'px';
    const ctx = canvas.getContext('2d');
    const cw = W / GRID;
    const ch = H / GRID;
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        ctx.fillStyle = colorScale(losses[j * GRID + i]);
        ctx.fillRect(i * cw, H - (j + 1) * ch, cw + 1, ch + 1);
      }
    }

    // SVG: axes + markers
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    root
      .append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(sScale).ticks(5));
    root.append('g').attr('class', 'axis').call(d3.axisLeft(iScale).ticks(5));

    root
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', W / 2)
      .attr('y', H + 34)
      .attr('text-anchor', 'middle')
      .text('Slope (m)');
    root
      .append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -H / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .text('Intercept (b)');

    const markers = root.append('g').attr('class', 'markers');
    stateRef.current = { sScale, iScale, markers };
  }, [points, slopeRange, interceptRange, width, height]);

  // Markers update only on slope/intercept changes (cheap).
  useEffect(() => {
    const { sScale, iScale, markers } = stateRef.current;
    if (!markers) return;
    markers.selectAll('*').remove();

    if (Number.isFinite(bestSlope)) {
      markers
        .append('circle')
        .attr('cx', sScale(bestSlope))
        .attr('cy', iScale(bestIntercept))
        .attr('r', 7)
        .attr('fill', 'none')
        .attr('stroke', '#2ca02c')
        .attr('stroke-width', 2);
      markers
        .append('text')
        .attr('x', sScale(bestSlope) + 10)
        .attr('y', iScale(bestIntercept) - 8)
        .attr('class', 'marker-label')
        .text('best');
    }

    markers
      .append('circle')
      .attr('cx', sScale(slope))
      .attr('cy', iScale(intercept))
      .attr('r', 6)
      .attr('fill', '#e07b00')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);
  }, [slope, intercept, bestSlope, bestIntercept]);

  return (
    <div className="loss-surface" style={{ position: 'relative', width, height }}>
      <canvas ref={canvasRef} style={{ position: 'absolute' }} />
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ position: 'absolute', left: 0, top: 0 }}
      />
    </div>
  );
}
