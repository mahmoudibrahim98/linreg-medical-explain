function fmt(n, digits = 2) {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 0.01 || abs >= 1000)) return n.toExponential(2);
  return n.toFixed(digits);
}

function Equation({ slope, intercept, xShort, yShort }) {
  const sign = intercept >= 0 ? '+' : '−';
  return (
    <span className="equation">
      <span className="lhs">predicted {yShort}</span>
      <span className="op">=</span>
      <span className="param">{fmt(slope, 3)}</span>
      <span className="op">×</span>
      <span className="var">{xShort}</span>
      <span className="op">{sign}</span>
      <span className="param">{fmt(Math.abs(intercept), 2)}</span>
    </span>
  );
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
        <Equation
          slope={userSlope}
          intercept={userIntercept}
          xShort={xShort}
          yShort={yShort}
        />
      </div>
      <div className="formula-card best">
        <div className="formula-label">Least-squares fit</div>
        <Equation
          slope={bestSlope}
          intercept={bestIntercept}
          xShort={xShort}
          yShort={yShort}
        />
      </div>
    </div>
  );
}
