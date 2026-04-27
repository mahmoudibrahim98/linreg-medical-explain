import { useEffect, useMemo, useState } from 'react';
import { treeDatasets, generateTreeDataset } from '../data/treeDatasets';
import {
  buildTree,
  treeAccuracy,
  countLeaves,
  maxDepthOf,
} from '../stats/decisionTree';
import DatasetPicker from '../components/DatasetPicker';
import DecisionRegions from '../components/DecisionRegions';
import TreeDiagram from '../components/TreeDiagram';
import { InlineMath, BlockMath } from '../components/Math';

export default function DecisionTreeExplainer() {
  const [datasetId, setDatasetId] = useState(treeDatasets[0].id);
  const dataset = treeDatasets.find((d) => d.id === datasetId);

  const [seed, setSeed] = useState(7);
  const [sampleSize, setSampleSize] = useState(110);
  const points = useMemo(
    () => generateTreeDataset(dataset, seed, sampleSize),
    [dataset, seed, sampleSize]
  );

  const [maxDepth, setMaxDepth] = useState(3);
  const tree = useMemo(() => buildTree(points, maxDepth), [points, maxDepth]);
  const trainAcc = useMemo(() => treeAccuracy(tree, points), [tree, points]);
  const leafCount = useMemo(() => countLeaves(tree), [tree]);
  const realisedDepth = useMemo(() => maxDepthOf(tree), [tree]);

  // For the overfitting demo, also build a deep tree on a small split
  // (fixed for narrative effect).
  const deepTree = useMemo(() => buildTree(points, 12), [points]);
  const deepLeaves = useMemo(() => countLeaves(deepTree), [deepTree]);
  const deepDepth = useMemo(() => maxDepthOf(deepTree), [deepTree]);
  const deepTrainAcc = useMemo(
    () => treeAccuracy(deepTree, points),
    [deepTree, points]
  );

  const positiveCount = points.filter((p) => p.y === 1).length;
  const negativeCount = points.length - positiveCount;
  const baseRate = points.length === 0 ? 0 : positiveCount / points.length;

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
          <em>if HbA1c is above 6.5%, this is diabetes; otherwise check
          fasting glucose; otherwise check oral tolerance;</em> and so on. A{' '}
          <strong>decision tree</strong> learns exactly this kind of rule
          from data. At each step it picks one feature and one threshold,
          splits the patients into two groups, and recurses on each side
          until a stopping rule is hit.
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
        <h2>Splits, regions, and the tree</h2>
        <p>
          The plot on the left shows the patient cohort in the two-feature
          space. Coloured rectangles are the regions the current tree
          assigns to each class. The diagram on the right is the same tree
          drawn as a flowchart: each box asks a yes/no question; the
          coloured leaves give the prediction (red ={' '}
          {dataset.positiveLabel}, blue = {dataset.negativeLabel}).
        </p>
        <p>
          Slide the depth control. At depth 1 the tree gets one question;
          at depth 2 it can ask follow-ups inside each branch; and so on.
          More depth lets the tree carve out more detailed regions, but it
          also lets the tree memorise individual patients. Watch the
          rectangles fragment as you push depth higher.
        </p>

        <div className="tree-row">
          <DecisionRegions
            points={points}
            tree={tree}
            x1Range={dataset.x1Range}
            x2Range={dataset.x2Range}
            x1Label={dataset.x1Label}
            x2Label={dataset.x2Label}
            positiveLabel={dataset.positiveLabel}
            negativeLabel={dataset.negativeLabel}
          />
          <TreeDiagram
            tree={tree}
            featureLabels={{ x1: dataset.x1Short, x2: dataset.x2Short }}
            positiveLabel={dataset.positiveLabel}
            negativeLabel={dataset.negativeLabel}
          />
        </div>

        <div className="tree-controls">
          <div className="depth-row">
            <label htmlFor="tree-depth" className="control-group-label">
              Max depth
            </label>
            <input
              id="tree-depth"
              type="range"
              min={1}
              max={8}
              step={1}
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
            />
            <span className="depth-readout">depth = {maxDepth}</span>
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
          </div>
          <button className="btn" onClick={() => setSeed((s) => s + 1)}>
            New sample
          </button>
        </div>

        <div className="tree-stats">
          <div className="tree-stat">
            <div className="tree-stat-label">leaves</div>
            <div className="tree-stat-value">{leafCount}</div>
          </div>
          <div className="tree-stat">
            <div className="tree-stat-label">realised depth</div>
            <div className="tree-stat-value">{realisedDepth}</div>
          </div>
          <div className="tree-stat">
            <div className="tree-stat-label">training accuracy</div>
            <div className="tree-stat-value">
              {(trainAcc * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <p className="caption">
          <strong>How the splits are chosen.</strong> At every node the
          algorithm scans every feature and every candidate threshold,
          picking the split that maximally separates the two classes. The
          standard separation measure is the <em>Gini impurity</em> of the
          resulting groups, defined next.
        </p>
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
          improvement is the original{' '}
          <InlineMath math={String.raw`G`} /> minus the size-weighted average
          of the two children's <InlineMath math={String.raw`G`} />:
        </p>
        <BlockMath
          math={String.raw`\Delta G \;=\; G_{\text{parent}} - \frac{n_L}{n}\,G_L - \frac{n_R}{n}\,G_R`}
        />
        <p>
          The chosen split is the one with the largest{' '}
          <InlineMath math={String.raw`\Delta G`} />. Look at the tree
          diagram above and you will see Gini values printed inside each
          internal node.
        </p>
      </section>

      <section>
        <h2>Letting the tree go too deep</h2>
        <p>
          Set the max-depth slider near the top and watch the rectangles
          fragment until almost every patient gets their own little
          territory. Training accuracy rises toward 100%, but the tree is
          increasingly memorising idiosyncrasies of <em>this</em> cohort
          rather than learning a generalisable rule. New patients drawn
          from the same population will not respect those tiny
          boundaries.
        </p>

        <div className="tree-row">
          <DecisionRegions
            points={points}
            tree={deepTree}
            x1Range={dataset.x1Range}
            x2Range={dataset.x2Range}
            x1Label={dataset.x1Label}
            x2Label={dataset.x2Label}
            positiveLabel={dataset.positiveLabel}
            negativeLabel={dataset.negativeLabel}
          />
          <div className="overfit-narration">
            <p>
              <strong>Unconstrained tree (depth ≤ 12):</strong>
            </p>
            <ul className="overfit-stats">
              <li>realised depth: <strong>{deepDepth}</strong></li>
              <li>leaves: <strong>{deepLeaves}</strong></li>
              <li>
                training accuracy:{' '}
                <strong>{(deepTrainAcc * 100).toFixed(1)}%</strong>
              </li>
            </ul>
            <p>
              The boundary now follows individual points; this is exactly
              the regime where a held-out test set will look much worse
              than the training accuracy suggests. In practice trees are
              regularised by limiting depth, requiring a minimum number of
              patients in each leaf, or pruning back after building. The
              generalisation problem is also why ensemble methods (random
              forests, gradient boosting) often outperform a single tree:
              they average over many noisy trees to cancel the
              memorisation.
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
          Built for the AI in Medicine course. Data is simulated; clinical
          parameters are illustrative, not validated.
        </p>
      </footer>
    </div>
  );
}
