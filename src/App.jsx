import { useEffect, useMemo, useState } from 'react';
import { datasets, generateDataset } from './data/datasets';
import { fitOLS, mse, r2 } from './stats/regression';
import DatasetPicker from './components/DatasetPicker';
import ScatterPlot from './components/ScatterPlot';
import MetricsPanel from './components/MetricsPanel';
import LossSurface from './components/LossSurface';

function defaultStartLine(dataset) {
  // A flat, mid-height line — gives students an obviously imperfect starting point.
  const mid = (dataset.yRange[0] + dataset.yRange[1]) / 2;
  return { slope: 0, intercept: mid };
}

function paramRanges(best, dataset) {
  const slopeMag = Math.max(Math.abs(best.slope), 0.5);
  const slopeRange = [best.slope - slopeMag * 1.6, best.slope + slopeMag * 1.6];
  const ySpan = dataset.yRange[1] - dataset.yRange[0];
  const interceptRange = [best.intercept - ySpan * 0.6, best.intercept + ySpan * 0.6];
  return { slopeRange, interceptRange };
}

export default function App() {
  const [datasetId, setDatasetId] = useState(datasets[0].id);
  const dataset = datasets.find((d) => d.id === datasetId);

  const [seed, setSeed] = useState(42);
  const points = useMemo(
    () => generateDataset(dataset, seed),
    [dataset, seed]
  );
  const best = useMemo(() => fitOLS(points), [points]);
  const { slopeRange, interceptRange } = useMemo(
    () => paramRanges(best, dataset),
    [best, dataset]
  );

  const [line, setLine] = useState(() => defaultStartLine(dataset));

  // Reset the user line when dataset changes.
  useEffect(() => {
    setLine(defaultStartLine(dataset));
  }, [datasetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [showResiduals, setShowResiduals] = useState(false);
  const [showBest, setShowBest] = useState(false);

  const userMSE = mse(points, line.slope, line.intercept);
  const bestMSE = mse(points, best.slope, best.intercept);
  const userR2 = r2(points, line.slope, line.intercept);
  const bestR2 = r2(points, best.slope, best.intercept);

  const slopeUnits = `${dataset.yUnit}/${dataset.xUnit}`;

  return (
    <div className="app">
      <header className="hero">
        <div className="kicker">AI in Medicine · Interactive primer</div>
        <h1>Linear Regression, in the Clinic</h1>
        <p className="subtitle">
          A walkthrough of the simplest predictive model in medicine — and the
          ideas (loss, fit, residuals, R²) it shares with every supervised ML
          model you'll encounter later.
        </p>
      </header>

      <section className="prose">
        <p>
          A clinician notices a trend: heavier patients tend to have higher
          blood pressure. Older patients tend to have higher HbA1c. Bigger
          tumors tend to recur more often. We want a way to <em>quantify</em>{' '}
          and <em>predict</em> these trends — not just say "yes, there's a
          relationship," but give a concrete number for a new patient.
        </p>
        <p>
          The simplest model is a straight line:{' '}
          <span className="eq">ŷ = m · x + b</span>. One input, one output, two
          knobs to turn. Despite its simplicity, this model embodies every
          ingredient of modern machine learning: a parameterised function, a
          measure of error, and a procedure to find the parameters that
          minimise that error.
        </p>
      </section>

      <section className="picker-section">
        <h2>1 · Pick a clinical scenario</h2>
        <DatasetPicker
          datasets={datasets}
          value={datasetId}
          onChange={setDatasetId}
        />
        <p className="dataset-desc">{dataset.description}</p>
        <p className="clinical-note">
          <strong>Clinical caveat:</strong> {dataset.clinicalNote}
        </p>
        <p className="data-note">
          The data below is <em>simulated</em> from a known truth so you can
          compare your fitted line to the generative process. Click{' '}
          <em>New sample</em> to draw a fresh cohort from the same population.
        </p>
      </section>

      <section>
        <h2>2 · Fit a line by hand</h2>
        <p className="prose">
          Drag the orange line — grab either endpoint to tilt it, or drag the
          middle to slide it up and down. Toggle <em>residuals</em> to see the
          per-patient errors your line makes. Your goal: make the residuals as
          short as possible, on average.
        </p>
        <div className="plot-row">
          <div className="plot-and-controls">
            <ScatterPlot
              points={points}
              slope={line.slope}
              intercept={line.intercept}
              onLineChange={setLine}
              bestSlope={best.slope}
              bestIntercept={best.intercept}
              showResiduals={showResiduals}
              showBest={showBest}
              xLabel={dataset.xLabel}
              yLabel={dataset.yLabel}
              xRange={dataset.xRange}
              yRange={dataset.yRange}
            />
            <div className="controls">
              <label>
                <input
                  type="checkbox"
                  checked={showResiduals}
                  onChange={(e) => setShowResiduals(e.target.checked)}
                />
                Show residuals
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showBest}
                  onChange={(e) => setShowBest(e.target.checked)}
                />
                Show least-squares fit
              </label>
              <button
                className="btn primary"
                onClick={() => setLine({ slope: best.slope, intercept: best.intercept })}
              >
                Snap to best fit
              </button>
              <button
                className="btn"
                onClick={() => setLine(defaultStartLine(dataset))}
              >
                Reset line
              </button>
              <button className="btn" onClick={() => setSeed((s) => s + 1)}>
                New sample
              </button>
            </div>
          </div>
          <MetricsPanel
            userSlope={line.slope}
            userIntercept={line.intercept}
            userMSE={userMSE}
            userR2={userR2}
            bestSlope={best.slope}
            bestIntercept={best.intercept}
            bestMSE={bestMSE}
            bestR2={bestR2}
            xUnit={dataset.xUnit}
            yUnit={dataset.yUnit}
          />
        </div>
        <p className="caption">
          The slope tells you how much <strong>{dataset.yLabel}</strong>{' '}
          changes for each one-unit increase in <strong>{dataset.xLabel}</strong>{' '}
          ({slopeUnits}). The intercept is the model's prediction at{' '}
          {dataset.xLabel} = 0 — often a clinically nonsensical value, which is
          a good reason to be careful about extrapolating outside the observed
          range.
        </p>
      </section>

      <section>
        <h2>3 · How do we measure how good a line is?</h2>
        <p className="prose">
          For each patient i with observed value <span className="eq">y<sub>i</sub></span>{' '}
          and predicted value <span className="eq">ŷ<sub>i</sub> = m·x<sub>i</sub> + b</span>,
          the residual is the gap{' '}
          <span className="eq">y<sub>i</sub> − ŷ<sub>i</sub></span>. The
          standard summary is the <strong>mean squared error</strong> (MSE):
        </p>
        <p className="eq-block">
          MSE(m, b) = (1/n) · Σ (y<sub>i</sub> − m·x<sub>i</sub> − b)²
        </p>
        <p className="prose">
          Why <em>squared</em>? Three reasons. (i) It penalises a few large
          mistakes more than many small ones — clinically appropriate when a
          single very wrong prediction can mislead a treatment decision. (ii)
          It makes the math tractable: the optimum has a closed-form solution.
          (iii) It corresponds to the maximum-likelihood estimate when noise is
          Gaussian — a reasonable default for many continuous biomarkers.
        </p>
      </section>

      <section>
        <h2>4 · The loss landscape</h2>
        <p className="prose">
          Every choice of slope (m) and intercept (b) gives one MSE value. Plot
          MSE over the (m, b) plane and you get a <em>landscape</em>. For
          linear regression with squared error this landscape is a smooth bowl
          with one minimum — the optimum the least-squares formula jumps
          straight to. Drag the line on the scatter plot above and watch the
          orange dot move on this landscape.
        </p>
        <div className="loss-row">
          <LossSurface
            points={points}
            slope={line.slope}
            intercept={line.intercept}
            bestSlope={best.slope}
            bestIntercept={best.intercept}
            slopeRange={slopeRange}
            interceptRange={interceptRange}
          />
          <div className="loss-legend">
            <p>
              Darker = lower MSE. The green ring marks the analytic optimum.
              The orange dot is your line.
            </p>
            <p>
              <strong>Why this matters for ML.</strong> More complex models
              (logistic regression, neural networks) have <em>much</em> bumpier
              landscapes — many local minima, saddle points, plateaus. We can
              no longer solve them with a closed-form formula and resort to{' '}
              <em>gradient descent</em>: take small steps downhill until we
              land somewhere flat. Linear regression is the gentle introduction
              to that whole world.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2>5 · How well does the line fit? — R²</h2>
        <p className="prose">
          MSE has units (mmHg², or %², or VAS-points²) and is hard to compare
          across problems. The <strong>coefficient of determination R²</strong>{' '}
          rescales it. It answers: of all the variance in the outcome, what{' '}
          <em>fraction</em> does our line explain?
        </p>
        <p className="eq-block">
          R² = 1 − SS<sub>res</sub> / SS<sub>tot</sub>
        </p>
        <p className="prose">
          <code>SS_res</code> is the sum of squared residuals around your line.
          <code>SS_tot</code> is the sum of squared deviations of the y values
          around their mean — i.e., what you'd get from a "constant model" that
          ignores x. R² ranges from 1 (perfect fit) to 0 (no better than the
          mean) and can even go negative for a sufficiently bad line.
        </p>
        <p className="prose">
          <strong>Clinical reading.</strong> An R² of {bestR2.toFixed(2)} for
          this dataset means the line explains {Math.round(bestR2 * 100)}% of
          the variance in {dataset.yLabel.toLowerCase()}. The other{' '}
          {Math.round((1 - bestR2) * 100)}% is biological variation, measurement
          noise, and effects of variables we didn't include — comorbidities,
          medications, time of day, genetics. A "good" R² depends entirely on
          the question: 0.10 may be useful for population-level epidemiology,
          while 0.95 may be inadequate for an individual diagnostic decision.
        </p>
      </section>

      <section>
        <h2>6 · Cautions for clinical use</h2>
        <ul className="caveats">
          <li>
            <strong>Correlation isn't causation.</strong> A line through BMI
            and blood pressure quantifies association, not mechanism.
            Confounders (age, diet, activity) drive much of what the slope
            captures.
          </li>
          <li>
            <strong>Don't extrapolate.</strong> A linear fit on tumor sizes
            5–50 mm tells you nothing reliable about a 100 mm lesion. Real
            biology saturates.
          </li>
          <li>
            <strong>Outliers move lines.</strong> Squared error gives one
            extreme patient outsized influence. For skewed clinical outcomes,
            consider robust regression or transformations.
          </li>
          <li>
            <strong>Independence assumption.</strong> Repeated measures from
            the same patient, or patients clustered in the same clinic, break
            the standard formulas. Mixed-effects models are the next step.
          </li>
          <li>
            <strong>It's a baseline, not the destination.</strong> Linear
            regression is your null model — the thing every fancier method
            should beat before you trust it.
          </li>
        </ul>
      </section>

      <footer className="footer">
        <p>
          Built for the AI in Medicine course. Data is simulated; clinical
          parameters are illustrative, not validated. Inspired by the AWS MLU
          Explain visual essays.
        </p>
      </footer>
    </div>
  );
}
