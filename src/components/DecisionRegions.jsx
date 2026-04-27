import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { leafRectangles } from '../stats/decisionTree';

const POSITIVE_COLOR = '#dc2626';
const NEGATIVE_COLOR = '#1f6feb';

function regionFill(prediction, probability) {
  // Stronger color when the leaf is more confident.
  const conf = Math.min(1, Math.abs(probability - 0.5) * 2);
  const alpha = 0.10 + 0.30 * conf;
  return prediction === 1
    ? `rgba(220, 38, 38, ${alpha})`
    : `rgba(31, 111, 235, ${alpha})`;
}

export default function DecisionRegions({
  points,
  tree,
  x1Range,
  x2Range,
  x1Label,
  x2Label,
  positiveLabel,
  negativeLabel,
  width = 480,
  height = 420,
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    const margin = { top: 18, right: 28, bottom: 50, left: 60 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear().domain(x1Range).range([0, innerW]).nice();
    const yScale = d3.scaleLinear().domain(x2Range).range([innerH, 0]).nice();

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Decision regions
    if (tree) {
      const rects = leafRectangles(tree, x1Range, x2Range);
      root
        .append('g')
        .attr('class', 'regions')
        .selectAll('rect')
        .data(rects)
        .enter()
        .append('rect')
        .attr('x', (d) => xScale(d.x1Min))
        .attr('y', (d) => yScale(d.x2Max))
        .attr('width', (d) => Math.max(0, xScale(d.x1Max) - xScale(d.x1Min)))
        .attr('height', (d) => Math.max(0, yScale(d.x2Min) - yScale(d.x2Max)))
        .attr('fill', (d) => regionFill(d.prediction, d.probability))
        .attr('stroke', 'rgba(0,0,0,0.25)')
        .attr('stroke-width', 1);
    }

    // Axes
    root
      .append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6));
    root.append('g').attr('class', 'axis').call(d3.axisLeft(yScale).ticks(6));

    root
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', innerW / 2)
      .attr('y', innerH + 38)
      .attr('text-anchor', 'middle')
      .text(x1Label);
    root
      .append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -46)
      .attr('text-anchor', 'middle')
      .text(x2Label);

    // Points (drawn last so they sit on top of the regions)
    root
      .append('g')
      .attr('class', 'tree-points')
      .selectAll('circle')
      .data(points)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.x1))
      .attr('cy', (d) => yScale(d.x2))
      .attr('r', 4.5)
      .attr('fill', (d) => (d.y === 1 ? POSITIVE_COLOR : NEGATIVE_COLOR))
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.92);

    // Class legend
    const legend = root
      .append('g')
      .attr('transform', `translate(${innerW - 8},${8})`);
    const items = [
      { color: POSITIVE_COLOR, label: positiveLabel },
      { color: NEGATIVE_COLOR, label: negativeLabel },
    ];
    items.forEach((it, i) => {
      const g = legend.append('g').attr('transform', `translate(0, ${i * 18})`);
      g.append('circle')
        .attr('r', 5)
        .attr('cx', -8)
        .attr('cy', 0)
        .attr('fill', it.color);
      g.append('text')
        .attr('x', -16)
        .attr('y', 4)
        .attr('text-anchor', 'end')
        .attr('class', 'legend-text')
        .text(it.label);
    });
  }, [points, tree, x1Range, x2Range, x1Label, x2Label, positiveLabel, negativeLabel, width, height]);

  return <svg ref={svgRef} width={width} height={height} className="scatter-svg" />;
}
