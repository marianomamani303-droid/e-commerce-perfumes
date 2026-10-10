import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { api, DEMO_MODE, readableError } from '../services/api';
import { money, finalPrice } from '../utils/format';
import Icon from '../components/Icon';
import ProductImage from '../components/ProductImage';
import { Loading, ErrorState } from '../components/Feedback';
export default function Carrito() {
  const dialog = useRef(null);
  const {
    user,
    cart,
    cartOpen,
    setCartOpen,
    cartLoading,
    cartError,
    setCartError,
    refreshCart,
    quantity,
  } = useShop();
  const [paying, setPaying] = useState(false);
  const total =
    cart.reduce(
      (sum, item) => sum + Math.round(finalPrice(item) * 100) * Number(item.cantidad),
      0,
    ) / 100;
  useEffect(() => {
    const element = dialog.current;
    if (cartOpen && !element.open) element.showModal();
    if (!cartOpen && element.open) element.close();
    if (!cartOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [cartOpen]);
  async function checkout() {
    setPaying(true);
    setCartError('');
    try {
      const result = await api('/payments/checkout', { method: 'POST', body: {} });
      const url = new URL(result.url);
      if (url.protocol !== 'https:' || !/(^|\.)mercadopago\.(com|com\.ar)$/.test(url.hostname))
        throw new Error('El enlace de pago no es válido.');
      window.location.assign(url.href);
    } catch (error) {
      setCartError(readableError(error));
      setPaying(false);
    }
  }
  return (
    <dialog
      className="cart-dialog"
      ref={dialog}
      aria-labelledby="cart-title"
      onCancel={() => setCartOpen(false)}
      onClose={() => setCartOpen(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) setCartOpen(false);
      }}
    >
      <div className="cart-panel">
        <div className="cart-heading">
          <div>
            <p className="eyebrow">TU PRÓXIMO RECUERDO</p>
            <h2 id="cart-title">
              Tu selección{' '}
              <span>({cart.reduce((sum, item) => sum + Number(item.cantidad), 0)})</span>
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Cerrar carrito"
            onClick={() => setCartOpen(false)}
            autoFocus
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="cart-body">
          {DEMO_MODE ? (
            <div className="empty-state">
              <Icon name="bag" size={40} />
              <h3>Una mirada a Airbell</h3>
              <p>
                Esta demostración muestra productos ficticios. Las compras están deshabilitadas.
              </p>
            </div>
          ) : !user ? (
            <div className="empty-state">
              <Icon name="bag" size={40} />
              <h3>Tu selección te espera</h3>
              <p>Iniciá sesión para guardar tus fragancias y continuar con tu compra.</p>
              <Link className="button" to="/login" onClick={() => setCartOpen(false)}>
                Iniciar sesión <Icon name="arrow" />
              </Link>
            </div>
          ) : (
            <>
              {cartError && <ErrorState message={cartError} retry={refreshCart} />}
              {cartLoading && !cart.length && <Loading label="Preparando tu selección…" />}
              {!cartLoading && !cartError && !cart.length && (
                <div className="empty-state">
                  <Icon name="bag" size={40} />
                  <h3>El comienzo de algo especial</h3>
                  <p>Explorá la colección y encontrá tu próxima fragancia.</p>
                  <Link className="button" to="/#catalogo" onClick={() => setCartOpen(false)}>
                    Explorar perfumes <Icon name="arrow" />
                  </Link>
                </div>
              )}
              {cart.map((item) => (
                <article className="cart-item" key={item.id}>
                  <Link
                    className="cart-image"
                    to={'/producto/' + item.id}
                    onClick={() => setCartOpen(false)}
                  >
                    <ProductImage product={item} />
                  </Link>
                  <div className="cart-item-info">
                    <p className="eyebrow">{item.marca}</p>
                    <h3>{item.nombre}</h3>
                    <p className="product-meta">
                      {item.tamano}
                      {item.archivado ? ' · No disponible' : ''}
                    </p>
                    <strong>{money(finalPrice(item))}</strong>
                    <div className="cart-item-actions">
                      <div className="quantity-control">
                        <button
                          aria-label={'Reducir cantidad de ' + item.nombre}
                          disabled={cartLoading || paying}
                          onClick={() => quantity(item.id, Number(item.cantidad) - 1)}
                        >
                          <Icon name="minus" size={16} />
                        </button>
                        <output aria-label="Cantidad">{item.cantidad}</output>
                        <button
                          aria-label={'Aumentar cantidad de ' + item.nombre}
                          disabled={
                            cartLoading ||
                            paying ||
                            Number(item.cantidad) >= item.stock ||
                            Number(item.cantidad) >= 99
                          }
                          onClick={() => quantity(item.id, Number(item.cantidad) + 1)}
                        >
                          <Icon name="plus" size={16} />
                        </button>
                      </div>
                      <button
                        className="text-button"
                        disabled={cartLoading || paying}
                        onClick={() => quantity(item.id, 0)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </>
          )}
        </div>
        {user && cart.length > 0 && (
          <div className="cart-summary">
            <div className="summary-total">
              <span>Subtotal</span>
              <strong>{money(total)}</strong>
            </div>
            <p>El importe y la disponibilidad se verifican antes del pago.</p>
            <button
              className="button full-width"
              disabled={cartLoading || paying || !!cartError || cart.some((item) => item.archivado)}
              onClick={checkout}
            >
              {paying ? 'Preparando pago seguro…' : 'Continuar con Mercado Pago'}
              <Icon name="arrow" />
            </button>
            <small>
              <Icon name="shield" size={16} /> Tu pago se procesa en Mercado Pago
            </small>
          </div>
        )}
      </div>
    </dialog>
  );
}
