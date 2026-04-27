import { InlineMath } from './Math';

function fmt(n, digits = 2) {
  if (!Number.isFinite(n)) return '?';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 0.01 || abs >= 1000)) return n.toExponential(2);
  return n.toFixed(digits);
}

// Treat single-character labels (e.g. y, x) as italic math identifiers and
// multi-character labels (BMI, HbA1c, SBP) as text via \mathrm{}.
function asMathLabel(label) {
  if (label.length <= 1) return label;
  return `\\mathrm{${label}}`;
}

function Equation({ slope, intercept, xShort, yShort }) {
  const sign = intercept >= 0 ? '+' : '-';
  const absInt = fmt(Math.abs(intercept), 2);
  const slopeStr = fmt(slope, 3);
  const yLabel = asMathLabel(yShort);
  const xLabel = asMathLabel(xShort);
  const expr = `\\widehat{${yLabel}} = ${slopeStr} \\cdot ${xLabel} ${sign} ${absInt}`;
  return <InlineMath math={expr} />;
}

export default function FormulaCard({
  userSlope,
  userIntercept,
  bestSlope,
  bestIntercept,
  xShort,
  yShort,
}) {
  return (
    <div className="formula-grid">
      <div className="formula-card user">
        <div className="formula-label">Your line</div>
        <div className="formula-equation">
          <Equation
            slope={userSlope}
            intercept={userIntercept}
            xShort={xShort}
            yShort={yShort}
          />
        </div>
      </div>
      <div className="formula-card best">
        <div className="formula-label">Least-squares fit</div>
        <div className="formula-equation">
          <Equation
            slope={bestSlope}
            intercept={bestIntercept}
            xShort={xShort}
            yShort={yShort}
          />
        </div>
      </div>
    </div>
  );
}
