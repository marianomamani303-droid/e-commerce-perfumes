import { useState } from 'react';
import { productImage } from '../services/api';
import Icon from './Icon';
export default function ProductImage({ product, eager = false }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div
      className="image-fallback"
      role="img"
      aria-label={'Imagen no disponible de ' + product.nombre}
    >
      <Icon name="leaf" size={40} />
      <span>{product.marca}</span>
      <small>Imagen no disponible</small>
    </div>
  ) : (
    <img
      src={productImage(product)}
      alt={product.nombre + ' · ' + product.marca}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
