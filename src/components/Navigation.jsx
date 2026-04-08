import { useState, useContext, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationContext } from '../contexts/NotificationContext';

function NavIcon({ children }) {
  return (
    <span className="nav-link-icon" aria-hidden="true">
      {children}
    </span>
  );
}

export default function Navigation({ userRole, user, onLogout }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const notifCtx = useContext(NotificationContext);
  const unreadCount = notifCtx?.unreadCount ?? 0;
  const notifItems = notifCtx?.items ?? [];
  const markRead = notifCtx?.markRead;
  const markAllRead = notifCtx?.markAllRead;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    setNotifOpen(false);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setNotifOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    closeMenu();
    navigate('/');
  };

  const roleLabel = user
    ? `${user.firstName} ${user.lastName} (${userRole === 'student' ? 'Student' : 'Bedrift'})`
    : userRole === 'student'
      ? 'Studentvisning'
      : userRole === 'company'
        ? 'Bedriftsvisning'
        : 'Ikke logget inn';

  const homeItem = {
    to: '/',
    label: 'Hjem',
    icon: (
      <NavIcon>
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M3 10.75 12 3l9 7.75v9.25a1 1 0 0 1-1 1h-5.5v-6.5h-5V21H4a1 1 0 0 1-1-1z" />
        </svg>
      </NavIcon>
    ),
  };

  const internshipsItem = {
    to: '/internships',
    label: 'Praksisplasser',
    icon: (
      <NavIcon>
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M9 4.5h6a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z" />
          <path d="M4 8.5h16A1.5 1.5 0 0 1 21.5 10v8.5A1.5 1.5 0 0 1 20 20H4A1.5 1.5 0 0 1 2.5 18.5V10A1.5 1.5 0 0 1 4 8.5Zm2 2a.75.75 0 0 0-.75.75v1.25c0 .41.34.75.75.75h12a.75.75 0 0 0 .75-.75v-1.25a.75.75 0 0 0-.75-.75Z" />
        </svg>
      </NavIcon>
    ),
  };

  const applyItem = {
    to: '/apply',
    label: userRole === 'company' ? 'Publiser' : 'Søk',
    icon: userRole === 'company' ? (
      <NavIcon>
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M6.5 4h7a2.5 2.5 0 0 1 2.5 2.5V8h1.5A2.5 2.5 0 0 1 20 10.5v7A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11A2.5 2.5 0 0 1 6.5 4Zm1 4.5a.75.75 0 0 0 0 1.5h4.75V12a.75.75 0 0 0 1.5 0V10h1.75a.75.75 0 0 0 0-1.5h-1.75v-1.75a.75.75 0 0 0-1.5 0V8.5Z" />
        </svg>
      </NavIcon>
    ) : (
      <NavIcon>
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M6.5 3.5h8.38a2.5 2.5 0 0 1 1.77.73l1.62 1.62a2.5 2.5 0 0 1 .73 1.77V18A2.5 2.5 0 0 1 16.5 20.5h-10A2.5 2.5 0 0 1 4 18V6A2.5 2.5 0 0 1 6.5 3.5Zm1.25 5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5Zm0 4a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5Z" />
          <path d="M14.97 15.47a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06Z" />
          <path d="M13.75 14a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm0 1.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
        </svg>
      </NavIcon>
    ),
  };

  const aiItem = {
    to: userRole === 'company' ? '/chatbot' : '/Chatbot_test',
    label: userRole === 'company' ? 'AI-prosjekt' : 'AI-verktøy',
    icon: (
      <NavIcon>
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 3.5a.75.75 0 0 1 .75.75v1.13a4.76 4.76 0 0 1 3.87 3.87h1.13a.75.75 0 0 1 0 1.5h-1v1.5h1a.75.75 0 0 1 0 1.5h-1.13a4.76 4.76 0 0 1-3.87 3.87v1.13a.75.75 0 0 1-1.5 0v-1.13a4.76 4.76 0 0 1-3.87-3.87H6.25a.75.75 0 0 1 0-1.5h1v-1.5h-1a.75.75 0 0 1 0-1.5h1.13a4.76 4.76 0 0 1 3.87-3.87V4.25A.75.75 0 0 1 12 3.5Zm0 3.25A3.25 3.25 0 1 0 15.25 10 3.25 3.25 0 0 0 12 6.75Zm0 1.5a1.75 1.75 0 1 1-1.75 1.75A1.75 1.75 0 0 1 12 8.25Z" />
        </svg>
      </NavIcon>
    ),
  };

  const profileItem = {
    to: '/profile',
    label: userRole === 'company' ? 'Bedriftsside' : 'Min profil',
    icon: userRole === 'company' ? (
      <NavIcon>
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M5.5 4h8A2.5 2.5 0 0 1 16 6.5V8h2.5A1.5 1.5 0 0 1 20 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4Zm1 4h2v2h-2Zm0 4h2v2h-2Zm0 4h2v2h-2Zm4-8h3.5v2H10.5Zm0 4h3.5v2H10.5Zm0 4h3.5v2H10.5Z" />
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
  };

  const navItems = userRole === 'company'
    ? [homeItem, internshipsItem, applyItem, aiItem, profileItem]
    : userRole === 'student'
      ? [homeItem, internshipsItem, applyItem, profileItem, aiItem]
      : [homeItem, internshipsItem];

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
            <Link
              to="/"
              state={{ scrollTo: 'contact' }}
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
            </Link>
          </li>
          {user ? (
            <>
              {userRole === 'student' && (
                <li className="nav-item nav-notif-item" ref={notifRef}>
                  <button
                    className="nav-link nav-bell-btn"
                    onClick={() => setNotifOpen((v) => !v)}
                    aria-label={`Varslinger${unreadCount > 0 ? ` (${unreadCount} uleste)` : ''}`}
                  >
                    <NavIcon>
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6V11a6 6 0 0 0-5-5.92V4a1 1 0 0 0-2 0v1.08A6 6 0 0 0 6 11v5l-1.29 1.29A1 1 0 0 0 5 19h14a1 1 0 0 0 .71-1.71Z" />
                      </svg>
                    </NavIcon>
                    {unreadCount > 0 && (
                      <span className="nav-notif-badge" aria-hidden="true">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    <span className="nav-tooltip">Varslinger</span>
                    <span className="sr-only">Varslinger</span>
                  </button>
                  {notifOpen && (
                    <div className="nav-notif-dropdown" role="dialog" aria-label="Varslinger">
                      <div className="nav-notif-header">
                        <span className="nav-notif-heading">Varslinger</span>
                        {unreadCount > 0 && (
                          <button
                            className="nav-notif-mark-all"
                            onClick={() => { markAllRead(); }}
                          >
                            Merk alle lest
                          </button>
                        )}
                      </div>
                      {notifItems.length === 0 ? (
                        <p className="nav-notif-empty">Ingen varslinger ennå</p>
                      ) : (
                        <ul className="nav-notif-list">
                          {notifItems.slice(0, 8).map((n) => (
                            <li key={n.id} className={`nav-notif-entry${n.isRead ? ' read' : ' unread'}`}>
                              <button
                                className="nav-notif-entry-btn"
                                onClick={() => {
                                  if (!n.isRead) markRead(n.id);
                                  setNotifOpen(false);
                                  navigate('/internships');
                                }}
                              >
                                {!n.isRead && <span className="nav-notif-dot" aria-hidden="true" />}
                                <span className="nav-notif-info">
                                  <span className="nav-notif-title">{n.caseTitle}</span>
                                  <span className="nav-notif-meta">{n.companyName} · {n.matchScore}% match</span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Link
                        to="/profile"
                        className="nav-notif-see-all"
                        onClick={() => setNotifOpen(false)}
                      >
                        Se alle varslinger →
                      </Link>
                    </div>
                  )}
                </li>
              )}
              <li className="nav-item nav-role-indicator">
                <span className="nav-link">{roleLabel}</span>
              </li>
              <li className="nav-item">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLogout();
                  }}
                  className="nav-link nav-logout"
                  aria-label="Logg ut"
                >
                  <NavIcon>
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M15.5 4a.5.5 0 0 1 .5.5v3h2V4.5A2.5 2.5 0 0 0 15.5 2h-9A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22h9a2.5 2.5 0 0 0 2.5-2.5v-2.5h-2v3a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-15a.5.5 0 0 1 .5-.5h9Z" />
                      <path d="M19.7 11.3a.75.75 0 0 0-1.06-1.06l-2 2V7.5a.75.75 0 0 0-1.5 0v4.74l-2-2a.75.75 0 1 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
                    </svg>
                  </NavIcon>
                  <span className="nav-tooltip">Logg ut</span>
                  <span className="sr-only">Logg ut</span>
                </a>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link
                  to="/login"
                  className="nav-link"
                  onClick={closeMenu}
                  aria-label="Logg inn"
                >
                  <NavIcon>
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M6.5 2h8a2.5 2.5 0 0 1 2.5 2.5v2H14V4.5a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v15a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-2h2.5v2A2.5 2.5 0 0 1 14.5 22h-8a2.5 2.5 0 0 1-2.5-2.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                      <path d="M16.78 11.28a.75.75 0 0 0-1.06-1.06l-2 2V7.5a.75.75 0 0 0-1.5 0v4.72l-2-2a.75.75 0 1 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
                    </svg>
                  </NavIcon>
                  <span className="nav-tooltip">Logg inn</span>
                  <span className="sr-only">Logg inn</span>
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/signup"
                  className="nav-link"
                  onClick={closeMenu}
                  aria-label="Registrer deg"
                >
                  <NavIcon>
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                    </svg>
                  </NavIcon>
                  <span className="nav-tooltip">Registrer</span>
                  <span className="sr-only">Registrer deg</span>
                </Link>
              </li>
            </>
          )}
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
