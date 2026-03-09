import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Internships from './pages/Internships';
import Apply from './pages/Apply';
import Chatbot_test from './pages/Chatbot';
import StudentProfile from './pages/StudentProfile';
import './styles/index.css';

function App() {
  return (
    <Router>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/internships" element={<Internships />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/profile" element={<StudentProfile />} />
        <Route path="/Chatbot_test" element={<Chatbot_test />} />
      </Routes>
    </Router>
  );
}

export default App;
