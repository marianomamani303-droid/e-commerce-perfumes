import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import NavBar from './components/NavBar';
import Carrito from './components/CartDrawer';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/registrarse';
import Product from './pages/productod';
import Dashboard from './pages/dashboardAdmin';
import ShopProvider from './context/ShopProvider';
import { useShop } from './context/ShopContext';
import { DEMO_MODE } from './services/api';
import Icon from './components/Icon';
import './css/global.css';
function Layout() {
  const { notice, authError, retryAuth } = useShop();
  const { pathname, hash } = useLocation();
  useEffect(() => {
    document.title =
      pathname === '/login'
        ? 'Tu cuenta · Airbell'
        : pathname === '/dashboard'
          ? 'Administración · Airbell'
          : 'Airbell · El arte de encontrar tu fragancia';
    if (hash)
      requestAnimationFrame(() =>
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' }),
      );
    else window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return (
    <>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <NavBar />
      {DEMO_MODE && (
        <div className="demo-banner">
          Vista de demostración · Productos ficticios · Compras deshabilitadas
        </div>
      )}
      {authError && (
        <div className="connection-banner" role="status">
          La conexión con tu cuenta no está disponible.{' '}
          <button className="text-button" onClick={retryAuth}>
            Reintentar
          </button>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/producto/:id" element={<Product />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="*"
          element={
            <main id="main" className="container empty-state">
              <p className="eyebrow">404</p>
              <h1>Este camino no lleva a una fragancia.</h1>
              <Link className="button" to="/">
                Volver a la colección <Icon name="arrow" />
              </Link>
            </main>
          }
        />
      </Routes>
      <Footer />
      <Carrito />
      {notice && (
        <div className="toast" role="status">
          <Icon name="bag" />
          <span>{notice}</span>
        </div>
      )}
    </>
  );
}
export default function App() {
  return (
    <ShopProvider>
      <Layout />
    </ShopProvider>
  );
}
