import { useMemo } from 'react';

const POINT_COLOR = '#1f6feb';
const LINE_COLOR = '#e07b00';
const RESIDUAL_COLOR = '#dc2626';
const SQUARE_FILL = 'rgba(220, 38, 38, 0.18)';
const SQUARE_STROKE = 'rgba(220, 38, 38, 0.55)';

function fmt(n, digits = 2) {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function AnatomyDiagram({ point, slope, intercept, yShort, xShort, yUnit, xUnit }) {
  if (!point) return null;
  const yPred = slope * point.x + intercept;
  const err = point.y - yPred;
  const errSq = err * err;
  const isPosErr = err >= 0;

  // Stylized fixed-proportion layout. The visual ratio is constant; only the
  // labelled values are dynamic. This keeps the illustration legible no
  // matter how big or small the actual residual is.
  const W = 380;
  const H = 240;
  const margin = 28;
  const lineX1 = margin;
  const lineX2 = W - margin - 130;
  const pointX = 190;

  // Line tilts gently down-to-up so it visually resembles a regression line.
  const lineY1 = isPosErr ? 170 : 80;
  const lineY2 = isPosErr ? 120 : 130;
  const lineYatPointX =
    lineY1 + ((lineY2 - lineY1) * (pointX - lineX1)) / (lineX2 - lineX1);

  const gap = 70;
  const pointY = isPosErr ? lineYatPointX - gap : lineYatPointX + gap;
  const sqSide = Math.abs(pointY - lineYatPointX);
  const sqTop = Math.min(pointY, lineYatPointX);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="anatomy-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* baseline grid */}
      <line
        x1={0}
        x2={W}
        y1={H - 20}
        y2={H - 20}
        stroke="rgba(0,0,0,0.08)"
      />

      {/* the line */}
      <line
        x1={lineX1}
        y1={lineY1}
        x2={lineX2}
        y2={lineY2}
        stroke={LINE_COLOR}
        strokeWidth={2.5}
      />
      <text
        x={lineX2 + 6}
        y={lineY2 + 4}
        fill={LINE_COLOR}
        className="anatomy-line-label"
      >
        line: ŷ = m·x + b
      </text>

      {/* error square (drawn under the segment) */}
      <rect
        x={pointX}
        y={sqTop}
        width={sqSide}
        height={sqSide}
        fill={SQUARE_FILL}
        stroke={SQUARE_STROKE}
        strokeWidth={1}
      />

      {/* residual segment */}
      <line
        x1={pointX}
        y1={pointY}
        x2={pointX}
        y2={lineYatPointX}
        stroke={RESIDUAL_COLOR}
        strokeWidth={2.5}
      />

      {/* predicted point on the line */}
      <circle
        cx={pointX}
        cy={lineYatPointX}
        r={5.5}
        fill={LINE_COLOR}
        stroke="#fff"
        strokeWidth={1.5}
      />

      {/* observed point */}
      <circle
        cx={pointX}
        cy={pointY}
        r={6.5}
        fill={POINT_COLOR}
        stroke="#fff"
        strokeWidth={1.5}
      />

      {/* labels */}
      <text
        x={pointX - 14}
        y={pointY + 4}
        textAnchor="end"
        className="anatomy-label-true"
        fill={POINT_COLOR}
      >
        actual y = {fmt(point.y)} {yUnit}
      </text>
      <text
        x={pointX - 14}
        y={lineYatPointX + 4}
        textAnchor="end"
        className="anatomy-label-pred"
        fill={LINE_COLOR}
      >
        predicted ŷ = {fmt(yPred)} {yUnit}
      </text>
      <text
        x={pointX + sqSide + 8}
        y={(pointY + lineYatPointX) / 2 - 6}
        className="anatomy-label-err"
        fill={RESIDUAL_COLOR}
      >
        error = ({err >= 0 ? '+' : ''}{fmt(err)})
      </text>
      <text
        x={pointX + sqSide + 8}
        y={(pointY + lineYatPointX) / 2 + 12}
        className="anatomy-label-err"
        fill={RESIDUAL_COLOR}
      >
        error² = {fmt(errSq)}
      </text>

      {/* x foot label */}
      <text
        x={pointX}
        y={H - 6}
        textAnchor="middle"
        className="anatomy-axis-label"
      >
        {xShort} = {fmt(point.x, 1)} {xUnit}
      </text>
      <line
        x1={pointX}
        y1={isPosErr ? lineYatPointX : pointY}
        x2={pointX}
        y2={H - 24}
        stroke="rgba(0,0,0,0.2)"
        strokeDasharray="2 3"
      />
    </svg>
  );
}

