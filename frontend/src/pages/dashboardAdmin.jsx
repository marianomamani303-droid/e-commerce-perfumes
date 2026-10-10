import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useResource } from '../hooks/useResource';
import { api, readableError } from '../services/api';
import { money, finalPrice } from '../utils/format';
import { Loading, ErrorState } from '../components/Feedback';
import ProductImage from '../components/ProductImage';
import Icon from '../components/Icon';
function ProductForm({ onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api('/admin/products', { method: 'POST', body: new FormData(form) });
      form.reset();
      setSuccess('Producto publicado en la colección.');
      onSaved();
    } catch (failure) {
      setError(readableError(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="admin-form form-stack" onSubmit={submit}>
      <p className="eyebrow">AMPLIÁ LA COLECCIÓN</p>
      <h2>Una nueva fragancia.</h2>
      <fieldset disabled={busy}>
        <div className="form-grid">
          <label htmlFor="product-name">
            Nombre
            <input
              id="product-name"
              name="nombre"
              maxLength={150}
              required
              placeholder="Nombre del perfume"
            />
          </label>
          <label htmlFor="product-brand">
            Marca
            <input id="product-brand" name="marca" maxLength={100} required />
          </label>
          <label htmlFor="product-category">
            Categoría
            <select id="product-category" name="categoria" required defaultValue="">
              <option disabled value="">
                Elegí una categoría
              </option>
              <option>Femenino</option>
              <option>Masculino</option>
              <option>Unisex</option>
            </select>
          </label>
          <label htmlFor="product-size">
            Presentación
            <input id="product-size" name="tamano" maxLength={50} required placeholder="100 ml" />
          </label>
          <label htmlFor="product-price">
            Precio en ARS
            <input
              id="product-price"
              name="precio"
              type="number"
              min="0.01"
              max="10000000"
              step="0.01"
              required
            />
          </label>
          <label htmlFor="product-offer">
            Descuento (%)
            <input
              id="product-offer"
              name="oferta"
              type="number"
              min="0"
              max="90"
              step="1"
              defaultValue="0"
              required
            />
          </label>
          <label htmlFor="product-stock">
            Stock
            <input
              id="product-stock"
              name="stock"
              type="number"
              min="0"
              max="100000"
              step="1"
              required
            />
          </label>
          <label htmlFor="product-sku">
            SKU
            <input id="product-sku" name="sku" maxLength={80} required />
          </label>
        </div>
        <label htmlFor="product-description">
          Descripción
          <textarea
            id="product-description"
            name="descripcion"
            rows="4"
            maxLength={4000}
            required
            placeholder="Contá cómo se siente esta fragancia…"
          />
        </label>
        <label className="upload-field" htmlFor="product-image">
          <Icon name="box" size={28} />
          <span>Fotografía del producto</span>
          <small>JPG, PNG o WebP · Hasta 5 MB</small>
          <input
            id="product-image"
            type="file"
            name="imagen"
            accept="image/jpeg,image/png,image/webp"
            required
          />
        </label>
      </fieldset>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-success" role="status">
          {success}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? 'Publicando…' : 'Publicar producto'}
        <Icon name="plus" />
      </button>
    </form>
  );
}
function AdminContent() {
  const { data: products, loading, error, reload } = useResource('/admin/products', []);
  const [tab, setTab] = useState('list');
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  async function archive(id) {
    setDeleting(true);
    setActionError('');
    try {
      await api('/admin/products/' + id, { method: 'DELETE', body: {} });
      setConfirmId(null);
      reload();
    } catch (failure) {
      setActionError(readableError(failure));
    } finally {
      setDeleting(false);
    }
  }
  return (
    <main id="main" className="container admin-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">AIRBELL · ADMINISTRACIÓN</p>
          <h1>Cuidá cada detalle.</h1>
        </div>
        <button className="button" onClick={() => setTab('create')}>
          Nuevo producto <Icon name="plus" />
        </button>
      </div>
      <div className="admin-stats">
        <div>
          <span>En la colección</span>
          <strong>{products?.length || 0}</strong>
        </div>
        <div>
          <span>Unidades disponibles</span>
          <strong>{products?.reduce((sum, item) => sum + Number(item.stock), 0) || 0}</strong>
        </div>
        <div>
          <span>Sin stock</span>
          <strong>{products?.filter((item) => !item.stock).length || 0}</strong>
        </div>
      </div>
      <div className="category-tabs admin-tabs">
        <button className={tab === 'list' ? 'selected' : ''} onClick={() => setTab('list')}>
          Colección
        </button>
        <button className={tab === 'create' ? 'selected' : ''} onClick={() => setTab('create')}>
          Agregar fragancia
        </button>
      </div>
      {tab === 'create' ? (
        <ProductForm onSaved={reload} />
      ) : loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : (
        <>
          {actionError && <ErrorState message={actionError} />}
          <div className="admin-product-list">
            {products?.map((product) => (
              <article className="admin-product" key={product.id}>
                <div className="admin-product-image">
                  <ProductImage product={product} />
                </div>
                <div>
                  <p className="eyebrow">{product.marca}</p>
                  <h2>{product.nombre}</h2>
                  <p>
                    {product.sku} · {product.categoria} · {product.tamano}
                  </p>
                </div>
                <div className="admin-product-numbers">
                  <strong>{money(finalPrice(product))}</strong>
                  <span>{product.stock} unidades</span>
                </div>
                <div className="admin-product-action">
                  {confirmId === product.id ? (
                    <>
                      <span>¿Archivar esta fragancia?</span>
                      <button
                        className="button danger"
                        disabled={deleting}
                        onClick={() => archive(product.id)}
                      >
                        {deleting ? 'Archivando…' : 'Confirmar'}
                      </button>
                      <button
                        className="text-button"
                        disabled={deleting}
                        onClick={() => setConfirmId(null)}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button className="text-button" onClick={() => setConfirmId(product.id)}>
                      Archivar
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!products?.length && (
            <div className="empty-state">
              <h2>Tu colección empieza acá.</h2>
              <p>Agregá la primera fragancia para publicarla en la tienda.</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
export default function Dashboard() {
  const { user, authLoading } = useShop();
  if (authLoading)
    return (
      <main id="main">
        <Loading label="Verificando acceso…" />
      </main>
    );
  if (!user) return <Navigate to="/login" state={{ from: '/dashboard' }} replace />;
  if (user.rol !== 'admin') return <Navigate to="/" replace />;
  return <AdminContent />;
}
