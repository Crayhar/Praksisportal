import { useState } from 'react';
import { Link } from 'react-router-dom';

function NavIcon({ children }) {
  return (
    <span className="nav-link-icon" aria-hidden="true">
      {children}
    </span>
  );
}

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

  const navItems = [
    {
      to: '/',
      label: 'Hjem',
      icon: (
        <NavIcon>
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M3 10.75 12 3l9 7.75v9.25a1 1 0 0 1-1 1h-5.5v-6.5h-5V21H4a1 1 0 0 1-1-1z" />
          </svg>
        </NavIcon>
      ),
    },
    {
      to: '/internships',
      label: 'Praksisplasser',
      icon: (
        <NavIcon>
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M9 4.5h6a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z" />
            <path d="M4 8.5h16A1.5 1.5 0 0 1 21.5 10v8.5A1.5 1.5 0 0 1 20 20H4A1.5 1.5 0 0 1 2.5 18.5V10A1.5 1.5 0 0 1 4 8.5Zm6.75 4a.75.75 0 0 0-.75.75v.5H8.5a.75.75 0 0 0 0 1.5H10v.5a.75.75 0 0 0 1.5 0v-.5h1.5a.75.75 0 0 0 0-1.5h-1.5v-.5a.75.75 0 0 0-.75-.75Z" />
          </svg>
        </NavIcon>
      ),
    },
    {
      to: '/apply',
      label: userRole === 'company' ? 'Publiser' : 'Søk',
      icon: userRole === 'company' ? (
        <NavIcon>
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M12 3a1 1 0 0 1 1 1v7h7a1 1 0 1 1 0 2h-7v7a1 1 0 1 1-2 0v-7H4a1 1 0 1 1 0-2h7V4a1 1 0 0 1 1-1Z" />
          </svg>
        </NavIcon>
      ) : (
        <NavIcon>
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
            <path d="M15.5 14.1a1 1 0 0 1 1.4 0l3.8 3.8a1 1 0 1 1-1.4 1.4l-3.8-3.8a1 1 0 0 1 0-1.4Z" />
          </svg>
        </NavIcon>
      ),
    },
    {
      to: '/profile',
      label: userRole === 'company' ? 'Bedriftsside' : 'Min profil',
      icon: userRole === 'company' ? (
        <NavIcon>
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M5 3.5h9A1.5 1.5 0 0 1 15.5 5v15A1.5 1.5 0 0 1 14 21.5H5A1.5 1.5 0 0 1 3.5 20V5A1.5 1.5 0 0 1 5 3.5Zm2.25 3a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5Zm0 4a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5Zm0 4a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5Z" />
            <path d="M17.5 8.5h1.5A1.5 1.5 0 0 1 20.5 10v10a1.5 1.5 0 0 1-1.5 1.5h-1.5Z" />
          </svg>
        </NavIcon>
      ) : (
        <NavIcon>
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M12 4.25a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Z" />
            <path d="M5 19a5.75 5.75 0 0 1 11.5 0 .75.75 0 0 1-.75.75H5.75A.75.75 0 0 1 5 19Z" />
          </svg>
        </NavIcon>
      ),
    },
    {
      to: '/Chatbot_test',
      label: userRole === 'company' ? 'AI-annonse' : 'AI-verktøy',
      icon: (
        <NavIcon>
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M8.5 4A2.5 2.5 0 0 0 6 6.5v2A2.5 2.5 0 0 0 8.5 11h7A2.5 2.5 0 0 0 18 8.5v-2A2.5 2.5 0 0 0 15.5 4Zm0 9A2.5 2.5 0 0 0 6 15.5v2A2.5 2.5 0 0 0 8.5 20h7a2.5 2.5 0 0 0 2.5-2.5v-2A2.5 2.5 0 0 0 15.5 13Z" />
            <path d="M4.75 8a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 4.75 8Zm14.5 0a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5a.75.75 0 0 1 .75-.75Zm-14.5 6.5a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5a.75.75 0 0 1 .75-.75Zm14.5 0a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5a.75.75 0 0 1 .75-.75Z" />
          </svg>
        </NavIcon>
      ),
    },
  ];

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <Link to="/">Praksisportal</Link>
        </div>
        <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          {navItems.map((item) => (
            <li className="nav-item" key={item.to}>
              <Link
                to={item.to}
                className="nav-link"
                onClick={closeMenu}
                aria-label={item.label}
              >
                {item.icon}
                <span className="nav-tooltip">{item.label}</span>
                <span className="sr-only">{item.label}</span>
              </Link>
            </li>
          ))}
          <li className="nav-item">
            <a
              href="#contact"
              className="nav-link"
              onClick={closeMenu}
              aria-label="Kontakt"
            >
              <NavIcon>
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M4.5 6.25A2.25 2.25 0 0 1 6.75 4h10.5a2.25 2.25 0 0 1 2.25 2.25v11.5A2.25 2.25 0 0 1 17.25 20H6.75A2.25 2.25 0 0 1 4.5 17.75Zm2.52-.75a.75.75 0 0 0-.47 1.34l4.98 3.98a.75.75 0 0 0 .94 0l4.98-3.98a.75.75 0 0 0-.47-1.34Zm10.98 3.87-4.59 3.67a2.25 2.25 0 0 1-2.82 0L6 9.37v8.38c0 .41.34.75.75.75h10.5c.41 0 .75-.34.75-.75Z" />
                </svg>
              </NavIcon>
              <span className="nav-tooltip">Kontakt</span>
              <span className="sr-only">Kontakt</span>
            </a>
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
