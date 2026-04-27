function pct(n) {
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export default function ConfusionMatrix({
  stats,
  positiveLabel,
  negativeLabel,
}) {
  const { tp, fp, tn, fn, sensitivity, specificity, ppv, npv, accuracy } =
    stats;

  return (
    <div className="confusion-block">
      <div className="confusion-table-wrap">
        <table className="confusion-matrix">
          <thead>
            <tr>
              <th></th>
              <th colSpan={2} className="ch-group">
                model says
              </th>
            </tr>
            <tr>
              <th></th>
              <th className="ch-pos">{positiveLabel}</th>
              <th className="ch-neg">{negativeLabel}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="rh-pos">
                actual <br />
                {positiveLabel}
              </th>
              <td className="cm-cell cm-tp">
                <span className="cm-count">{tp}</span>
                <span className="cm-tag">true positive</span>
              </td>
              <td className="cm-cell cm-fn">
                <span className="cm-count">{fn}</span>
                <span className="cm-tag">false negative</span>
              </td>
            </tr>
            <tr>
              <th className="rh-neg">
                actual <br />
                {negativeLabel}
              </th>
              <td className="cm-cell cm-fp">
                <span className="cm-count">{fp}</span>
                <span className="cm-tag">false positive</span>
              </td>
              <td className="cm-cell cm-tn">
                <span className="cm-count">{tn}</span>
                <span className="cm-tag">true negative</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="cm-stats">
        <div className="cm-stat">
          <div className="cm-stat-label">Sensitivity</div>
          <div className="cm-stat-value">{pct(sensitivity)}</div>
          <div className="cm-stat-sub">
            of actual {positiveLabel}, the share we caught
          </div>
        </div>
        <div className="cm-stat">
          <div className="cm-stat-label">Specificity</div>
          <div className="cm-stat-value">{pct(specificity)}</div>
          <div className="cm-stat-sub">
            of actual {negativeLabel}, the share we cleared
          </div>
        </div>
        <div className="cm-stat">
          <div className="cm-stat-label">PPV</div>
          <div className="cm-stat-value">{pct(ppv)}</div>
          <div className="cm-stat-sub">
            of model-positives, share that are truly {positiveLabel}
          </div>
        </div>
        <div className="cm-stat">
          <div className="cm-stat-label">NPV</div>
          <div className="cm-stat-value">{pct(npv)}</div>
          <div className="cm-stat-sub">
            of model-negatives, share that are truly {negativeLabel}
          </div>
        </div>
        <div className="cm-stat">
          <div className="cm-stat-label">Accuracy</div>
          <div className="cm-stat-value">{pct(accuracy)}</div>
          <div className="cm-stat-sub">overall fraction correct</div>
        </div>
      </div>
    </div>
  );
}
