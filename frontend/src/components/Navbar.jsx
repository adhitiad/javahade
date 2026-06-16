import { Link } from 'react-router-dom';
import { Video, User, LogIn, Search } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar glass-panel">
      <div className="container navbar-container">
        {/* Logo / Brand */}
        <Link to="/" className="navbar-brand">
          <Video className="brand-icon" size={28} color="var(--primary)" />
          <span className="brand-text">Kreativa</span>
        </Link>

        {/* Search Bar */}
        <div className="navbar-search">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Cari kreator atau kategori..." className="search-input" />
        </div>

        {/* Navigation Actions */}
        <div className="navbar-actions">
          <Link to="/login" className="btn btn-secondary">
            <LogIn size={18} />
            Masuk
          </Link>
          <Link to="/register" className="btn btn-primary">
            Daftar Sekarang
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
