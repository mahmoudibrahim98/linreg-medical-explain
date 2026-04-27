import { useMemo } from 'react';
import { sigmoid } from '../stats/regression';

function fmt(n, digits = 3) {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

export default function LogisticWorkedExample({
  points,
  beta0,
  beta1,
  threshold,
  xShort,
  positiveLabel,
  negativeLabel,
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
    const yhat = prob >= threshold ? 1 : 0;
    const correct = yhat === p.y;
    return { p, z, prob, yhat, correct };
  });

  return (
    <div className="worked-example">
      <h3 className="worked-title">Walk through the calculation</h3>
      <p className="worked-intro">
        For each patient, the model computes a linear combination{' '}
        <span className="eq">z = β₀ + β₁·{xShort}</span>, passes it through
        the logistic σ to get a probability, and compares that probability to
        the chosen threshold to make a decision.
      </p>

      <div className="worked-table-wrap">
        <table className="worked-table">
          <thead>
            <tr>
              <th></th>
              <th>{xShort}</th>
              <th>z = β₀ + β₁·x</th>
              <th>P = σ(z)</th>
              <th>decision (t={threshold.toFixed(2)})</th>
              <th>actual</th>
              <th>correct?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="cell-id">P{i + 1}</td>
                <td className="cell-x">{fmt(r.p.x, 1)}</td>
                <td className="cell-pred">{fmt(r.z, 3)}</td>
                <td className="cell-true">{fmt(r.prob, 3)}</td>
                <td
                  className={
                    r.yhat === 1 ? 'cell-decision-pos' : 'cell-decision-neg'
                  }
                >
                  {r.yhat === 1 ? positiveLabel : negativeLabel}
                </td>
                <td
                  className={
                    r.p.y === 1 ? 'cell-decision-pos' : 'cell-decision-neg'
                  }
                >
                  {r.p.y === 1 ? positiveLabel : negativeLabel}
                </td>
                <td
                  className={r.correct ? 'cell-err-pos' : 'cell-err-neg'}
                  style={{ fontWeight: 700 }}
                >
                  {r.correct ? '✓' : '✗'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="worked-mse">
        <div className="worked-mse-line">
          For patient P2:{' '}
          <span className="eq mse-calc">
            z = {fmt(beta0, 3)} + {fmt(beta1, 4)} × {fmt(rows[1].p.x, 1)} ={' '}
            {fmt(rows[1].z, 3)}
          </span>
        </div>
        <div className="worked-mse-line">
          <span className="eq mse-calc">
            P = σ({fmt(rows[1].z, 3)}) = 1 / (1 + exp(−{fmt(rows[1].z, 3)})) ={' '}
            <strong>{fmt(rows[1].prob, 3)}</strong>
          </span>
        </div>
        <div className="worked-mse-line full-cohort">
          {rows[1].prob >= threshold ? '≥' : '<'} threshold (
          {threshold.toFixed(2)}) → predict{' '}
          <strong>
            {rows[1].yhat === 1 ? positiveLabel : negativeLabel}
          </strong>
        </div>
        <p className="worked-foot">
          Drag the curve in the plot above and watch every probability and
          decision in this table update. The same logic, run across the
          whole cohort, gives you the confusion matrix.
        </p>
      </div>
    </div>
  );
}
