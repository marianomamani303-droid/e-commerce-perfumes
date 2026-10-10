import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import Icon from '../components/Icon';
export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, authLoading, logout, cart, setCartOpen } = useShop();
  const count = cart.reduce((sum, item) => sum + Number(item.cantidad), 0);
  return (
    <>
      <div className="announcement">Una fragancia. Infinitas formas de ser vos.</div>
      <header className="site-header">
        <div className="container nav-inner">
          <button
            className="icon-button mobile-menu"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen((x) => !x)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
          <Link to="/" className="wordmark" aria-label="Airbell, inicio">
            airbell<span>PARFUMERIE</span>
          </Link>
          <nav
            id="main-navigation"
            className={'main-navigation' + (menuOpen ? ' open' : '')}
            aria-label="Navegación principal"
            onClick={() => setMenuOpen(false)}
          >
            <NavLink to="/" end>
              Colección
            </NavLink>
            <Link to="/?categoria=Femenino#catalogo">Para ella</Link>
            <Link to="/?categoria=Masculino#catalogo">Para él</Link>
            <Link to="/?categoria=Unisex#catalogo">Unisex</Link>
            <Link to="/#universo">Nuestro universo</Link>
          </nav>
          <div className="nav-actions">
            <Link
              to="/#catalogo"
              className="icon-button nav-search"
              aria-label="Buscar una fragancia"
            >
              <Icon name="search" />
            </Link>
            {user ? (
              <details className="account-menu">
                <summary className="icon-button" aria-label="Mi cuenta">
                  <Icon name="user" />
                </summary>
                <div className="account-popover">
                  <strong>{user.nombre}</strong>
                  <small>{user.email}</small>
                  {user.rol === 'admin' && <Link to="/dashboard">Administrar tienda</Link>}
                  <button className="text-button" onClick={logout}>
                    Cerrar sesión
                  </button>
                </div>
              </details>
            ) : (
              <Link
                to="/login"
                className="icon-button"
                aria-label="Iniciar sesión"
                aria-busy={authLoading}
              >
                <Icon name="user" />
              </Link>
            )}
            <button
              className="icon-button bag-button"
              aria-label={'Abrir carrito, ' + count + ' productos'}
              onClick={() => setCartOpen(true)}
            >
              <Icon name="bag" />
              {count > 0 && <span className="cart-count">{count}</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
