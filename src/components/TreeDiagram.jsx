import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const POSITIVE_COLOR = '#dc2626';
const NEGATIVE_COLOR = '#1f6feb';
const SPLIT_FILL = '#ffffff';
const SPLIT_STROKE = '#9ca3af';

function fmt(n, digits = 1) {
  if (!Number.isFinite(n)) return '?';
  return n.toFixed(digits);
}

function nodeText(node, featureLabels, positiveLabel, negativeLabel) {
  if (node.type === 'leaf') {
    const label = node.prediction === 1 ? positiveLabel : negativeLabel;
    return [
      `predict: ${label}`,
      `n = ${node.n} (${node.pos}/${node.n} positive)`,
    ];
  }
  const feat = node.feature === 'x1' ? featureLabels.x1 : featureLabels.x2;
  return [
    `${feat} ≤ ${fmt(node.threshold, 1)}?`,
    `n = ${node.n}, gini = ${node.gini.toFixed(2)}`,
  ];
}

export default function TreeDiagram({
  tree,
  featureLabels,
  positiveLabel,
  negativeLabel,
  width = 540,
  height = 380,
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    const margin = { top: 24, right: 16, bottom: 16, left: 16 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    if (!tree) return;

    // Build hierarchy via d3.hierarchy treating the binary tree as nested.
    const hier = d3.hierarchy(tree, (n) =>
      n && n.type === 'split' ? [n.left, n.right] : null
    );
    const layout = d3.tree().size([innerW, innerH]);
    layout(hier);

    // Edges
    root
      .append('g')
      .attr('class', 'tree-edges')
      .selectAll('path')
      .data(hier.links())
      .enter()
      .append('path')
      .attr('d', (d) =>
        d3
          .linkVertical()
          .x((p) => p.x)
          .y((p) => p.y)(d)
      )
      .attr('fill', 'none')
      .attr('stroke', SPLIT_STROKE)
      .attr('stroke-width', 1.4);

    // Edge labels: "yes" on the left edge (data goes left when condition true),
    // "no" on the right.
    root
      .append('g')
      .selectAll('text')
      .data(hier.links())
      .enter()
      .append('text')
      .attr('class', 'tree-edge-label')
      .attr('x', (d) => (d.source.x + d.target.x) / 2)
      .attr('y', (d) => (d.source.y + d.target.y) / 2 - 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b7280')
      .text((d) => {
        const sourceData = d.source.data;
        if (sourceData.type !== 'split') return '';
        return d.target.data === sourceData.left ? 'yes' : 'no';
      });

    // Nodes
    const nodeG = root
      .append('g')
      .attr('class', 'tree-nodes')
      .selectAll('g')
      .data(hier.descendants())
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    nodeG.each(function (d) {
      const g = d3.select(this);
      const node = d.data;
      const lines = nodeText(
        node,
        featureLabels,
        positiveLabel,
        negativeLabel
      );
      const padX = 8;
      const padY = 6;
      const lineH = 13;
      const w = Math.max(120, ...lines.map((l) => l.length * 6.6));
      const h = lines.length * lineH + padY * 2;

      const isLeaf = node.type === 'leaf';
      const fill = isLeaf
        ? node.prediction === 1
          ? 'rgba(220, 38, 38, 0.18)'
          : 'rgba(31, 111, 235, 0.18)'
        : SPLIT_FILL;
      const stroke = isLeaf
        ? node.prediction === 1
          ? POSITIVE_COLOR
          : NEGATIVE_COLOR
        : SPLIT_STROKE;

      g.append('rect')
        .attr('x', -w / 2)
        .attr('y', -h / 2)
        .attr('width', w)
        .attr('height', h)
        .attr('rx', 6)
        .attr('fill', fill)
        .attr('stroke', stroke)
        .attr('stroke-width', isLeaf ? 1.5 : 1);

      lines.forEach((line, i) => {
        g.append('text')
          .attr('class', `tree-node-text${i === 0 ? ' tree-node-title' : ''}`)
          .attr('text-anchor', 'middle')
          .attr('x', 0)
          .attr('y', -h / 2 + padY + (i + 1) * lineH - 4)
          .text(line);
      });
    });
  }, [tree, featureLabels, positiveLabel, negativeLabel, width, height]);

  return <svg ref={svgRef} width={width} height={height} className="scatter-svg tree-svg" />;
}
