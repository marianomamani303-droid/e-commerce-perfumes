import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { money, finalPrice } from '../utils/format';
import { DEMO_MODE } from '../services/api';
import ProductImage from './ProductImage';
import Icon from './Icon';
export default function ProductCard({ product }) {
  const { add } = useShop();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  async function addToCart() {
    setAdding(true);
    try {
      setAdded(await add(product));
    } finally {
      setAdding(false);
    }
  }
  return (
    <article className={'product-card' + (product.demo ? ' demo-product' : '')}>
      <Link
        className="product-visual"
        to={'/producto/' + product.id}
        aria-label={'Ver ' + product.nombre}
      >
        <ProductImage product={product} />
        {Number(product.oferta) > 0 && <span className="product-tag">−{product.oferta}%</span>}
        {(!product.stock || product.archivado) && (
          <span className="product-tag unavailable">Sin stock</span>
        )}
        <span className="visual-link">
          Descubrir fragancia <Icon name="arrow" />
        </span>
      </Link>
      <div className="product-content">
        <p className="eyebrow">{product.marca}</p>
        <Link to={'/producto/' + product.id}>
          <h3>{product.nombre}</h3>
        </Link>
        <p className="product-meta">
          {product.categoria} <span>·</span> {product.tamano}
        </p>
        <div className="product-bottom">
          <div className="product-price">
            {Number(product.oferta) > 0 && <del>{money(product.precio)}</del>}
            <strong>{money(finalPrice(product))}</strong>
          </div>
          <button
            className="icon-button add-button"
            onClick={addToCart}
            disabled={adding || !product.stock || DEMO_MODE}
            aria-label={'Agregar ' + product.nombre + ' al carrito'}
          >
            <Icon name={added ? 'check' : 'plus'} />
          </button>
        </div>
      </div>
    </article>
  );
}
