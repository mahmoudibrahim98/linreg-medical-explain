import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const POSITIVE_COLOR = '#dc2626';
const NEGATIVE_COLOR = '#1f6feb';
const SPLIT_FILL = '#ffffff';
const SPLIT_STROKE = '#9ca3af';
const HIGHLIGHT_STROKE = '#ea580c';

function fmt(n, digits = 1) {
  if (!Number.isFinite(n)) return '?';
  return n.toFixed(digits);
}

export default function TreeDiagram({
  tree,
  highlightNodeId,
  featureLabels,
  positiveLabel,
  negativeLabel,
  width = 600,
  height = 360,
  // Per-node spacing. The first value is between-siblings (becomes vertical
  // spacing in horizontal layout), the second between-depth-levels (becomes
  // horizontal). Generous spacing prevents overlap.
  nodeSize = [70, 180],
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    if (!tree) return;

    const hier = d3.hierarchy(tree, (n) =>
      n && n.type === 'split' ? [n.left, n.right] : null
    );
    d3.tree().nodeSize(nodeSize)(hier);

    // Compute the bounding box of node positions.
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    hier.descendants().forEach((d) => {
      if (d.x < xMin) xMin = d.x;
      if (d.x > xMax) xMax = d.x;
      if (d.y < yMin) yMin = d.y;
      if (d.y > yMax) yMax = d.y;
    });

    // Padding leaves room for the node rectangles around their centers and
    // the edge labels.
    const padLeft = 90;
    const padRight = 110;
    const padTop = 30;
    const padBot = 30;

    // Render horizontally: tree's `y` (depth) → screen x; tree's `x`
    // (sibling axis) → screen y.
    const vbX = yMin - padLeft;
    const vbY = xMin - padTop;
    const vbW = (yMax - yMin || 1) + padLeft + padRight;
    const vbH = (xMax - xMin || 1) + padTop + padBot;

    svg
      .attr('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const root = svg.append('g');

    // Edges
    root
      .append('g')
      .attr('class', 'tree-edges')
      .selectAll('path')
      .data(hier.links())
      .enter()
      .append('path')
      .attr(
        'd',
        d3
          .linkHorizontal()
          .x((p) => p.y)
          .y((p) => p.x)
      )
      .attr('fill', 'none')
      .attr('stroke', SPLIT_STROKE)
      .attr('stroke-width', 1.4);

    // Edge labels: yes/no for the split branches.
    root
      .append('g')
      .selectAll('text')
      .data(hier.links())
      .enter()
      .append('text')
      .attr('class', 'tree-edge-label')
      .attr('x', (d) => (d.source.y + d.target.y) / 2 + 6)
      .attr('y', (d) => (d.source.x + d.target.x) / 2 - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b7280')
      .text((d) => {
        const sourceData = d.source.data;
        if (!sourceData || sourceData.type !== 'split') return '';
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
      .attr('transform', (d) => `translate(${d.y},${d.x})`);

    nodeG.each(function (d) {
      const g = d3.select(this);
      const node = d.data;
      const isLeaf = node.type === 'leaf';
      const isHighlighted =
        highlightNodeId &&
        node.__id === highlightNodeId; // see below for id assignment

      let lines;
      if (isLeaf) {
        const label = node.prediction === 1 ? positiveLabel : negativeLabel;
        lines = [`→ ${label}`, `n = ${node.n}  (${node.pos}/${node.n})`];
      } else {
        const feat =
          node.feature === 'x1' ? featureLabels.x1 : featureLabels.x2;
        lines = [
          `${feat} ≤ ${fmt(node.threshold, 1)}`,
          `n = ${node.n}, gini = ${node.gini.toFixed(2)}`,
        ];
      }

      const padX = 10;
      const padY = 6;
      const lineH = 14;
      const w = Math.max(140, ...lines.map((l) => l.length * 6.6 + padX * 2));
      const h = lines.length * lineH + padY * 2;

      const fill = isLeaf
        ? node.prediction === 1
          ? 'rgba(220, 38, 38, 0.18)'
          : 'rgba(31, 111, 235, 0.18)'
        : SPLIT_FILL;
      const stroke = isHighlighted
        ? HIGHLIGHT_STROKE
        : isLeaf
          ? node.prediction === 1
            ? POSITIVE_COLOR
            : NEGATIVE_COLOR
          : SPLIT_STROKE;
      const strokeWidth = isHighlighted ? 2.5 : isLeaf ? 1.5 : 1;

      g.append('rect')
        .attr('x', -w / 2)
        .attr('y', -h / 2)
        .attr('width', w)
        .attr('height', h)
        .attr('rx', 6)
        .attr('fill', fill)
        .attr('stroke', stroke)
        .attr('stroke-width', strokeWidth);

      lines.forEach((line, i) => {
        g.append('text')
          .attr('class', `tree-node-text${i === 0 ? ' tree-node-title' : ''}`)
          .attr('text-anchor', 'middle')
          .attr('x', 0)
          .attr('y', -h / 2 + padY + (i + 1) * lineH - 4)
          .text(line);
      });
    });
  }, [tree, highlightNodeId, featureLabels, positiveLabel, negativeLabel, nodeSize]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="scatter-svg tree-svg"
    />
  );
}
