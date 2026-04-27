import { useEffect, useMemo, useState } from 'react';
import {
  binaryDatasets,
  generateBinaryDataset,
} from '../data/binaryDatasets';
import {
  fitLogistic,
  logLoss,
  sigmoid,
  fitOLS,
} from '../stats/regression';
import DatasetPicker from '../components/DatasetPicker';
import LogisticPlot from '../components/LogisticPlot';

function defaultStartLogit() {
  // A flat-ish starting curve so students see something obviously suboptimal.
  return { beta0: 0, beta1: 0.05 };
}

export default function LogisticExplainer() {
  const [datasetId, setDatasetId] = useState(binaryDatasets[0].id);
  const dataset = binaryDatasets.find((d) => d.id === datasetId);

  const [seed, setSeed] = useState(11);
  const [sampleSize, setSampleSize] = useState(80);
  const points = useMemo(
    () => generateBinaryDataset(dataset, seed, sampleSize),
    [dataset, seed, sampleSize]
  );

  const fit = useMemo(() => fitLogistic(points), [points]);
  const linearFit = useMemo(() => fitOLS(points), [points]);

  const [curve, setCurve] = useState(() => defaultStartLogit());

  useEffect(() => {
    setCurve(defaultStartLogit());
  }, [datasetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [showFit, setShowFit] = useState(false);
  const [showLinear, setShowLinear] = useState(false);

  const userLoss = logLoss(points, (x) => sigmoid(curve.beta0 + curve.beta1 * x));
  const bestLoss = logLoss(points, (x) => sigmoid(fit.beta0 + fit.beta1 * x));

  const positiveCount = points.filter((p) => p.y === 1).length;
  const negativeCount = points.length - positiveCount;
  const baseRate = points.length === 0 ? 0 : positiveCount / points.length;

  return (
    <div className="app">
      <header className="hero">
        <div className="kicker">AI in Medicine · Interactive primer</div>
        <h1>Logistic Regression for Binary Decisions</h1>
        <p className="subtitle">
          From "how much" to "yes or no": when the question is whether a
          patient has the disease, will respond to treatment, or will be
          readmitted, we need a model that produces probabilities — not a
          line.
        </p>
      </header>

      <section className="prose">
        <p>
          Most clinical decisions are binary at the moment of action. Does
          this lump need a biopsy? Does this troponin level mean MI? Will
          this antibiotic course succeed? The outcome we care about isn't a
          number on a continuous scale — it's a label, with two values.
          Linear regression handles continuous outcomes; for binary outcomes
          we need <em>logistic regression</em>.
        </p>
        <p>
          Logistic regression keeps the same skeleton as linear regression —
          one input, two parameters, a loss function — but bends the output
          through a curve that always lands between 0 and 1, so we can read
          it as a probability. Once we have a probability, a clinician picks
          a <em>threshold</em> at which to act. Choosing that threshold is
          one of the most important decisions in medical AI, and we'll spend
          a section on it.
        </p>
      </section>

      <section className="picker-section">
        <h2>Pick a clinical scenario</h2>
        <DatasetPicker
          datasets={binaryDatasets}
          value={datasetId}
          onChange={setDatasetId}
        />
        <p className="dataset-desc">{dataset.description}</p>
        <p className="clinical-note">
          <strong>Clinical caveat:</strong> {dataset.clinicalNote}
        </p>
        <p className="data-note">
          Each circle is one patient. Patients with the outcome present
          ({dataset.positiveLabel}) are stacked along y = 1; without
          ({dataset.negativeLabel}), along y = 0. In this simulated cohort,{' '}
          <strong>{positiveCount}</strong> of {points.length} patients have
          the outcome — a base rate of {(baseRate * 100).toFixed(0)}%.
        </p>
      </section>

      <section>
        <h2>Why a straight line doesn't work</h2>
        <p>
          Imagine fitting a regular linear regression to these 0/1 outcomes.
          The fitted line will go where the data centroid is, but its
          predictions are nonsense as probabilities — they go below 0 for
          low-risk patients and above 1 for high-risk patients. The line
          can't bend, so it leaks out of the [0, 1] range that probabilities
          must live in.
        </p>
        <LogisticPlot
          points={points}
          curve={curve}
          onCurveChange={setCurve}
          fit={fit}
          linearFit={linearFit}
          showFit={false}
          showLinear={true}
          showUserCurve={false}
          xLabel={dataset.xLabel}
          yLabel={dataset.yLabel}
          xRange={dataset.xRange}
          positiveLabel={dataset.positiveLabel}
          negativeLabel={dataset.negativeLabel}
        />
        <p className="caption">
          The orange line is the least-squares fit treating outcomes as 0/1.
          Notice where it crosses outside the dashed [0, 1] band — those
          regions correspond to "predicted probabilities" that are either
          negative or greater than 1. Useless for clinical reasoning.
        </p>
      </section>

      <section>
        <h2>The logistic (sigmoid) curve</h2>
        <p>
          The fix is to wrap the linear part inside a function that squashes
          any number to (0, 1). The standard choice is the{' '}
          <strong>logistic</strong> (or <em>sigmoid</em>) function:
        </p>
        <p className="eq-block">
          P(y = 1 | x) = σ(β₀ + β₁ · x) = 1 / (1 + exp(−(β₀ + β₁ · x)))
        </p>
        <p>
          Inside the parentheses we still have a familiar straight line —{' '}
          <span className="eq">β₀ + β₁·x</span> — but the σ wrapper bends it
          smoothly so the output is always between 0 and 1. β₀ shifts the
          curve left and right; β₁ controls how steeply the curve transitions
          from 0 to 1. A large positive β₁ means the outcome ramps up quickly
          with x; a small β₁ means the curve is nearly flat.
        </p>
        <p>
          Drag the curve below to feel it: grab the middle to slide the whole
          thing left/right (changes β₀), grab either end to make the
          transition steeper or shallower (changes β₁). Toggle the maximum-
          likelihood fit to see what the data is actually asking for.
        </p>

        <LogisticPlot
          points={points}
          curve={curve}
          onCurveChange={setCurve}
          fit={fit}
          linearFit={linearFit}
          showFit={showFit}
          showLinear={false}
          showUserCurve={true}
          xLabel={dataset.xLabel}
          yLabel={dataset.yLabel}
          xRange={dataset.xRange}
          positiveLabel={dataset.positiveLabel}
          negativeLabel={dataset.negativeLabel}
        />
        <div className="controls">
          <label>
            <input
              type="checkbox"
              checked={showFit}
              onChange={(e) => setShowFit(e.target.checked)}
            />
            <span className="swatch swatch-best" /> Show maximum-likelihood fit
          </label>
          <div className="control-actions">
            <button
              className="btn primary"
              onClick={() => setCurve({ beta0: fit.beta0, beta1: fit.beta1 })}
            >
              Snap to best fit
            </button>
            <button
              className="btn"
              onClick={() => setCurve(defaultStartLogit())}
            >
              Reset curve
            </button>
            <button className="btn" onClick={() => setSeed((s) => s + 1)}>
              New sample
            </button>
          </div>
        </div>

        <div className="sample-size-row">
          <label htmlFor="logistic-n" className="sample-size-label">
            Cohort size
          </label>
          <input
            id="logistic-n"
            type="range"
            min={10}
            max={300}
            step={1}
            value={sampleSize}
            onChange={(e) => setSampleSize(parseInt(e.target.value, 10))}
          />
          <span className="sample-size-readout">
            n = {sampleSize} patient{sampleSize === 1 ? '' : 's'}
          </span>
        </div>

        <div className="formula-grid" style={{ marginTop: 18 }}>
          <div className="formula-card user">
            <div className="formula-label">Your curve</div>
            <span className="equation">
              <span className="lhs">P({dataset.positiveLabel})</span>
              <span className="op">=</span>
              <span className="op">σ(</span>
              <span className="param">{curve.beta0.toFixed(2)}</span>
              <span className="op">+</span>
              <span className="param">{curve.beta1.toFixed(3)}</span>
              <span className="op">×</span>
              <span className="var">{dataset.xShort}</span>
              <span className="op">)</span>
            </span>
          </div>
          <div className="formula-card best">
            <div className="formula-label">Maximum-likelihood fit</div>
            <span className="equation">
              <span className="lhs">P({dataset.positiveLabel})</span>
              <span className="op">=</span>
              <span className="op">σ(</span>
              <span className="param">{fit.beta0.toFixed(2)}</span>
              <span className="op">+</span>
              <span className="param">{fit.beta1.toFixed(3)}</span>
              <span className="op">×</span>
              <span className="var">{dataset.xShort}</span>
              <span className="op">)</span>
            </span>
          </div>
        </div>
      </section>

      <section>
        <h2>How we measure fit — log-loss</h2>
        <p>
          Squared error doesn't behave well when the target is a 0/1 label.
          Logistic regression uses the <strong>log-loss</strong> (or
          cross-entropy):
        </p>
        <p className="eq-block">
          L(β) = − (1/n) · Σ [ y<sub>i</sub> · log(p<sub>i</sub>) +
          (1 − y<sub>i</sub>) · log(1 − p<sub>i</sub>) ]
        </p>
        <p>
          Reading it patient by patient: if the truth is y = 1, the loss is{' '}
          <span className="eq">−log(p)</span> — a heavy penalty when p is
          close to 0. If the truth is y = 0, the loss is{' '}
          <span className="eq">−log(1 − p)</span> — a heavy penalty when p is
          close to 1. The model is rewarded for confident correct predictions
          and punished sharply for confident wrong ones — clinically what we
          want from a probability estimate.
        </p>
        <div className="loss-row" style={{ marginTop: 12 }}>
          <div className="metric-col user" style={{ minWidth: 240 }}>
            <h3>Your curve</h3>
            <div className="metric-row">
              <span className="metric-label">log-loss</span>
              <span className="metric-value">{userLoss.toFixed(3)}</span>
            </div>
          </div>
          <div className="metric-col best" style={{ minWidth: 240 }}>
            <h3>Maximum-likelihood fit</h3>
            <div className="metric-row">
              <span className="metric-label">log-loss</span>
              <span className="metric-value">{bestLoss.toFixed(3)}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">improvement vs. yours</span>
              <span className="metric-value">
                {(userLoss - bestLoss).toFixed(3)}
              </span>
            </div>
          </div>
        </div>
        <p className="caption">
          Coming next (in the next section we'll add): a confusion matrix
          you can move with a threshold slider, an ROC curve with AUC, and
          how to read the coefficient β₁ as an odds ratio.
        </p>
      </section>

      <footer className="footer">
        <p>
          Built for the AI in Medicine course. Data is simulated; clinical
          parameters are illustrative, not validated.
        </p>
      </footer>
    </div>
  );
}
