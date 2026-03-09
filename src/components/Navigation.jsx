import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <Link to="/">Praksisportal</Link>
        </div>
        <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link to="/" className="nav-link" onClick={closeMenu}>Hjem</Link>
          </li>
          <li className="nav-item">
            <Link to="/internships" className="nav-link" onClick={closeMenu}>Praksisplasser</Link>
          </li>
          <li className="nav-item">
            <Link to="/apply" className="nav-link" onClick={closeMenu}>Søk</Link>
          </li>
          <li className="nav-item">
            <Link to="/profile" className="nav-link" onClick={closeMenu}>Min profil</Link>
          </li>
          <li className="nav-item">
            <a href="#contact" className="nav-link" onClick={closeMenu}>Kontakt</a>
          </li>
        </ul>
        <div
          className={`hamburger ${menuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  );
}
