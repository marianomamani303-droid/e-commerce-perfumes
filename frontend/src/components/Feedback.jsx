import Icon from './Icon';
export function ErrorState({ message, retry }) {
  return (
    <div className="feedback error" role="alert">
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Volver a intentar <Icon name="arrow" />
        </button>
      )}
    </div>
  );
}
export function Loading({ label = 'Cargando…' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}
export function Skeletons() {
  return (
    <div className="product-grid" aria-label="Cargando perfumes" role="status">
      {[1, 2, 3, 4].map((id) => (
        <div className="skeleton-card" key={id}>
          <div className="skeleton image" />
          <div className="skeleton line" />
          <div className="skeleton line short" />
        </div>
      ))}
    </div>
  );
}
