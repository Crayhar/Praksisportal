import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { internships } from '../data/internships';
import Footer from '../components/Footer';

export default function Internships() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInternships = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return internships.filter(
      (internship) =>
        internship.title.toLowerCase().includes(query) ||
        internship.company.toLowerCase().includes(query) ||
        internship.location.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <main>
      {/* Page Header */}
      <section className="hero" style={{ minHeight: '300px' }}>
        <div className="hero-content">
          <h1>Alle praksisplasser</h1>
          <p>Finn den perfekte praksisplassen som matcher dine interesser og ferdigheter</p>
        </div>
      </section>

      {/* Internships List */}
      <section className="latest-internships">
        <div className="container">
          {/* Search Input */}
          <input
            type="text"
            className="search-input"
            placeholder="Søk praksisplasser etter tittel, bedrift eller sted..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Internship Cards */}
          <div className="internship-list">
            {filteredInternships.length > 0 ? (
              filteredInternships.map((internship) => (
                <div key={internship.id} className="internship-card">
                  <h3>{internship.title}</h3>
                  <p className="company">🏢 {internship.company}</p>
                  <p className="location">📍 {internship.location}</p>
                  <p>{internship.description}</p>
                  <p style={{ color: '#347e84', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                    <strong>Varighet:</strong> {internship.duration}
                  </p>
                  <p style={{ color: '#347e84', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                    <strong>Status:</strong> {internship.salary}
                  </p>
                  <Link to="/apply" className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '8px 20px' }}>
                    Søk nå
                  </Link>
                </div>
              ))
            ) : (
              <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                Ingen praksisplasser funnet. Prøv å endre søket ditt.
              </p>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
