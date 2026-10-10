import { Link } from 'react-router-dom';
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link className="wordmark" to="/">
            airbell<span>PARFUMERIE</span>
          </Link>
          <p>
            Fragancias que se sienten.
            <br />
            Recuerdos que permanecen.
          </p>
        </div>
        <div>
          <h2>Explorá Airbell</h2>
          <Link to="/#catalogo">Nuestra colección</Link>
          <Link to="/#universo">El universo Airbell</Link>
          <Link to="/login">Mi cuenta</Link>
        </div>
        <div className="footer-note">
          <p className="eyebrow">EL ARTE DE ELEGIR</p>
          <p>Encontrá una fragancia que hable de vos, a tu ritmo.</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Airbell</span>
        <span>Hecho con atención a cada detalle.</span>
      </div>
    </footer>
  );
}
