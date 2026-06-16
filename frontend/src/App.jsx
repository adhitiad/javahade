import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            {/* Halaman login dan stream akan ditambahkan di sini nanti */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
