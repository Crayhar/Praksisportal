export default function Spinner({ label = 'Laster...' }) {
  return (
    <div className="spinner-wrapper" role="status" aria-label={label}>
      <div className="spinner" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