export default function WorkedExample({
  points,
  slope,
  intercept,
  fullMSE,
  xShort,
  yShort,
  xUnit,
  yUnit,
}) {
  // Three patients spread across the data: lower, middle, upper quintile.
  const examples = useMemo(() => {
    if (!points || points.length < 3) return points ? [...points] : [];
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const n = sorted.length;
    const idx = [
      Math.floor(n * 0.2),
      Math.floor(n * 0.5),
      Math.floor(n * 0.8),
    ];
    return idx.map((i) => sorted[i]);
  }, [points]);

  if (examples.length === 0) return null;

  const rows = examples.map((p) => {
    const yp = slope * p.x + intercept;
    const err = p.y - yp;
    return { p, yp, err, sq: err * err };
  });
  const sumSq = rows.reduce((a, r) => a + r.sq, 0);
  const sampleMSE = sumSq / rows.length;

  return (
    <div className="worked-example">
      <h3 className="worked-title">Walk through the calculation</h3>
      <p className="worked-intro">
        Pick any patient i. The model predicts{' '}
        <span className="eq">ŷ<sub>i</sub> = m·x<sub>i</sub> + b</span>. The{' '}
        <strong>error</strong> for that patient is the gap between the actual
        value y<sub>i</sub> and the prediction. The <strong>squared error</strong>{' '}
        is the area of one red square. The MSE averages those squared errors
        across the cohort.
      </p>

      <div className="worked-anatomy-row">
        <AnatomyDiagram
          point={examples[1]}
          slope={slope}
          intercept={intercept}
          xShort={xShort}
          yShort={yShort}
          yUnit={yUnit}
          xUnit={xUnit}
        />
        <div className="anatomy-narration">
          <p>
            <strong>For one patient (P2 in the table below):</strong>
          </p>
          <ol className="anatomy-steps">
            <li>
              Plug their {xShort.toLowerCase()} into the line:{' '}
              <span className="eq">
                ŷ = {fmt(slope, 3)} × {fmt(examples[1].x, 1)} +{' '}
                {fmt(intercept, 2)} = {fmt(rows[1].yp)}
              </span>.
            </li>
            <li>
              Subtract the prediction from the actual:{' '}
              <span className="eq">
                error = {fmt(examples[1].y)} − {fmt(rows[1].yp)} ={' '}
                {rows[1].err >= 0 ? '+' : ''}
                {fmt(rows[1].err)}
              </span>.
            </li>
            <li>
              Square it:{' '}
              <span className="eq">
                ({rows[1].err >= 0 ? '+' : ''}
                {fmt(rows[1].err)})² = {fmt(rows[1].sq)}
              </span>{' '}
              (this is the <em>area of the red square</em>).
            </li>
          </ol>
        </div>
      </div>

      <div className="worked-table-wrap">
        <table className="worked-table">
          <thead>
            <tr>
              <th></th>
              <th>{xShort}</th>
              <th>actual {yShort}</th>
              <th>predicted ŷ</th>
              <th>error</th>
              <th>error²</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="cell-id">P{i + 1}</td>
                <td className="cell-x">{fmt(row.p.x, 1)}</td>
                <td className="cell-true">{fmt(row.p.y)}</td>
                <td className="cell-pred">{fmt(row.yp)}</td>
                <td
                  className={
                    row.err >= 0 ? 'cell-err cell-err-pos' : 'cell-err cell-err-neg'
                  }
                >
                  {row.err >= 0 ? '+' : ''}
                  {fmt(row.err)}
                </td>
                <td className="cell-sq">{fmt(row.sq)}</td>
              </tr>
            ))}
            <tr className="sum-row">
              <td colSpan={5}>sum of squared errors</td>
              <td>{fmt(sumSq)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="worked-mse">
        <div className="worked-mse-line">
          For these 3 patients:{' '}
          <span className="eq mse-calc">
            MSE = {fmt(sumSq)} / 3 ={' '}
            <strong>
              {fmt(sampleMSE)} {yUnit ? `${yUnit}²` : ''}
            </strong>
          </span>
        </div>
        <div className="worked-mse-line full-cohort">
          Across all {points.length} patients in the cohort:{' '}
          <strong>
            MSE = {fmt(fullMSE)} {yUnit ? `${yUnit}²` : ''}
          </strong>
        </div>
        <p className="worked-foot">
          Drag the line above and watch every cell in this table — and the
          full-cohort MSE — update. The least-squares fit is exactly the line
          that makes the sum of squared errors as small as possible.
        </p>
      </div>
    </div>
  );
}
