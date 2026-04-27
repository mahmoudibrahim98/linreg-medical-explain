function fmt(n, digits = 2) {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function Row({ label, value }) {
  return (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
    </div>
  );
}

export default function MetricsPanel({
  userSlope,
  userIntercept,
  userMSE,
  userR2,
  bestSlope,
  bestIntercept,
  bestMSE,
  bestR2,
  xUnit,
  yUnit,
}) {
  return (
    <div className="metrics-panel">
      <div className="metric-col user">
        <h3>Your line</h3>
        <Row label={`Slope (${yUnit}/${xUnit})`} value={fmt(userSlope, 3)} />
        <Row label={`Intercept (${yUnit})`} value={fmt(userIntercept, 2)} />
        <Row label="MSE" value={fmt(userMSE, 2)} />
        <Row label="RMSE" value={fmt(Math.sqrt(userMSE), 2)} />
        <Row label="R²" value={fmt(userR2, 3)} />
      </div>
      <div className="metric-col best">
        <h3>Least-squares fit</h3>
        <Row label={`Slope (${yUnit}/${xUnit})`} value={fmt(bestSlope, 3)} />
        <Row label={`Intercept (${yUnit})`} value={fmt(bestIntercept, 2)} />
        <Row label="MSE" value={fmt(bestMSE, 2)} />
        <Row label="RMSE" value={fmt(Math.sqrt(bestMSE), 2)} />
        <Row label="R²" value={fmt(bestR2, 3)} />
      </div>
    </div>
  );
}
