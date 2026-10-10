import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useResource } from '../hooks/useResource';
import { DEMO_MODE } from '../services/api';
import { demoProducts } from '../data/demo';
import { finalPrice } from '../utils/format';
import ProductCard from '../components/ProductCard';
import Icon from '../components/Icon';
import { ErrorState, Skeletons } from '../components/Feedback';
import PaymentStatus from '../components/PaymentStatus';

function Catalog({ products, loading, error, reload }) {
  const [params, setParams] = useSearchParams();
  const category = params.get('categoria') || 'Todos';
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('Todas');
  const [sort, setSort] = useState('recent');
  const [available, setAvailable] = useState(false);
  const brands = [...new Set(products.map((product) => product.marca))].sort();
  const visible = useMemo(() => {
    const needle = search
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const list = products.filter((product) => {
      const haystack = [product.nombre, product.marca, product.descripcion]
        .join(' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      return (
        (category === 'Todos' || product.categoria?.toLowerCase() === category.toLowerCase()) &&
        (brand === 'Todas' || product.marca === brand) &&
        (!available || product.stock > 0) &&
        haystack.includes(needle)
      );
    });
    if (sort === 'low') list.sort((a, b) => finalPrice(a) - finalPrice(b));
    if (sort === 'high') list.sort((a, b) => finalPrice(b) - finalPrice(a));
    if (sort === 'name') list.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return list;
  }, [products, search, category, brand, sort, available]);
  function changeCategory(value) {
    const next = new URLSearchParams(params);
    if (value === 'Todos') next.delete('categoria');
    else next.set('categoria', value);
    setParams(next, { preventScrollReset: true });
  }
  function reset() {
    setSearch('');
    setBrand('Todas');
    setAvailable(false);
    changeCategory('Todos');
  }
  return (
    <section id="catalogo" className="container catalog-section" aria-labelledby="catalog-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">UNA ELECCIÓN MUY PERSONAL</p>
          <h2 id="catalog-title">Encontrá tu esencia.</h2>
        </div>
        <p>
          Dejá que una nota, una sensación o un recuerdo
          <br className="desktop-break" /> te guíen hacia tu próxima fragancia.
        </p>
      </div>
      <div className="catalog-toolbar">
        <div className="category-tabs" role="group" aria-label="Categoría de perfume">
          {['Todos', 'Femenino', 'Masculino', 'Unisex'].map((value, index) => (
            <button
              key={value}
              className={category === value ? 'selected' : ''}
              aria-pressed={category === value}
              onClick={() => changeCategory(value)}
            >
              {['Todos los perfumes', 'Para ella', 'Para él', 'Unisex'][index]}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Icon name="search" />
          <input
            type="search"
            placeholder="Buscá un perfume o una marca"
            aria-label="Buscar perfume o marca"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <div className="catalog-controls">
        <span className="result-count" aria-live="polite">
          {loading
            ? 'Preparando la colección…'
            : visible.length + (visible.length === 1 ? ' fragancia' : ' fragancias')}
        </span>
        <div className="filter-controls">
          <label>
            Marca{' '}
            <select
              aria-label="Marca"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
            >
              <option value="Todas">Todas</option>
              {brands.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="stock-filter">
            <input
              type="checkbox"
              checked={available}
              onChange={(event) => setAvailable(event.target.checked)}
            />{' '}
            Con stock
          </label>
          <label>
            Ordenar{' '}
            <select
              aria-label="Ordenar"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recent">Más recientes</option>
              <option value="low">Menor precio</option>
              <option value="high">Mayor precio</option>
              <option value="name">Nombre A–Z</option>
            </select>
          </label>
        </div>
      </div>
      {loading ? (
        <Skeletons />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : visible.length ? (
        <div className="product-grid">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Icon name="search" size={36} />
          <h3>
            {products.length
              ? 'Tu esencia puede estar un poco más allá.'
              : 'Estamos preparando la colección.'}
          </h3>
          <p>
            {products.length
              ? 'Probá con otra marca o ajustá los filtros.'
              : 'Volvé pronto para descubrir nuestras fragancias.'}
          </p>
          {products.length > 0 && (
            <button className="button secondary" onClick={reset}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </section>
  );
}
function LiveCatalog() {
  const resource = useResource('/products', []);
  return <Catalog products={resource.data || []} {...resource} />;
}
export default function Home() {
  const [params] = useSearchParams();
  return (
    <main id="main">
      {params.get('pedido') && !DEMO_MODE && <PaymentStatus id={params.get('pedido')} />}
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="tiny-line" /> EL ARTE DEL PERFUME
          </p>
          <h1>
            Hay fragancias.
            <br />Y hay <em>huellas.</em>
          </h1>
          <p className="hero-description">
            Encontrá ese aroma que habla de vos.
            <br />
            Una colección para sentir, descubrir
            <br className="desktop-break" /> y hacer tuya.
          </p>
          <a href="#catalogo" className="button">
            Explorar la colección <Icon name="arrow" />
          </a>
          <div className="hero-footnote">
            <span className="hero-star">✳</span>
            <span>La esencia está en los detalles.</span>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="/images/editorial-hero.webp"
            alt="Composición editorial de un frasco de perfume ámbar sobre piedra, con ramas de olivo"
            width="1536"
            height="1024"
            fetchPriority="high"
          />
          <div className="hero-caption">
            <span>EL UNIVERSO AIRBELL</span>
            <span>Una invitación a sentir.</span>
          </div>
        </div>
      </section>
      <div className="values-strip">
        <div className="container">
          <p>
            <Icon name="leaf" /> Una colección para descubrir
          </p>
          <p>
            <Icon name="bag" /> Tu selección, siempre a mano
          </p>
          <p>
            <Icon name="shield" /> Pagá con Mercado Pago
          </p>
        </div>
      </div>
      {DEMO_MODE ? <Catalog products={demoProducts} loading={false} /> : <LiveCatalog />}
      <section id="universo" className="universe container">
        <div className="universe-mark" aria-hidden="true">
          a<span>✳</span>
        </div>
        <div>
          <p className="eyebrow">MÁS QUE UN PERFUME</p>
          <h2>
            Los recuerdos también
            <br />
            tienen <em>aroma.</em>
          </h2>
          <p>
            Una fragancia puede llevarte a un lugar, a un momento, a alguien. En Airbell creemos en
            ese pequeño ritual de elegir un perfume que se vuelva parte de tu historia.
          </p>
          <Link to="/#catalogo" className="editorial-link">
            Descubrí el tuyo <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </main>
  );
}
