export default function DatasetPicker({ datasets, value, onChange }) {
  return (
    <div className="dataset-picker" role="tablist">
      {datasets.map((d) => (
        <button
          key={d.id}
          role="tab"
          aria-selected={value === d.id}
          className={`dataset-tab${value === d.id ? ' active' : ''}`}
          onClick={() => onChange(d.id)}
        >
          {d.short}
        </button>
      ))}
    </div>
  );
}
