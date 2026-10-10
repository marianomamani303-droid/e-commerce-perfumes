import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShopContext } from './ShopContext';
import { api, DEMO_MODE, setCsrf, readableError } from '../services/api';

export default function ShopProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(!DEMO_MODE);
  const [authError, setAuthError] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState('');
  const [notice, setNotice] = useState('');
  const [bootstrapVersion, setBootstrapVersion] = useState(0);
  useEffect(() => {
    // Remove obsolete client identity left by previous versions; never trust it.
    localStorage.removeItem('id');
    localStorage.removeItem('rol');
    sessionStorage.removeItem('id');
    sessionStorage.removeItem('rol');
    if (DEMO_MODE) return;
    let active = true;
    api('/auth/session')
      .then((data) => {
        if (!active) return;
        setCsrf(data.csrfToken);
        setUser(data.user);
        setAuthError('');
      })
      .catch((error) => {
        if (active) setAuthError(readableError(error));
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bootstrapVersion]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const refreshCart = useCallback(async () => {
    if (!user) return;
    setCartLoading(true);
    setCartError('');
    try {
      setCart(await api('/cart'));
    } catch (error) {
      setCartError(readableError(error));
      if (error.status === 401) setUser(null);
    } finally {
      setCartLoading(false);
    }
  }, [user]);
  useEffect(() => {
    if (user) {
      refreshCart();
    }
  }, [cartOpen, user, refreshCart]);
  async function authenticate(mode, data) {
    if (DEMO_MODE) throw new Error('La vista de demostración no permite iniciar sesión.');
    const result = await api('/auth/' + mode, { method: 'POST', body: data });
    setCsrf(result.csrfToken);
    setUser(result.user);
    setCart([]);
    setAuthError('');
    return result.user;
  }
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST', body: {} });
      setCsrf(null);
      setUser(null);
      setCart([]);
      setCartOpen(false);
      navigate('/');
    } catch (error) {
      setNotice(readableError(error));
    }
  }
  async function add(product, cantidad = 1) {
    if (DEMO_MODE) {
      setNotice('Vista de demostración: las compras están deshabilitadas.');
      return false;
    }
    if (!user) {
      navigate('/login', { state: { from: '/producto/' + product.id } });
      return false;
    }
    try {
      setCart(await api('/cart', { method: 'POST', body: { id_producto: product.id, cantidad } }));
      setNotice(product.nombre + ' se agregó a tu selección.');
      return true;
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        navigate('/login');
      }
      setNotice(readableError(error));
      return false;
    }
  }
  async function quantity(id, cantidad) {
    setCartLoading(true);
    setCartError('');
    try {
      setCart(await api('/cart/' + id, { method: 'PATCH', body: { cantidad } }));
    } catch (error) {
      setCartError(readableError(error));
      if (error.status === 401) setUser(null);
    } finally {
      setCartLoading(false);
    }
  }
  return (
    <ShopContext.Provider
      value={{
        user,
        authLoading,
        authError,
        retryAuth: () => {
          setAuthLoading(true);
          setBootstrapVersion((x) => x + 1);
        },
        authenticate,
        logout,
        cart,
        cartOpen,
        setCartOpen,
        cartLoading,
        cartError,
        setCartError,
        refreshCart,
        add,
        quantity,
        notice,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}
