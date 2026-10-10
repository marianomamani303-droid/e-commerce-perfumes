import { useEffect } from 'react';
import { useResource } from '../hooks/useResource';
import { useShop } from '../context/ShopContext';
import { money } from '../utils/format';
import { ErrorState, Loading } from './Feedback';
const statuses = {
  creating: 'Estamos preparando tu pago.',
  pending: 'Tu pago todavía está pendiente de confirmación.',
  paid: 'Pago confirmado. Gracias por elegir Airbell.',
  expired: 'El plazo de pago venció. Podés preparar una nueva compra.',
  paid_review:
    'Recibimos tu pago. Tu pedido requiere revisión de disponibilidad por parte de la tienda.',
};
function OrderStatus({ id }) {
  const { data, loading, error, reload } = useResource('/orders/' + encodeURIComponent(id));
  useEffect(() => {
    if (!data || !['creating', 'pending'].includes(data.estado)) return;
    const timer = setTimeout(reload, 10000);
    return () => clearTimeout(timer);
  }, [data, reload]);
  return (
    <section className="container order-status" aria-live="polite">
      {loading && !data ? (
        <Loading label="Consultando tu pedido…" />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : (
        data && (
          <>
            <p className="eyebrow">TU PEDIDO EN AIRBELL</p>
            <h2>{statuses[data.estado] || 'Estamos revisando tu pedido.'}</h2>
            <p>Importe: {money(data.total)}</p>
            <button className="text-button" onClick={reload}>
              Actualizar estado
            </button>
          </>
        )
      )}
    </section>
  );
}
export default function PaymentStatus({ id }) {
  const { user, authLoading } = useShop();
  if (authLoading) return <Loading />;
  if (!user)
    return (
      <div className="container feedback">Iniciá sesión para consultar el estado de tu pedido.</div>
    );
  return <OrderStatus key={id} id={id} />;
}
