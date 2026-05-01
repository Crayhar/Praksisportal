import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, lazy, Suspense } from 'react';
import Navigation from './components/Navigation';
import Spinner from './components/Spinner';

const Home = lazy(() => import('./pages/Home'));
const Internships = lazy(() => import('./pages/Internships'));
const Apply = lazy(() => import('./pages/Apply'));
const Chatbot = lazy(() => import('./pages/Chatbot'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const CompanyProfilePublic = lazy(() => import('./pages/CompanyProfilePublic'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
import { auth, token as tokenUtils } from './utils/api';
import { NotificationProvider } from './contexts/NotificationContext';

export const AuthContext = createContext(null);

function ProtectedRoute({ element, role, requiredRole }) {
  if (!role) {
    return <Navigate to="/login" />;
  }
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/" />;
    }
  }
  return element;
}

function App() {
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = tokenUtils.get();
      if (token) {
        try {
          const userData = await auth.getCurrentUser();
          setUser(userData);
          setUserRole(userData.role);
        } catch (error) {
          console.error('Failed to load user:', error);
          tokenUtils.remove();
          setUserRole(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLogout = () => {
    tokenUtils.remove();
    setUser(null);
    setUserRole(null);
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <AuthContext.Provider value={{ user, userRole, setUser, setUserRole, handleLogout }}>
      <NotificationProvider>
        <Router>
          <Navigation userRole={userRole} user={user} onLogout={handleLogout} />
          <main id="main-content">
          <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<Home userRole={userRole} setUserRole={setUserRole} />} />
            <Route path="/login" element={userRole ? <Navigate to="/" /> : <Login />} />
            <Route path="/signup" element={userRole ? <Navigate to="/" /> : <Signup />} />
            <Route path="/internships" element={<Internships userRole={userRole} />} />
            <Route path="/apply" element={<Apply userRole={userRole} />} />
            <Route
              path="/profile"
              element={<ProtectedRoute element={<StudentProfile userRole={userRole} />} role={userRole} />}
            />
            <Route path="/companies/:companyId" element={<CompanyProfilePublic />} />
            <Route
              path="/chatbot"
              element={<ProtectedRoute element={<Chatbot userRole={userRole} />} role={userRole} requiredRole={["company", "admin"]} />}
            />
            <Route path="/Chatbot_test" element={<ProtectedRoute element={<Chatbot userRole={userRole} />} role={userRole} />} />
          </Routes>
          </Suspense>
          </main>
        </Router>
      </NotificationProvider>
    </AuthContext.Provider>
  );
}

export default App;
