import { useEffect, useMemo, useState } from 'react';
import { treeDatasets, generateTreeDataset } from '../data/treeDatasets';
import {
  buildTree,
  treeAccuracy,
  countLeaves,
  maxDepthOf,
  enumerateSplits,
  truncateTree,
} from '../stats/decisionTree';
import DatasetPicker from '../components/DatasetPicker';
import DecisionRegions from '../components/DecisionRegions';
import TreeDiagram from '../components/TreeDiagram';
import { InlineMath, BlockMath } from '../components/Math';

// BFS-tag every node in the tree with a stable __id so the truncated tree
// can refer back to which split is currently the latest.
function annotateTree(tree) {
  if (!tree) return tree;
  let id = 0;
  const queue = [tree];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    node.__id = id++;
    if (node.type === 'split') queue.push(node.left, node.right);
  }
  return tree;
}

function pct(n, d) {
  if (!d) return '0%';
  return `${Math.round((n / d) * 100)}%`;
}

export default function DecisionTreeExplainer() {
  const [datasetId, setDatasetId] = useState(treeDatasets[0].id);
  const dataset = treeDatasets.find((d) => d.id === datasetId);

  const [seed, setSeed] = useState(7);
  const [sampleSize, setSampleSize] = useState(110);
  const points = useMemo(
    () => generateTreeDataset(dataset, seed, sampleSize),
    [dataset, seed, sampleSize]
  );

  // Build a moderately-deep tree once; the build-step slider then exposes
  // it incrementally. Depth 3 keeps the tree readable at full content
  // width while still illustrating multi-level splits.
  const BUILD_DEPTH = 3;
  const fullTree = useMemo(() => {
    const t = buildTree(points, BUILD_DEPTH);
    annotateTree(t);
    return t;
  }, [points]);
  const splits = useMemo(() => enumerateSplits(fullTree), [fullTree]);

  const [step, setStep] = useState(1);
  // Reset / clamp the step when the dataset or sample changes.
  useEffect(() => {
    setStep(Math.min(1, splits.length));
  }, [datasetId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setStep((s) => Math.min(s, splits.length));
  }, [splits.length]);

  const partialTree = useMemo(
    () => truncateTree(fullTree, step),
    [fullTree, step]
  );
  const currentSplit = step > 0 ? splits[step - 1] : null;
  const partialAcc = useMemo(
    () => treeAccuracy(partialTree, points),
    [partialTree, points]
  );
  const partialLeaves = useMemo(() => countLeaves(partialTree), [partialTree]);

  // Overfitting demo: independent max-depth slider.
  const [overfitDepth, setOverfitDepth] = useState(8);
  const overfitTree = useMemo(
    () => buildTree(points, overfitDepth),
    [points, overfitDepth]
  );
  const overfitLeaves = useMemo(() => countLeaves(overfitTree), [overfitTree]);
  const overfitDepthRealised = useMemo(
    () => maxDepthOf(overfitTree),
    [overfitTree]
  );
  const overfitAcc = useMemo(
    () => treeAccuracy(overfitTree, points),
    [overfitTree, points]
  );

  const positiveCount = points.filter((p) => p.y === 1).length;
  const baseRate = points.length === 0 ? 0 : positiveCount / points.length;

  // Build the narration for the current step.
  const featLabel = currentSplit
    ? currentSplit.feature === 'x1'
      ? dataset.x1Short
      : dataset.x2Short
    : null;
  const featUnit = currentSplit
    ? currentSplit.feature === 'x1'
      ? dataset.x1Unit
      : dataset.x2Unit
    : null;

  return (
    <div className="app">
      <header className="hero">
        <div className="kicker">AI in Medicine · Interactive primer</div>
        <h1>Decision Trees, the Clinical-Reasoning Model</h1>
        <p className="subtitle">
          Trees split feature space with a sequence of yes/no questions, the
          way clinicians often think out loud. They are the easiest model
          class to read, and the building block of random forests and
          gradient boosting.
        </p>
      </header>

      <section className="prose">
        <p>
          Most clinical decisions follow a <em>chain of conditions</em>:{' '}
          <em>
            if HbA1c is above 6.5%, this is diabetes; otherwise check
            fasting glucose; otherwise check oral tolerance;
          </em>{' '}
          and so on. A <strong>decision tree</strong> learns exactly this
          kind of rule from data. At each step it picks one feature and one
          threshold, splits the patients into two groups, and recurses on
          each side until a stopping rule is hit.
        </p>
        <p>
          Two things make trees attractive in medicine: they are easy to
          explain (you can hand a clinician the rules and they will
          recognise the shape), and they handle non-linear interactions
          between features without any feature engineering. The price they
          pay is brittleness, and a tendency to overfit if you let them grow
          too deep. Both points show up below.
        </p>
      </section>

      <section className="picker-section">
        <h2>Pick a clinical scenario</h2>
        <DatasetPicker
          datasets={treeDatasets}
          value={datasetId}
          onChange={setDatasetId}
        />
        <p className="dataset-desc">{dataset.description}</p>
        <p className="clinical-note">
          <strong>Clinical caveat:</strong> {dataset.clinicalNote}
        </p>
        <p className="data-note">
          Each circle is one patient. Red = {dataset.positiveLabel}, blue ={' '}
          {dataset.negativeLabel}. In this simulated cohort,{' '}
          <strong>{positiveCount}</strong> of {points.length} patients have
          the outcome, a base rate of {(baseRate * 100).toFixed(0)}%.
        </p>
      </section>

      <section>
        <h2>Building a tree, one split at a time</h2>
        <p>
          A decision tree is built greedily. At each step the algorithm
          looks at every leaf, tries every feature and every candidate
          threshold, and picks the single split that most reduces impurity
          (defined in the next section). Use the controls below to step
          through the build, one split at a time. Each step shows you which
          split was chosen and why.
        </p>

        <div className="build-step-row">
          <button
            className="btn"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            ← previous
          </button>
          <input
            type="range"
            min={0}
            max={splits.length}
            step={1}
            value={step}
            onChange={(e) => setStep(parseInt(e.target.value, 10))}
            className="build-step-slider"
            aria-label="build step"
          />
          <span className="build-step-readout">
            step {step} of {splits.length}
          </span>
          <button
            className="btn"
            disabled={step === splits.length}
            onClick={() => setStep((s) => Math.min(splits.length, s + 1))}
          >
            next →
          </button>
          <button
            className="btn primary"
            onClick={() => setStep(splits.length)}
          >
            build all
          </button>
          <button className="btn" onClick={() => setStep(0)}>
            reset
          </button>
        </div>

        <div className="tree-narration-row">
          <DecisionRegions
            points={points}
            tree={partialTree}
            x1Range={dataset.x1Range}
            x2Range={dataset.x2Range}
            x1Label={dataset.x1Label}
            x2Label={dataset.x2Label}
            positiveLabel={dataset.positiveLabel}
            negativeLabel={dataset.negativeLabel}
          />
          <div className="step-narration">
            {step === 0 ? (
              <>
                <div className="step-title">
                  Starting point: all patients in one bucket
                </div>
                <p>
                  Before the algorithm picks any split, the whole cohort
                  sits in a single leaf. The "model" predicts the majority
                  class for everyone:
                </p>
                <ul className="step-detail-list">
                  <li>
                    <strong>n = {fullTree.n}</strong> patients in this leaf
                  </li>
                  <li>
                    <strong>{fullTree.pos}</strong> positive (
                    {dataset.positiveLabel}) /{' '}
                    <strong>{fullTree.n - fullTree.pos}</strong> negative (
                    {dataset.negativeLabel})
                  </li>
                  <li>
                    Gini impurity:{' '}
                    <InlineMath
                      math={String.raw`G = ${fullTree.gini.toFixed(3)}`}
                    />
                  </li>
                </ul>
                <p>
                  Use <em>next →</em> to apply the first split and watch
                  the feature space carve up.
                </p>
              </>
            ) : (
              <>
                <div className="step-title">
                  Split {step} of {splits.length}:{' '}
                  <span className="step-rule">
                    <InlineMath
                      math={String.raw`\mathrm{${featLabel}} \le ${currentSplit.threshold.toFixed(1)}`}
                    />
                    {featUnit ? ` ${featUnit}` : ''}
                  </span>
                </div>
                <p>
                  The algorithm scanned every feature and every candidate
                  threshold and picked this one because it gave the
                  largest reduction in Gini impurity. The split takes a
                  leaf with <strong>n = {currentSplit.n}</strong> patients
                  (gini = {currentSplit.gini.toFixed(3)}) and divides it
                  into:
                </p>
                <ul className="step-detail-list">
                  <li>
                    <span className="branch-tag yes">yes</span>{' '}
                    <InlineMath
                      math={String.raw`\mathrm{${featLabel}} \le ${currentSplit.threshold.toFixed(1)}`}
                    />
                    : <strong>n = {currentSplit.left.n}</strong>,{' '}
                    {currentSplit.left.pos}/{currentSplit.left.n} (
                    {pct(currentSplit.left.pos, currentSplit.left.n)}){' '}
                    {dataset.positiveLabel}, gini ={' '}
                    {currentSplit.left.gini.toFixed(3)}
                  </li>
                  <li>
                    <span className="branch-tag no">no</span>{' '}
                    <InlineMath
                      math={String.raw`\mathrm{${featLabel}} > ${currentSplit.threshold.toFixed(1)}`}
                    />
                    : <strong>n = {currentSplit.right.n}</strong>,{' '}
                    {currentSplit.right.pos}/{currentSplit.right.n} (
                    {pct(currentSplit.right.pos, currentSplit.right.n)}){' '}
                    {dataset.positiveLabel}, gini ={' '}
                    {currentSplit.right.gini.toFixed(3)}
                  </li>
                  <li>
                    Gini reduction:{' '}
                    <InlineMath
                      math={String.raw`\Delta G = ${currentSplit.gain.toFixed(3)}`}
                    />
                  </li>
                </ul>
                <p>
                  On the plot above, the freshly created boundary is the
                  new rectangle edge. On the tree diagram below, the
                  highlighted box is the split that just fired.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="tree-fullwidth">
          <TreeDiagram
            tree={partialTree}
            highlightNodeId={currentSplit ? currentSplit.__id : null}
            featureLabels={{ x1: dataset.x1Short, x2: dataset.x2Short }}
            positiveLabel={dataset.positiveLabel}
            negativeLabel={dataset.negativeLabel}
            width={1000}
            height={420}
          />
        </div>

        <div className="tree-stats">
          <div className="tree-stat">
            <div className="tree-stat-label">leaves</div>
            <div className="tree-stat-value">{partialLeaves}</div>
          </div>
          <div className="tree-stat">
            <div className="tree-stat-label">splits applied</div>
            <div className="tree-stat-value">{step}</div>
          </div>
          <div className="tree-stat">
            <div className="tree-stat-label">training accuracy</div>
            <div className="tree-stat-value">
              {(partialAcc * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="sample-size-row">
          <label htmlFor="tree-n" className="sample-size-label">
            Cohort size
          </label>
          <input
            id="tree-n"
            type="range"
            min={20}
            max={300}
            step={1}
            value={sampleSize}
            onChange={(e) => setSampleSize(parseInt(e.target.value, 10))}
          />
          <span className="sample-size-readout">
            n = {sampleSize} patient{sampleSize === 1 ? '' : 's'}
          </span>
          <button
            className="btn"
            onClick={() => setSeed((s) => s + 1)}
            style={{ marginLeft: 'auto' }}
          >
            new sample
          </button>
        </div>
      </section>

      <section>
        <h2>Picking the best split: Gini impurity</h2>
        <p>
          For a group of patients with positive proportion{' '}
          <InlineMath math={String.raw`p`} />, the Gini impurity is
        </p>
        <BlockMath
          math={String.raw`G \;=\; 1 - p^2 - (1 - p)^2 \;=\; 2\,p\,(1 - p)`}
        />
        <p>
          A pure group (all positive or all negative) has{' '}
          <InlineMath math={String.raw`G = 0`} />; a 50-50 mix has{' '}
          <InlineMath math={String.raw`G = 0.5`} />, the maximum. When the
          algorithm splits a node into a left and right group, the
          improvement is the parent's <InlineMath math={String.raw`G`} />{' '}
          minus the size-weighted average of the two children's{' '}
          <InlineMath math={String.raw`G`} />:
        </p>
        <BlockMath
          math={String.raw`\Delta G \;=\; G_{\text{parent}} - \frac{n_L}{n}\,G_L - \frac{n_R}{n}\,G_R`}
        />
        <p>
          The chosen split is the one with the largest{' '}
          <InlineMath math={String.raw`\Delta G`} />. Each step of the build
          interaction above prints exactly these numbers.
        </p>
      </section>

      <section>
        <h2>Letting the tree go too deep</h2>
        <p>
          Push the max-depth slider toward the top and watch the rectangles
          fragment until almost every patient gets their own little
          territory. Training accuracy rises toward 100%, but the tree is
          increasingly memorising idiosyncrasies of <em>this</em> cohort
          rather than learning a generalisable rule. New patients drawn
          from the same population will not respect those tiny boundaries.
        </p>

        <div className="depth-row" style={{ marginTop: 0 }}>
          <label htmlFor="overfit-depth" className="control-group-label">
            Max depth
          </label>
          <input
            id="overfit-depth"
            type="range"
            min={1}
            max={12}
            step={1}
            value={overfitDepth}
            onChange={(e) => setOverfitDepth(parseInt(e.target.value, 10))}
          />
          <span className="depth-readout">depth = {overfitDepth}</span>
        </div>

        <div className="tree-row">
          <DecisionRegions
            points={points}
            tree={overfitTree}
            x1Range={dataset.x1Range}
            x2Range={dataset.x2Range}
            x1Label={dataset.x1Label}
            x2Label={dataset.x2Label}
            positiveLabel={dataset.positiveLabel}
            negativeLabel={dataset.negativeLabel}
          />
          <div className="overfit-narration">
            <p>
              <strong>Tree at max depth = {overfitDepth}:</strong>
            </p>
            <ul className="overfit-stats">
              <li>
                realised depth: <strong>{overfitDepthRealised}</strong>
              </li>
              <li>
                leaves: <strong>{overfitLeaves}</strong>
              </li>
              <li>
                training accuracy:{' '}
                <strong>{(overfitAcc * 100).toFixed(1)}%</strong>
              </li>
            </ul>
            <p>
              Once the boundary starts following individual points, a held-
              out test set will look much worse than the training accuracy
              suggests. In practice trees are regularised by limiting depth,
              requiring a minimum number of patients in each leaf, or
              pruning back after building. The generalisation problem is
              also why ensemble methods (random forests, gradient boosting)
              often outperform a single tree: they average over many noisy
              trees to cancel the memorisation.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2>Cautions for clinical use</h2>
        <ul className="caveats">
          <li>
            <strong>One tree is unstable.</strong> Resample the cohort and
            the tree can rearrange itself completely, even when the
            underlying relationships are stable. Use ensembles (random
            forests, gradient boosting) when you care about predictive
            performance, not interpretability.
          </li>
          <li>
            <strong>Trees produce piecewise-constant probabilities.</strong>{' '}
            Every patient inside a leaf gets the same predicted probability.
            A tree often gives only a handful of distinct probability
            values, which is poor calibration material for clinical
            decisions that need fine probability gradations.
          </li>
          <li>
            <strong>Greedy splits miss interactions.</strong> A tree picks
            the locally best split, not the globally best pair of splits.
            Two features that matter only in combination can be hidden from
            a shallow tree because neither one looks useful on its own.
          </li>
          <li>
            <strong>Class imbalance and cost.</strong> With rare outcomes
            the default Gini split will favour the majority class. Class
            weighting and threshold tuning matter as much here as in
            logistic regression.
          </li>
          <li>
            <strong>Interpretability is a feature, not the truth.</strong>{' '}
            A tree's rules are easy to read, but that does not make them
            causal. Confounding still applies; the rule "if BP is high,
            predict event" tells you nothing about whether lowering BP
            would prevent the event.
          </li>
          <li>
            <strong>It's a baseline.</strong> A single tree is your
            interpretable null model for classification problems with
            non-linear interactions. Anything fancier (RF, XGBoost, neural
            net) should beat it by enough to justify the loss of
            interpretability.
          </li>
        </ul>
      </section>

      <footer className="footer">
        <p>
          By <strong>Mahmoud Ibrahim</strong> for the AI in Medicine course.
          Data is simulated; clinical parameters are illustrative, not
          validated.
        </p>
      </footer>
    </div>
  );
}
