import { useMemo } from 'react';
import { sigmoid } from '../stats/regression';
import { InlineMath } from './Math';

const POSITIVE_COLOR = '#dc2626';
const NEGATIVE_COLOR = '#1f6feb';

function fmt(n, digits = 3) {
  if (!Number.isFinite(n)) return '?';
  return n.toFixed(digits);
}

function LossAnatomyDiagram({ rows, positiveLabel, negativeLabel }) {
  const W = 420;
  const H = 230;
  const margin = { top: 18, right: 18, bottom: 36, left: 44 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const yMax = 4;
  const xS = (p) => p * innerW;
  const yS = (loss) => innerH - (Math.min(loss, yMax) / yMax) * innerH;

  // -log(p) and -log(1-p) sampled across p in (0, 1)
  const N = 120;
  const pathPositive = [];
  const pathNegative = [];
  for (let i = 1; i < N; i++) {
    const p = i / N;
    const lossPos = -Math.log(p);
    const lossNeg = -Math.log(1 - p);
    if (lossPos <= yMax + 0.01) pathPositive.push([xS(p), yS(lossPos)]);
    if (lossNeg <= yMax + 0.01) pathNegative.push([xS(p), yS(lossNeg)]);
  }
  const dPositive =
    pathPositive.length > 0
      ? `M ${pathPositive.map(([x, y]) => `${x} ${y}`).join(' L ')}`
      : '';
  const dNegative =
    pathNegative.length > 0
      ? `M ${pathNegative.map(([x, y]) => `${x} ${y}`).join(' L ')}`
      : '';

  // Y-axis tick lines
  const ticks = [0, 1, 2, 3, 4];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      preserveAspectRatio="xMidYMid meet"
      className="anatomy-svg loss-anatomy-svg"
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* gridlines */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={0}
              x2={innerW}
              y1={yS(t)}
              y2={yS(t)}
              stroke="rgba(0,0,0,0.06)"
            />
            <text
              x={-6}
              y={yS(t) + 3}
              textAnchor="end"
              className="anatomy-axis-label"
              fontSize={10}
            >
              {t}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <g key={p}>
            <text
              x={xS(p)}
              y={innerH + 14}
              textAnchor="middle"
              className="anatomy-axis-label"
              fontSize={10}
            >
              {p.toFixed(2)}
            </text>
          </g>
        ))}

        {/* axes */}
        <line
          x1={0}
          x2={innerW}
          y1={innerH}
          y2={innerH}
          stroke="rgba(0,0,0,0.4)"
        />
        <line x1={0} x2={0} y1={0} y2={innerH} stroke="rgba(0,0,0,0.4)" />

        {/* axis titles */}
        <text
          x={innerW / 2}
          y={innerH + 28}
          textAnchor="middle"
          className="anatomy-axis-label"
        >
          predicted P
        </text>
        <text
          transform={`translate(-32, ${innerH / 2}) rotate(-90)`}
          textAnchor="middle"
          className="anatomy-axis-label"
        >
          per-patient loss
        </text>

        {/* loss curves */}
        <path
          d={dPositive}
          fill="none"
          stroke={POSITIVE_COLOR}
          strokeWidth={1.6}
          strokeDasharray="5 3"
        />
        <path
          d={dNegative}
          fill="none"
          stroke={NEGATIVE_COLOR}
          strokeWidth={1.6}
          strokeDasharray="5 3"
        />

        {/* curve labels */}
        <text
          x={xS(0.03)}
          y={yS(3.4)}
          className="anatomy-line-label"
          fill={POSITIVE_COLOR}
          fontWeight={600}
        >
          −log(P) for y = 1
        </text>
        <text
          x={xS(0.97)}
          y={yS(3.4)}
          textAnchor="end"
          className="anatomy-line-label"
          fill={NEGATIVE_COLOR}
          fontWeight={600}
        >
          −log(1 − P) for y = 0
        </text>

        {/* per-patient markers */}
        {rows.map((r, i) => {
          const color = r.isPositive ? POSITIVE_COLOR : NEGATIVE_COLOR;
          const cx = xS(r.prob);
          const cy = yS(r.loss);
          return (
            <g key={i}>
              <line
                x1={cx}
                x2={cx}
                y1={innerH}
                y2={cy}
                stroke={color}
                strokeWidth={1}
                strokeDasharray="2 2"
                opacity={0.6}
              />
              <circle
                cx={cx}
                cy={cy}
                r={6}
                fill={color}
                stroke="#fff"
                strokeWidth={1.5}
              />
              <text
                x={cx}
                y={cy - 10}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill={color}
                paintOrder="stroke"
                stroke="white"
                strokeWidth={3}
                strokeLinejoin="round"
              >
                P{i + 1}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export default function LogisticLossWorkedExample({
  points,
  beta0,
  beta1,
  positiveLabel,
  negativeLabel,
  fullLoss,
}) {
  const examples = useMemo(() => {
    if (!points || points.length < 3) return points ? [...points] : [];
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const n = sorted.length;
    return [
      sorted[Math.floor(n * 0.15)],
      sorted[Math.floor(n * 0.5)],
      sorted[Math.floor(n * 0.85)],
    ];
  }, [points]);

  if (examples.length === 0) return null;

  const rows = examples.map((p) => {
    const z = beta0 + beta1 * p.x;
    const prob = sigmoid(z);
    const isPositive = p.y === 1;
    const usedTerm = isPositive ? prob : 1 - prob;
    const loss = -Math.log(Math.max(1e-12, usedTerm));
    return { p, z, prob, isPositive, usedTerm, loss };
  });

  const sumLoss = rows.reduce((a, r) => a + r.loss, 0);
  const sampleLoss = sumLoss / rows.length;

  return (
    <div className="worked-example">
      <h3 className="worked-title">Walk through the loss calculation</h3>
      <p className="worked-intro">
        Each patient contributes one term to the loss. If their truth is{' '}
        <InlineMath math={String.raw`y = 1`} /> we charge{' '}
        <InlineMath math={String.raw`-\log(P)`} /> (low when P is near 1,
        large when P is near 0). If their truth is{' '}
        <InlineMath math={String.raw`y = 0`} /> we charge{' '}
        <InlineMath math={String.raw`-\log(1 - P)`} /> (low when P is near
        0, large when P is near 1). The model's log-loss is the average of
        these per-patient terms.
      </p>

      <div className="worked-anatomy-row">
        <LossAnatomyDiagram
          rows={rows}
          positiveLabel={positiveLabel}
          negativeLabel={negativeLabel}
        />
        <div className="anatomy-narration">
          <p>
            <strong>Reading the curves.</strong> The dashed red curve is the
            loss for a patient whose truth is{' '}
            <em>{positiveLabel}</em> (y = 1): it is small when the model
            says high P, blowing up as P → 0. The dashed blue curve is the
            loss for a patient whose truth is{' '}
            <em>{negativeLabel}</em> (y = 0): symmetric, mirrored. Each of
            the three patients sits on whichever curve matches their actual
            label.
          </p>
        </div>
      </div>

      <div className="worked-table-wrap">
        <table className="worked-table">
          <thead>
            <tr>
              <th></th>
              <th>actual y</th>
              <th>P = σ(z)</th>
              <th>per-patient term</th>
              <th>loss</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="cell-id">P{i + 1}</td>
                <td
                  className={
                    row.isPositive ? 'cell-decision-pos' : 'cell-decision-neg'
                  }
                >
                  {row.isPositive
                    ? `1 (${positiveLabel})`
                    : `0 (${negativeLabel})`}
                </td>
                <td className="cell-true">{fmt(row.prob, 3)}</td>
                <td className="cell-pred">
                  <InlineMath
                    math={
                      row.isPositive
                        ? String.raw`-\log(${fmt(row.prob, 3)})`
                        : String.raw`-\log(1 - ${fmt(row.prob, 3)})`
                    }
                  />
                </td>
                <td className="cell-sq">{fmt(row.loss, 3)}</td>
              </tr>
            ))}
            <tr className="sum-row">
              <td colSpan={4}>sum of per-patient losses</td>
              <td>{fmt(sumLoss, 3)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="worked-mse">
        <div className="worked-mse-line">
          For these 3 patients:{' '}
          <InlineMath
            math={String.raw`\mathcal{L} = \dfrac{${fmt(sumLoss, 3)}}{3} = ${fmt(sampleLoss, 3)}`}
          />
        </div>
        <div className="worked-mse-line full-cohort">
          Across all {points.length} patients in the cohort:{' '}
          <InlineMath
            math={String.raw`\mathcal{L} = ${fmt(fullLoss, 3)}`}
          />
        </div>
        <p className="worked-foot">
          Drag the curve in section 03 (or pull the β-sliders) and watch
          every patient's P slide up or down its loss curve, and the
          full-cohort loss change accordingly. Maximum-likelihood fit is
          exactly the (β₀, β₁) pair that makes this sum as small as
          possible.
        </p>
      </div>
    </div>
  );
}
