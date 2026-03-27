import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Internships from './pages/Internships';
import Apply from './pages/Apply';
import Chatbot from './pages/Chatbot';
import StudentProfile from './pages/StudentProfile';

function App() {
  const [userRole, setUserRole] = useState('guest');

  return (
    <Router>
      <Navigation userRole={userRole} />
      <Routes>
        <Route path="/" element={<Home userRole={userRole} setUserRole={setUserRole} />} />
        <Route path="/internships" element={<Internships userRole={userRole} />} />
        <Route path="/apply" element={<Apply userRole={userRole} />} />
        <Route path="/profile" element={<StudentProfile userRole={userRole} />} />
        <Route path="/Chatbot_test" element={<Chatbot userRole={userRole} />} />
      </Routes>
    </Router>
  );
}

export default App;
