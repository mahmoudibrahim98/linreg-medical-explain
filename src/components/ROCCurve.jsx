import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function ROCCurve({
  roc,
  threshold,
  onThresholdChange,
  width = 360,
  height = 360,
}) {
  const svgRef = useRef(null);
  const elemsRef = useRef({});
  const onChangeRef = useRef(onThresholdChange);

  useEffect(() => {
    onChangeRef.current = onThresholdChange;
  }, [onThresholdChange]);

  useEffect(() => {
    const margin = { top: 18, right: 18, bottom: 50, left: 56 };
    const W = width - margin.left - margin.right;
    const H = height - margin.top - margin.bottom;
    const xScale = d3.scaleLinear().domain([0, 1]).range([0, W]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([H, 0]);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // AUC shading
    const area = d3
      .area()
      .x((d) => xScale(d.fpr))
      .y0(yScale(0))
      .y1((d) => yScale(d.tpr))
      .curve(d3.curveStepAfter);
    root
      .append('path')
      .datum(roc.curve)
      .attr('fill', 'rgba(31, 111, 235, 0.10)')
      .attr('d', area);

    // Diagonal reference (random classifier)
    root
      .append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(1))
      .attr('y1', yScale(0))
      .attr('y2', yScale(1))
      .attr('stroke', 'rgba(0,0,0,0.3)')
      .attr('stroke-dasharray', '4 4');

    // ROC line
    const line = d3
      .line()
      .x((d) => xScale(d.fpr))
      .y((d) => yScale(d.tpr))
      .curve(d3.curveStepAfter);
    root
      .append('path')
      .datum(roc.curve)
      .attr('fill', 'none')
      .attr('stroke', '#1f6feb')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Axes
    root
      .append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('.2f')));
    root
      .append('g')
      .attr('class', 'axis')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.2f')));

    root
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', W / 2)
      .attr('y', H + 38)
      .attr('text-anchor', 'middle')
      .text('False positive rate (1 − specificity)');
    root
      .append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -H / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .text('True positive rate (sensitivity)');

    // AUC annotation
    root
      .append('text')
      .attr('x', W - 10)
      .attr('y', H - 10)
      .attr('text-anchor', 'end')
      .attr('class', 'auc-label')
      .attr('fill', '#1f6feb')
      .text(`AUC = ${roc.auc.toFixed(3)}`);

    // Threshold marker (positioned in update effect)
    const marker = root
      .append('circle')
      .attr('r', 7)
      .attr('fill', '#0d9488')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
    const markerLabel = root
      .append('text')
      .attr('class', 'threshold-marker-label')
      .attr('text-anchor', 'start')
      .attr('fill', '#0d9488');

    // Click on plot to set threshold to nearest curve point's threshold
    root
      .append('rect')
      .attr('width', W)
      .attr('height', H)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('click', (event) => {
        const [mx, my] = d3.pointer(event);
        const fprC = xScale.invert(mx);
        const tprC = yScale.invert(my);
        // Find nearest curve point
        let bestIdx = 0;
        let bestD = Infinity;
        roc.curve.forEach((p, i) => {
          const d2 = (p.fpr - fprC) ** 2 + (p.tpr - tprC) ** 2;
          if (d2 < bestD) {
            bestD = d2;
            bestIdx = i;
          }
        });
        const t = roc.curve[bestIdx].threshold;
        const clamped = Math.max(0.001, Math.min(0.999, t));
        onChangeRef.current?.(clamped);
      });

    elemsRef.current = { xScale, yScale, marker, markerLabel };
  }, [roc, width, height]);

  // Move marker on threshold change
  useEffect(() => {
    const { xScale, yScale, marker, markerLabel } = elemsRef.current;
    if (!marker) return;
    // Find the curve point with threshold closest to current threshold (curve
    // is sorted descending by threshold).
    let best = roc.curve[0];
    let bestD = Infinity;
    for (const p of roc.curve) {
      const d = Math.abs(p.threshold - threshold);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    marker.attr('cx', xScale(best.fpr)).attr('cy', yScale(best.tpr));
    markerLabel
      .attr('x', xScale(best.fpr) + 10)
      .attr('y', yScale(best.tpr) - 8)
      .text(`t = ${threshold.toFixed(2)}`);
  }, [threshold, roc]);

  return <svg ref={svgRef} width={width} height={height} className="scatter-svg roc-svg" />;
}
