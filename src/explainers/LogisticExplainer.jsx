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
  classificationStats,
  rocCurve,
} from '../stats/regression';
import DatasetPicker from '../components/DatasetPicker';
import LogisticPlot from '../components/LogisticPlot';
import ConfusionMatrix from '../components/ConfusionMatrix';
import ROCCurve from '../components/ROCCurve';
import LogisticWorkedExample from '../components/LogisticWorkedExample';
import { InlineMath, BlockMath } from '../components/Math';

function asMathLabel(label) {
  if (!label) return '';
  return label.length <= 1 ? label : `\\mathrm{${label}}`;
}

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
  const [threshold, setThreshold] = useState(0.5);

  const userPredict = (x) => sigmoid(curve.beta0 + curve.beta1 * x);
  const bestPredict = (x) => sigmoid(fit.beta0 + fit.beta1 * x);
  const userLoss = logLoss(points, userPredict);
  const bestLoss = logLoss(points, bestPredict);

  // Use the ML fit for confusion matrix and ROC. That's the "deployed" model;
  // students manipulate the user curve in the earlier section to learn the
  // interaction. (We could also use the user curve, but tying threshold tools
  // to the best-fit model keeps the downstream metrics meaningful.)
  const stats = useMemo(
    () => classificationStats(points, bestPredict, threshold),
    [points, fit, threshold]
  );
  const roc = useMemo(() => rocCurve(points, bestPredict), [points, fit]);

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
          readmitted, we need a model that produces probabilities, not a
          line.
        </p>
      </header>

      <section className="prose">
        <p>
          Most clinical decisions are binary at the moment of action. Does
          this lump need a biopsy? Does this troponin level mean MI? Will
          this antibiotic course succeed? The outcome we care about isn't a
          number on a continuous scale; it's a label, with two values.
          Linear regression handles continuous outcomes; for binary outcomes
          we need <em>logistic regression</em>.
        </p>
        <p>
          Logistic regression keeps the same skeleton as linear regression
          (one input, two parameters, a loss function), but bends the output
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
          the outcome, a base rate of {(baseRate * 100).toFixed(0)}%.
        </p>
      </section>

      <section>
        <h2>Why a straight line doesn't work</h2>
        <p>
          Imagine fitting a regular linear regression to these 0/1 outcomes.
          The fitted line will go where the data centroid is, but its
          predictions are nonsense as probabilities. They go below 0 for
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
          Notice where it crosses outside the dashed [0, 1] band: those
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
        <BlockMath
          math={String.raw`P(y = 1 \mid x) \;=\; \sigma(\beta_0 + \beta_1 x) \;=\; \frac{1}{1 + e^{-(\beta_0 + \beta_1 x)}}`}
        />
        <p>
          Inside the parentheses we still have a familiar straight line,{' '}
          <InlineMath math={String.raw`\beta_0 + \beta_1 x`} />, but the
          sigmoid wrapper bends it smoothly so the output is always between
          0 and 1. <InlineMath math={String.raw`\beta_0`} /> shifts the
          curve left and right;{' '}
          <InlineMath math={String.raw`\beta_1`} /> controls how steeply the
          curve transitions from 0 to 1. A large positive{' '}
          <InlineMath math={String.raw`\beta_1`} /> means the outcome ramps
          up quickly with x; a small{' '}
          <InlineMath math={String.raw`\beta_1`} /> means the curve is
          nearly flat.
        </p>
        <p>
          Use the sliders below to set{' '}
          <InlineMath math={String.raw`\beta_0`} /> (intercept) and{' '}
          <InlineMath math={String.raw`\beta_1`} /> (slope of the linear
          score), or drag the orange curve directly: grab the round handle
          and slide it left/right to shift{' '}
          <InlineMath math={String.raw`\beta_0`} />, or grab the curve
          itself and pull up/down to make the transition steeper or
          shallower. Toggle the maximum-likelihood fit to see what the data
          is actually asking for.
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

        <div className="beta-sliders">
          <div className="beta-slider-row">
            <label htmlFor="beta0-slider" className="beta-label">
              <InlineMath math={String.raw`\beta_0`} /> (intercept)
            </label>
            <input
              id="beta0-slider"
              type="range"
              min={-15}
              max={15}
              step={0.05}
              value={curve.beta0}
              onChange={(e) =>
                setCurve({ ...curve, beta0: parseFloat(e.target.value) })
              }
            />
            <span className="beta-readout">{curve.beta0.toFixed(2)}</span>
          </div>
          <div className="beta-slider-row">
            <label htmlFor="beta1-slider" className="beta-label">
              <InlineMath math={String.raw`\beta_1`} /> (slope)
            </label>
            <input
              id="beta1-slider"
              type="range"
              min={-1}
              max={1}
              step={0.005}
              value={curve.beta1}
              onChange={(e) =>
                setCurve({ ...curve, beta1: parseFloat(e.target.value) })
              }
            />
            <span className="beta-readout">{curve.beta1.toFixed(3)}</span>
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
            <div className="formula-equation">
              <InlineMath
                math={String.raw`P(\text{${dataset.positiveLabel}}) = \sigma\!\left(${curve.beta0.toFixed(2)} ${curve.beta1 >= 0 ? '+' : '-'} ${Math.abs(curve.beta1).toFixed(3)}\,${asMathLabel(dataset.xShort)}\right)`}
              />
            </div>
          </div>
          <div className="formula-card best">
            <div className="formula-label">Maximum-likelihood fit</div>
            <div className="formula-equation">
              <InlineMath
                math={String.raw`P(\text{${dataset.positiveLabel}}) = \sigma\!\left(${fit.beta0.toFixed(2)} ${fit.beta1 >= 0 ? '+' : '-'} ${Math.abs(fit.beta1).toFixed(3)}\,${asMathLabel(dataset.xShort)}\right)`}
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2>How we measure fit: log-loss</h2>
        <p>
          Squared error doesn't behave well when the target is a 0/1 label.
          Logistic regression uses the <strong>log-loss</strong> (or
          cross-entropy):
        </p>
        <BlockMath
          math={String.raw`\mathcal{L}(\beta) \;=\; -\frac{1}{n}\sum_{i=1}^{n}\Bigl[\,y_i \log(p_i) + (1 - y_i)\log(1 - p_i)\,\Bigr]`}
        />
        <p>
          Reading it patient by patient: if the truth is{' '}
          <InlineMath math={String.raw`y = 1`} />, the loss is{' '}
          <InlineMath math={String.raw`-\log(p)`} />, a heavy penalty when{' '}
          <InlineMath math={String.raw`p`} /> is close to 0. If the truth is{' '}
          <InlineMath math={String.raw`y = 0`} />, the loss is{' '}
          <InlineMath math={String.raw`-\log(1 - p)`} />, a heavy penalty
          when <InlineMath math={String.raw`p`} /> is close to 1. The model
          is rewarded for confident correct predictions and punished sharply
          for confident wrong ones, which is exactly what we want from a
          clinical probability estimate.
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
      </section>

      <section>
        <h2>Walk through one prediction</h2>
        <p>
          Pick three patients from the cohort and trace the calculation. Each
          one starts as an{' '}
          <InlineMath math={asMathLabel(dataset.xShort)} /> value, becomes a
          linear score{' '}
          <InlineMath
            math={String.raw`z = \beta_0 + \beta_1 \cdot ${asMathLabel(dataset.xShort)}`}
          />
          , and then a probability via the sigmoid{' '}
          <InlineMath math={String.raw`P = \sigma(z)`} />. The decision step
          compares P to the threshold (default 0.50).
        </p>
        <LogisticWorkedExample
          points={points}
          beta0={fit.beta0}
          beta1={fit.beta1}
          threshold={threshold}
          xShort={dataset.xShort}
          positiveLabel={dataset.positiveLabel}
          negativeLabel={dataset.negativeLabel}
        />
      </section>

      <section>
        <h2>Turning a probability into a decision</h2>
        <p>
          A probability is not yet a decision. Some clinical settings demand a
          low threshold (you'd rather over-call than miss the diagnosis, the{' '}
          <em>screening</em> setting). Others demand a high threshold (acting
          on a positive is invasive or expensive, the{' '}
          <em>confirmation</em> setting). Move
          the slider below; everything updates: the threshold line on the
          curve, who the model labels positive, and the four cells of the
          confusion matrix.
        </p>

        <LogisticPlot
          points={points}
          curve={curve}
          onCurveChange={setCurve}
          fit={fit}
          linearFit={linearFit}
          showFit={true}
          showLinear={false}
          showUserCurve={false}
          threshold={threshold}
          showThreshold={true}
          xLabel={dataset.xLabel}
          yLabel={dataset.yLabel}
          xRange={dataset.xRange}
          positiveLabel={dataset.positiveLabel}
          negativeLabel={dataset.negativeLabel}
        />

        <div className="threshold-row">
          <label htmlFor="threshold-slider" className="threshold-label-text">
            Decision threshold
          </label>
          <input
            id="threshold-slider"
            type="range"
            min={0.05}
            max={0.95}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
          />
          <span className="threshold-readout">t = {threshold.toFixed(2)}</span>
          <div className="threshold-presets">
            <button className="btn" onClick={() => setThreshold(0.2)}>
              screening (0.20)
            </button>
            <button className="btn" onClick={() => setThreshold(0.5)}>
              default (0.50)
            </button>
            <button className="btn" onClick={() => setThreshold(0.8)}>
              confirmation (0.80)
            </button>
          </div>
        </div>

        <ConfusionMatrix
          stats={stats}
          positiveLabel={dataset.positiveLabel}
          negativeLabel={dataset.negativeLabel}
        />

        <p className="caption">
          As you raise the threshold, fewer patients get labelled{' '}
          {dataset.positiveLabel}. Sensitivity drops (you catch fewer true
          cases) but specificity rises (you call fewer healthy patients sick).
          That trade-off is fundamental: there is no threshold that's best
          for every setting.
        </p>
      </section>

      <section>
        <h2>The ROC curve and AUC</h2>
        <p>
          Sweeping the threshold from 1 down to 0 traces a curve through{' '}
          <InlineMath math={String.raw`(\text{FPR},\ \text{TPR})`} /> space.
          That's the receiver operating characteristic, or ROC, curve. A
          model that doesn't discriminate at all sits on the diagonal; a
          perfect model jumps to the top-left corner. The area under the
          curve (AUC) summarises discrimination across all thresholds.
        </p>
        <div className="roc-row">
          <ROCCurve
            roc={roc}
            threshold={threshold}
            onThresholdChange={setThreshold}
          />
          <div className="roc-narration">
            <p>
              <strong>AUC = {roc.auc.toFixed(3)}</strong>: the probability
              that a randomly chosen{' '}
              <span style={{ color: '#dc2626' }}>{dataset.positiveLabel}</span>{' '}
              patient gets a higher score than a randomly chosen{' '}
              <span style={{ color: '#1f6feb' }}>{dataset.negativeLabel}</span>{' '}
              one. 0.5 means coin flip; 1.0 means perfect ranking.
            </p>
            <p>
              The teal dot marks the threshold currently set in the section
              above. Click anywhere on the plot to snap to a different
              threshold and watch the confusion matrix above update.
            </p>
            <p>
              <strong>Clinical context.</strong> AUC is <em>not</em> a
              calibration measure: a model can have an excellent AUC and
              still produce probabilities that don't match observed
              frequencies. For decision-making you usually want both good
              discrimination (AUC) and good calibration (predicted P actually
              matches event rate). We don't dive into calibration here, but
              know it exists.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2>Reading the coefficient: odds ratios</h2>
        <p>
          <InlineMath math={String.raw`\beta_1`} /> in logistic regression has
          a specific clinical meaning. Recall the form:
        </p>
        <BlockMath
          math={String.raw`\log\!\left(\dfrac{P}{1 - P}\right) \;=\; \beta_0 + \beta_1 \cdot ${asMathLabel(dataset.xShort)}`}
        />
        <p>
          The left-hand side is the <strong>log-odds</strong>.{' '}
          <InlineMath math={String.raw`\beta_1`} /> is therefore the change in
          log-odds per one-unit increase in{' '}
          {dataset.xShort.toLowerCase()}. Exponentiating gives the{' '}
          <strong>odds ratio</strong> per unit:
        </p>
        <div className="odds-grid">
          <div className="odds-card">
            <div className="odds-label">
              <InlineMath math={String.raw`\beta_1`} /> (log-odds per{' '}
              {dataset.xUnit})
            </div>
            <div className="odds-value">{fit.beta1.toFixed(3)}</div>
          </div>
          <div className="odds-card">
            <div className="odds-label">odds ratio per {dataset.xUnit}</div>
            <div className="odds-value">{Math.exp(fit.beta1).toFixed(3)}</div>
            <div className="odds-sub">
              <InlineMath math={String.raw`e^{\beta_1}`} />
            </div>
          </div>
          <div className="odds-card">
            <div className="odds-label">odds ratio per 10 {dataset.xUnit}</div>
            <div className="odds-value">{Math.exp(fit.beta1 * 10).toFixed(3)}</div>
            <div className="odds-sub">
              <InlineMath math={String.raw`e^{10\,\beta_1}`} />
            </div>
          </div>
        </div>
        <p className="caption">
          So in this simulated cohort, every additional 1 {dataset.xUnit} of{' '}
          {dataset.xShort.toLowerCase()} multiplies the odds of being{' '}
          {dataset.positiveLabel} by {Math.exp(fit.beta1).toFixed(2)}. A 10 ×{' '}
          {dataset.xUnit} difference multiplies the odds by{' '}
          {Math.exp(fit.beta1 * 10).toFixed(2)}. Odds ratios are how logistic
          coefficients are usually reported in clinical literature.
        </p>
      </section>

      <section>
        <h2>Cautions for clinical use</h2>
        <ul className="caveats">
          <li>
            <strong>The threshold matters more than the AUC.</strong> Every
            deployed model has to commit to a threshold, and that choice
            depends on the costs of false positives vs. false negatives in{' '}
            <em>your</em> setting. Two clinics using the same model can,
            correctly, pick different thresholds.
          </li>
          <li>
            <strong>Class imbalance distorts metrics.</strong> If 5% of
            patients have the outcome, a model that always predicts "no"
            scores 95% accuracy and looks great. Always inspect sensitivity,
            specificity, PPV, and NPV separately, and consider AUC over
            accuracy.
          </li>
          <li>
            <strong>PPV and NPV depend on prevalence.</strong> Sensitivity and
            specificity are properties of the model. PPV and NPV change with
            the population's base rate. A test that looks brilliant in a
            high-prevalence specialist clinic can be useless in low-prevalence
            screening.
          </li>
          <li>
            <strong>Calibration ≠ discrimination.</strong> AUC tells you the
            model can rank cases; it does not tell you the predicted
            probabilities are honest. A model that outputs P = 0.80 should be
            right ≈ 80% of the time. Always plot a calibration curve before
            handing probabilities to clinicians.
          </li>
          <li>
            <strong>One feature is rarely enough.</strong> Real risk scores
            combine many predictors. Logistic regression scales naturally to
            multiple inputs, and the coefficient on each feature is the
            adjusted log-odds, holding the others fixed.
          </li>
          <li>
            <strong>It's a baseline, not the destination.</strong> Logistic
            regression is your null model for binary outcomes: the thing
            every fancier classifier (random forest, gradient boosting,
            neural net) should beat by enough to justify its complexity.
          </li>
        </ul>
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
