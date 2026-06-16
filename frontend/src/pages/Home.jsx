import { Play, TrendingUp, Users, Star } from 'lucide-react';
import './Home.css';

const Home = () => {
  // Data simulasi kreator
  const featuredCreators = [
    { id: 1, name: 'Alex Gaming', category: 'Esports', viewers: '12.5K', avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: 2, name: 'Sarah Tech', category: 'Coding', viewers: '8.2K', avatar: 'https://i.pravatar.cc/150?u=2' },
    { id: 3, name: 'Music Vibes', category: 'Music', viewers: '5.1K', avatar: 'https://i.pravatar.cc/150?u=3' },
    { id: 4, name: 'Chef Mario', category: 'Cooking', viewers: '3.9K', avatar: 'https://i.pravatar.cc/150?u=4' },
  ];

  return (
    <div className="home-page animate-fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-glow"></div>
        <div className="container hero-container">
          <div className="hero-content">
            <div className="badge glass-panel">
              <span className="live-dot"></span> LIVE SEKARANG
            </div>
            <h1 className="hero-title">
              Dukung Kreator <br />
              <span className="text-gradient">Favorit Anda</span>
            </h1>
            <p className="hero-subtitle">
              Platform interaktif dengan kualitas streaming super rendah latensi. Nikmati momen tak terlupakan bersama komunitas Anda.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg">
                <Play fill="currentColor" size={20} />
                Mulai Menonton
              </button>
              <button className="btn btn-secondary btn-lg">
                Jelajahi Kategori
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Streams Section */}
      <section className="featured-section container">
        <div className="section-header flex-between">
          <h2 className="section-title">
            <TrendingUp color="var(--primary)" /> Sedang Trending
          </h2>
          <button className="btn btn-secondary">Lihat Semua</button>
        </div>

        <div className="creator-grid">
          {featuredCreators.map((creator) => (
            <div key={creator.id} className="creator-card glass-panel">
              <div className="card-image-placeholder">
                <div className="live-badge">LIVE</div>
                <div className="viewers-badge">
                  <Users size={14} /> {creator.viewers}
                </div>
              </div>
              <div className="card-info">
                <img src={creator.avatar} alt={creator.name} className="creator-avatar" />
                <div className="creator-details">
                  <h3 className="creator-name">{creator.name}</h3>
                  <p className="creator-category">{creator.category}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
