import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useResource } from '../hooks/useResource';
import { useShop } from '../context/ShopContext';
import { DEMO_MODE } from '../services/api';
import { demoProducts } from '../data/demo';
import { money, finalPrice } from '../utils/format';
import ProductImage from '../components/ProductImage';
import Icon from '../components/Icon';
import { ErrorState, Loading } from '../components/Feedback';
function ProductContent({ product }) {
  const { add } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  async function buy() {
    setBusy(true);
    try {
      await add(product, quantity);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <nav className="breadcrumbs" aria-label="Ruta de navegación">
        <Link to="/">Inicio</Link>
        <span>/</span>
        <Link to="/#catalogo">Colección</Link>
        <span>/</span>
        <span>{product.nombre}</span>
      </nav>
      <div className="product-detail">
        <div className={'detail-visual' + (product.demo ? ' demo-product' : '')}>
          <ProductImage product={product} eager />
          {product.oferta > 0 && <span className="product-tag">−{product.oferta}%</span>}
        </div>
        <section className="detail-content">
          <p className="eyebrow">{product.marca}</p>
          <h1>{product.nombre}</h1>
          <p className="detail-category">
            {product.categoria} <span>·</span> {product.tamano}
          </p>
          <div className="detail-price">
            <strong>{money(finalPrice(product))}</strong>
            {product.oferta > 0 && <del>{money(product.precio)}</del>}
          </div>
          <p className="detail-description">{product.descripcion}</p>
          <div className="size-option">
            <span>Presentación</span>
            <strong>{product.tamano}</strong>
          </div>
          <p className={'stock-message' + (!product.stock ? ' sold-out' : '')}>
            <span />
            {product.stock > 0
              ? 'Disponible · ' + product.stock + ' unidades'
              : 'Sin stock por el momento'}
          </p>
          <div className="detail-buy">
            <div className="quantity-control">
              <button
                aria-label="Reducir cantidad"
                disabled={quantity <= 1 || busy}
                onClick={() => setQuantity((x) => x - 1)}
              >
                <Icon name="minus" size={16} />
              </button>
              <output aria-label="Cantidad">{quantity}</output>
              <button
                aria-label="Aumentar cantidad"
                disabled={quantity >= Math.min(product.stock, 99) || busy}
                onClick={() => setQuantity((x) => x + 1)}
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
            <button className="button" disabled={!product.stock || busy || DEMO_MODE} onClick={buy}>
              {busy
                ? 'Agregando…'
                : DEMO_MODE
                  ? 'Vista de demostración'
                  : !product.stock
                    ? 'Sin stock'
                    : 'Agregar a mi selección'}
              <Icon name="bag" />
            </button>
          </div>
          <p className="detail-payment">
            <Icon name="shield" size={18} /> Pagá a través de Mercado Pago.
          </p>
          <details className="product-accordion" open>
            <summary>Detalles de la fragancia</summary>
            <dl>
              <div>
                <dt>Marca</dt>
                <dd>{product.marca}</dd>
              </div>
              <div>
                <dt>Categoría</dt>
                <dd>{product.categoria}</dd>
              </div>
              <div>
                <dt>Presentación</dt>
                <dd>{product.tamano}</dd>
              </div>
              <div>
                <dt>Referencia</dt>
                <dd>{product.sku}</dd>
              </div>
            </dl>
          </details>
        </section>
      </div>
    </>
  );
}
function LiveProduct({ id }) {
  const { data, loading, error, reload } = useResource('/products/' + encodeURIComponent(id));
  if (loading) return <Loading label="Descubriendo tu próxima fragancia…" />;
  if (error) return <ErrorState message={error} retry={reload} />;
  return <ProductContent key={id} product={data} />;
}
export default function ProductPage() {
  const { id } = useParams();
  const product = DEMO_MODE ? demoProducts.find((item) => item.id === Number(id)) : null;
  return (
    <main id="main" className="container product-page">
      {DEMO_MODE ? (
        product ? (
          <ProductContent key={id} product={product} />
        ) : (
          <ErrorState message="No encontramos ese perfume." />
        )
      ) : (
        <LiveProduct key={id} id={id} />
      )}
    </main>
  );
}
