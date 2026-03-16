import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navigation({ userRole }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const roleLabel =
    userRole === 'student'
      ? 'Studentvisning'
      : userRole === 'company'
        ? 'Bedriftsvisning'
        : 'Ingen testrolle valgt';

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
            <Link to="/apply" className="nav-link" onClick={closeMenu}>
              {userRole === 'company' ? 'Publiser' : 'Søk'}
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/profile" className="nav-link" onClick={closeMenu}>
              {userRole === 'company' ? 'Bedriftsside' : 'Min profil'}
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/Chatbot_test" className="nav-link" onClick={closeMenu}>
              {userRole === 'company' ? 'AI-annonse' : 'AI-verktøy'}
            </Link>
          </li>
          <li className="nav-item">
            <a href="#contact" className="nav-link" onClick={closeMenu}>Kontakt</a>
          </li>
          <li className="nav-item nav-role-indicator">
            <span className="nav-link">{roleLabel}</span>
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
