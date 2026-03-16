import { useState, useMemo } from 'react';
import { internships } from '../data/internships';
import Footer from '../components/Footer';
import InternshipDetailsModal from '../components/InternshipDetailsModal';

export default function Internships({ userRole }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInternship, setSelectedInternship] = useState(null);
  const isCompany = userRole === 'company';

  const getCompensationSummary = (internship) =>
    internship.salaryType === 'hourly'
      ? `Timelonn: ${internship.compensationAmount} NOK/time`
      : `Fastpris: ${internship.compensationAmount} NOK`;

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
          <h1>{isCompany ? 'Student- og oppdragsmarked' : 'Alle praksisplasser'}</h1>
          <p>
            {isCompany
              ? 'Se hva som er attraktivt i markedet og bruk innsikten når du publiserer nye oppdrag.'
              : 'Finn den perfekte praksisplassen som matcher dine interesser og ferdigheter'}
          </p>
        </div>
      </section>

      {/* Internships List */}
      <section className="latest-internships">
        <div className="container">
          {/* Search Input */}
          <input
            type="text"
            className="search-input"
            placeholder={
              isCompany
                ? 'Søk i markedet etter tittel, bedrift eller sted...'
                : 'Søk praksisplasser etter tittel, bedrift eller sted...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Internship Cards */}
          <div className="internship-list">
            {filteredInternships.length > 0 ? (
              filteredInternships.map((internship) => (
                <div
                  key={internship.id}
                  className="internship-card internship-card-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedInternship(internship)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedInternship(internship);
                    }
                  }}
                >
                  <h3>{internship.title}</h3>
                  <p className="company">🏢 {internship.company}</p>
                  <p className="location">📍 {internship.location}</p>
                  <p>{internship.description}</p>
                  <p style={{ color: '#347e84', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                    <strong>Periode:</strong> {internship.startDate} til {internship.endDate}
                  </p>
                  <p style={{ color: '#347e84', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                    <strong>Maks timer:</strong> {internship.maxHours}
                  </p>
                  <p style={{ color: '#347e84', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                    <strong>Kompensasjon:</strong> {getCompensationSummary(internship)}
                  </p>
                  <button type="button" className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '8px 20px' }}>
                    Se mer info
                  </button>
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

      <InternshipDetailsModal
        internship={selectedInternship}
        onClose={() => setSelectedInternship(null)}
        userRole={userRole}
      />

      <Footer />
    </main>
  );
}
