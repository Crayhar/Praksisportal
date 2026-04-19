import { useState, useContext, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationContext } from '../contexts/NotificationContext';
import { Home, Briefcase, FilePlus, FileSearch, Bot, Building2, User, Mail, Bell, LogOut, LogIn, UserPlus } from 'lucide-react';

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
    icon: <NavIcon><Home size={20} /></NavIcon>,
  };

  const internshipsItem = {
    to: '/internships',
    label: 'Praksisplasser',
    icon: <NavIcon><Briefcase size={20} /></NavIcon>,
  };

  const applyItem = {
    to: '/apply',
    label: userRole === 'company' ? 'Publiser' : 'Søk',
    icon: userRole === 'company'
      ? <NavIcon><FilePlus size={20} /></NavIcon>
      : <NavIcon><FileSearch size={20} /></NavIcon>,
  };

  const aiItem = {
    to: userRole === 'company' ? '/chatbot' : '/Chatbot_test',
    label: userRole === 'company' ? 'AI-prosjekt' : 'AI-verktøy',
    icon: <NavIcon><Bot size={20} /></NavIcon>,
  };

  const profileItem = {
    to: '/profile',
    label: userRole === 'company' ? 'Bedriftsside' : 'Min profil',
    icon: userRole === 'company'
      ? <NavIcon><Building2 size={20} /></NavIcon>
      : <NavIcon><User size={20} /></NavIcon>,
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
              <NavIcon><Mail size={20} /></NavIcon>
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
                    <NavIcon><Bell size={20} /></NavIcon>
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
                  <NavIcon><LogOut size={20} /></NavIcon>
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
                  <NavIcon><LogIn size={20} /></NavIcon>
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
                  <NavIcon><UserPlus size={20} /></NavIcon>
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
