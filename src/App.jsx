import { useEffect, useMemo, useState } from 'react';
import { datasets, generateDataset, nonlinearDatasets } from './data/datasets';
import {
  fitOLS,
  mse,
  r2,
  fitPolynomial,
  msePredict,
  r2Predict,
} from './stats/regression';
import DatasetPicker from './components/DatasetPicker';
import ScatterPlot from './components/ScatterPlot';
import MetricsPanel from './components/MetricsPanel';
import LossSurface from './components/LossSurface';
import FormulaCard from './components/FormulaCard';
import NonlinearPlot from './components/NonlinearPlot';

const POLY_DEGREES = [1, 2, 3, 4, 5];

function defaultStartLine(dataset) {
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
  const [sampleSize, setSampleSize] = useState(80);
  const points = useMemo(
    () => generateDataset(dataset, seed, sampleSize),
    [dataset, seed, sampleSize]
  );
  const best = useMemo(() => fitOLS(points), [points]);
  const { slopeRange, interceptRange } = useMemo(
    () => paramRanges(best, dataset),
    [best, dataset]
  );

  const [line, setLine] = useState(() => defaultStartLine(dataset));
  const [predictX, setPredictX] = useState(
    () => (dataset.xRange[0] + dataset.xRange[1]) / 2
  );

  // Reset interactives when dataset changes.
  useEffect(() => {
    setLine(defaultStartLine(dataset));
    setPredictX((dataset.xRange[0] + dataset.xRange[1]) / 2);
  }, [datasetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [showResiduals, setShowResiduals] = useState(false);
  const [showSquares, setShowSquares] = useState(false);
  const [showBest, setShowBest] = useState(false);
  const [predictionMode, setPredictionMode] = useState(false);

  // Nonlinear section state
  const [nlDatasetId, setNlDatasetId] = useState(nonlinearDatasets[0].id);
  const nlDataset = nonlinearDatasets.find((d) => d.id === nlDatasetId);
  const [nlSeed, setNlSeed] = useState(7);
  const [nlSampleSize, setNlSampleSize] = useState(60);
  const nlPoints = useMemo(
    () => nlDataset.sample(nlSeed, nlSampleSize),
    [nlDataset, nlSeed, nlSampleSize]
  );
  const linearFit = useMemo(() => fitOLS(nlPoints), [nlPoints]);
  const polyFits = useMemo(
    () => POLY_DEGREES.map((d) => fitPolynomial(nlPoints, d)),
    [nlPoints]
  );
  const polyMSEs = useMemo(
    () => polyFits.map((f) => msePredict(nlPoints, (x) => f.predict(x))),
    [polyFits, nlPoints]
  );
  const polyR2s = useMemo(
    () => polyFits.map((f) => r2Predict(nlPoints, (x) => f.predict(x))),
    [polyFits, nlPoints]
  );
  const [polyDegree, setPolyDegree] = useState(1);
  const [showTruth, setShowTruth] = useState(true);
  const polyFit = polyFits[polyDegree - 1];
  // Fix the residuals-plot y-axis to the linear-fit residuals so higher-degree
  // residuals visibly shrink instead of auto-rescaling to fill the panel.
  const linearResidualMaxAbs = useMemo(() => {
    let m = 0;
    for (const p of nlPoints) {
      const r = Math.abs(p.y - (linearFit.slope * p.x + linearFit.intercept));
      if (r > m) m = r;
    }
    return m * 1.1;
  }, [nlPoints, linearFit]);

  const userMSE = mse(points, line.slope, line.intercept);
  const bestMSE = mse(points, best.slope, best.intercept);
  const userR2 = r2(points, line.slope, line.intercept);
  const bestR2 = r2(points, best.slope, best.intercept);

  const slopeUnits = `${dataset.yUnit}/${dataset.xUnit}`;
  const yPredAtX = line.slope * predictX + line.intercept;

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
          per-patient errors, and <em>error squares</em> to see what
          least-squares is actually minimising. Hover any data point to compare
          its true value to your model's prediction.
        </p>

        <FormulaCard
          userSlope={line.slope}
          userIntercept={line.intercept}
          bestSlope={best.slope}
          bestIntercept={best.intercept}
          xShort={dataset.xShort}
          yShort={dataset.yShort}
        />

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
              showSquares={showSquares}
              showBest={showBest}
              predictionMode={predictionMode}
              predictX={predictX}
              onPredictXChange={setPredictX}
              xLabel={dataset.xLabel}
              yLabel={dataset.yLabel}
              xShort={dataset.xShort}
              yShort={dataset.yShort}
              xUnit={dataset.xUnit}
              yUnit={dataset.yUnit}
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
                <span className="swatch swatch-residual" /> Residuals
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showSquares}
                  onChange={(e) => setShowSquares(e.target.checked)}
                />
                <span className="swatch swatch-square" /> Error squares
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showBest}
                  onChange={(e) => setShowBest(e.target.checked)}
                />
                <span className="swatch swatch-best" /> Least-squares fit
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={predictionMode}
                  onChange={(e) => setPredictionMode(e.target.checked)}
                />
                <span className="swatch swatch-pred" /> Make a prediction
              </label>
              <div className="control-actions">
                <button
                  className="btn primary"
                  onClick={() =>
                    setLine({ slope: best.slope, intercept: best.intercept })
                  }
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

            <div className="sample-size-row">
              <label htmlFor="sample-size-slider" className="sample-size-label">
                Cohort size
              </label>
              <input
                id="sample-size-slider"
                type="range"
                min={5}
                max={300}
                step={1}
                value={sampleSize}
                onChange={(e) => setSampleSize(parseInt(e.target.value, 10))}
              />
              <span className="sample-size-readout">
                n = {sampleSize} patient{sampleSize === 1 ? '' : 's'}
              </span>
            </div>

            {predictionMode && (
              <div className="prediction-panel">
                <div className="prediction-header">
                  Predict for a hypothetical patient
                </div>
                <div className="prediction-slider-row">
                  <label htmlFor="px-slider">{dataset.xShort}:</label>
                  <input
                    id="px-slider"
                    type="range"
                    min={dataset.xRange[0]}
                    max={dataset.xRange[1]}
                    step={(dataset.xRange[1] - dataset.xRange[0]) / 200}
                    value={predictX}
                    onChange={(e) => setPredictX(parseFloat(e.target.value))}
                  />
                  <span className="prediction-x-readout">
                    {predictX.toFixed(1)} {dataset.xUnit}
                  </span>
                </div>
                <div className="prediction-equation">
                  predicted {dataset.yShort} = {line.slope.toFixed(3)} ×{' '}
                  {predictX.toFixed(1)} + {line.intercept.toFixed(2)} ={' '}
                  <strong>
                    {yPredAtX.toFixed(2)} {dataset.yUnit}
                  </strong>
                </div>
                <p className="prediction-note">
                  This is what your current line would predict for a patient
                  with {dataset.xShort.toLowerCase()} = {predictX.toFixed(1)}{' '}
                  {dataset.xUnit}. Drag the purple dot on the plot or the
                  slider to explore other values.
                </p>
              </div>
            )}
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
          For each patient i with observed value{' '}
          <span className="eq">y<sub>i</sub></span> and predicted value{' '}
          <span className="eq">ŷ<sub>i</sub> = m·x<sub>i</sub> + b</span>, the
          residual is the gap{' '}
          <span className="eq">y<sub>i</sub> − ŷ<sub>i</sub></span> — exactly
          the red segments above. Turn on <em>error squares</em> and you'll see
          a square of side equal to that gap drawn next to each patient. The
          area of each square is the residual squared; the average area is the{' '}
          <strong>mean squared error</strong>:
        </p>
        <p className="eq-block">
          MSE(m, b) = (1/n) · Σ (y<sub>i</sub> − m·x<sub>i</sub> − b)²
        </p>
        <p className="prose">
          Least-squares regression literally finds the (m, b) that makes the
          total area of those squares as small as possible. Why{' '}
          <em>squared</em>? Three reasons. (i) It penalises a few large
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
        <h2>6 · When the line breaks — nonlinear relationships</h2>
        <p className="prose">
          Linear regression is a <em>hypothesis</em> about the world: that the
          outcome changes by the same amount for every unit of input. Plenty
          of clinical relationships violate that — receptors saturate, risk
          curves bend, biology has thresholds. Pick a scenario below and watch
          how a straight line struggles, while a polynomial of higher degree
          can recover the shape. The mini chart underneath plots the{' '}
          <em>residuals</em> — when the model is wrong in a structured way,
          you can see it directly.
        </p>

        <DatasetPicker
          datasets={nonlinearDatasets}
          value={nlDatasetId}
          onChange={setNlDatasetId}
        />
        <p className="dataset-desc">{nlDataset.description}</p>
        <p className="clinical-note">
          <strong>Clinical caveat:</strong> {nlDataset.clinicalNote}
        </p>

        <div className="degree-controls">
          <span className="control-group-label">Model:</span>
          <div className="degree-buttons">
            {POLY_DEGREES.map((d) => (
              <button
                key={d}
                className={`degree-btn${polyDegree === d ? ' active' : ''}`}
                onClick={() => setPolyDegree(d)}
                title={d === 1 ? 'Linear (degree 1)' : `Polynomial degree ${d}`}
              >
                {d === 1 ? 'linear' : `deg ${d}`}
              </button>
            ))}
          </div>
          <label className="truth-toggle">
            <input
              type="checkbox"
              checked={showTruth}
              onChange={(e) => setShowTruth(e.target.checked)}
            />
            <span className="swatch swatch-truth" /> Show true curve
          </label>
          <button
            className="btn"
            onClick={() => setNlSeed((s) => s + 1)}
            style={{ marginLeft: 'auto' }}
          >
            New sample
          </button>
        </div>

        <div className="sample-size-row">
          <label htmlFor="nl-sample-size" className="sample-size-label">
            Cohort size
          </label>
          <input
            id="nl-sample-size"
            type="range"
            min={10}
            max={300}
            step={1}
            value={nlSampleSize}
            onChange={(e) => setNlSampleSize(parseInt(e.target.value, 10))}
          />
          <span className="sample-size-readout">
            n = {nlSampleSize} patient{nlSampleSize === 1 ? '' : 's'}
          </span>
          <span className="sample-size-hint">
            try a small n with high degree to see overfitting
          </span>
        </div>

        <NonlinearPlot
          points={nlPoints}
          linearFit={linearFit}
          polyFit={polyFit}
          truthFn={nlDataset.truthFn}
          showTruth={showTruth}
          residualMaxAbs={linearResidualMaxAbs}
          xLabel={nlDataset.xLabel}
          yLabel={nlDataset.yLabel}
          xRange={nlDataset.xRange}
          yRange={nlDataset.yRange}
        />

        <div className="degree-summary">
          <div className="degree-summary-row">
            <span className="degree-summary-label">MSE by degree</span>
            {polyMSEs.map((m, i) => (
              <span
                key={i}
                className={`degree-summary-cell${
                  polyDegree === i + 1 ? ' active' : ''
                }`}
              >
                <span className="cell-d">d={i + 1}</span>
                <span className="cell-v">{m.toFixed(2)}</span>
              </span>
            ))}
          </div>
          <div className="degree-summary-row">
            <span className="degree-summary-label">R² by degree</span>
            {polyR2s.map((v, i) => (
              <span
                key={i}
                className={`degree-summary-cell${
                  polyDegree === i + 1 ? ' active' : ''
                }`}
              >
                <span className="cell-d">d={i + 1}</span>
                <span className="cell-v">{v.toFixed(3)}</span>
              </span>
            ))}
          </div>
        </div>

        <p className="prose">
          <strong>What to look for.</strong> At degree 1 the residuals form an
          unmistakable shape — a U for the J-curve, a wave for the saturation
          curve. That's the diagnostic signature of model misspecification:
          the model is wrong in a way the data is telling you about. Bumping
          the degree to 2 or 3 typically wipes out most of the structure.
          Going further (degree 4–5) gives only marginal gains here and starts
          to chase noise — the beginning of <em>overfitting</em>.
        </p>
        <p className="prose">
          <strong>Why this matters.</strong> The same logic underlies the
          choice of model in modern ML: more flexibility fits the data better,
          but past a point you're memorising patient-specific noise that won't
          repeat in new patients. The whole field of <em>regularisation</em>{' '}
          and <em>cross-validation</em> exists to navigate this trade-off
          rigorously. Linear regression is the simplest place to feel the
          tension.
        </p>
        <p className="prose">
          <strong>Note on transformations.</strong> When you know the shape in
          advance — saturation, exponential decay, a ratio — fitting a model
          that <em>matches</em> that shape (Hill equation, log-linear,
          piecewise) usually beats throwing higher polynomial degrees at it.
          Polynomials wiggle outside the data range; structured models
          extrapolate sensibly.
        </p>
      </section>

      <section>
        <h2>7 · Cautions for clinical use</h2>
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
