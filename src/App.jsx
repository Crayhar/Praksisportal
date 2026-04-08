import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext } from 'react';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Internships from './pages/Internships';
import Apply from './pages/Apply';
import Chatbot from './pages/Chatbot';
import StudentProfile from './pages/StudentProfile';
import Login from './pages/Login';
import Signup from './pages/Signup';
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
    return <div style={{ padding: '20px', textAlign: 'center' }}>Laster...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, userRole, setUser, setUserRole, handleLogout }}>
      <NotificationProvider>
        <Router>
          <Navigation userRole={userRole} user={user} onLogout={handleLogout} />
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
            <Route
              path="/chatbot"
              element={<ProtectedRoute element={<Chatbot userRole={userRole} />} role={userRole} requiredRole={["company", "admin"]} />}
            />
            <Route path="/Chatbot_test" element={<ProtectedRoute element={<Chatbot userRole={userRole} />} role={userRole} />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthContext.Provider>
  );
}

export default App;
