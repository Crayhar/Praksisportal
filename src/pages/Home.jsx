import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { internships } from '../data/internships';
import Footer from '../components/Footer';
import InternshipDetailsModal from '../components/InternshipDetailsModal';

export default function Home({ userRole, setUserRole }) {
  const contactFormRef = useRef(null);
  const [selectedInternship, setSelectedInternship] = useState(null);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    const name = contactFormRef.current.querySelector('input[type="text"]').value;
    const email = contactFormRef.current.querySelector('input[type="email"]').value;
    const message = contactFormRef.current.querySelector('textarea').value;

    if (name && email && message) {
      alert(`Takk ${name}! Meldingen din er sendt. Vi tar kontakt på ${email} snart.`);
      contactFormRef.current.reset();
    } else {
      alert('Vennligst fyll ut alle feltene.');
    }
  };

  const latestInternships = internships.slice(0, 3);
  const isStudent = userRole === 'student';
  const isCompany = userRole === 'company';
  const getCompensationSummary = (internship) =>
    internship.salaryType === 'hourly'
      ? `Timelønn: ${internship.compensationAmount} NOK/time`
      : `Fastpris: ${internship.compensationAmount} NOK`;

  return (
    <main>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>{isCompany ? 'Velkommen til bedriftssiden i Praksisportal' : 'Velkommen til Praksisportal'}</h1>
          <p>
            {isCompany
              ? 'Publiser oppdrag, finn riktige kandidater og bruk AI til å skrive rekrutteringsannonser.'
              : 'Din inngangsport til ekte arbeidserfaring og relevante praksisplasser.'}
          </p>
          <div className="mock-auth-panel">
            <p className="mock-auth-label">⚠️ Dette er ikke endelig design - mock-autentisering for testing</p>
            <div className="mock-auth-buttons">
              <button type="button" className="btn btn-secondary" onClick={() => setUserRole('guest')}>
                Ingen innlogging
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setUserRole('student')}>
                Logg inn som student
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setUserRole('company')}>
                Logg inn som bedrift
              </button>
            </div>
          </div>
          <Link to={isCompany ? '/Chatbot_test' : '/internships'} className="btn btn-primary">
            {isCompany ? 'Opprett annonse' : 'Utforsk praksisplasser'}
          </Link>
          <Link to={isCompany ? '/profile' : '/Chatbot_test'} className="btn btn-secondary">
            {isCompany ? 'Se bedriftsoversikt' : 'Test AI-verktøy'}
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Hvorfor velge vår portal?</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>{isCompany ? 'Finn kandidater' : 'Finn muligheter'}</h3>
              <p>
                {isCompany
                  ? 'Beskriv behovet ditt og nå ut til studenter med riktig kompetanse.'
                  : 'Se gjennom hundrevis av praksisplasser fra ledende bedrifter.'}
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h3>{isCompany ? 'Enkel publisering' : 'Enkel søknad'}</h3>
              <p>
                {isCompany
                  ? 'Opprett og publiser stillingsannonser raskt, med eller uten AI.'
                  : 'Søk på stillinger med noen få klikk og følg søknadene dine.'}
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>{isCompany ? 'Bygg talentpipeline' : 'Nettverk'}</h3>
              <p>
                {isCompany
                  ? 'Få oversikt over praksisforløp og bygg relasjoner med fremtidige ansatte.'
                  : 'Knytt kontakt med mentorer og fagpersoner innen ditt interessefelt.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Internships Section */}
      <section className="latest-internships">
        <div className="container">
          <h2>{isCompany ? 'Eksempler på aktive oppdrag' : 'Siste praksisplasser'}</h2>
          <div className="internship-list">
            {latestInternships.map((internship) => (
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
                  <strong>Kompensasjon:</strong> {getCompensationSummary(internship)}
                </p>
                <button type="button" className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '8px 20px' }}>
                  Se mer info
                </button>
              </div>
            ))}
          </div>
          <div className="center-btn">
            <Link to="/internships" className="btn btn-secondary">
              {isCompany ? 'Se kandidatmarked' : 'Se alle praksisplasser'}
            </Link>
          </div>
        </div>
      </section>

      <InternshipDetailsModal
        internship={selectedInternship}
        onClose={() => setSelectedInternship(null)}
        userRole={userRole}
      />

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="container">
          <h2>{isCompany ? 'Klar til å publisere neste oppdrag?' : 'Klar for å starte praksisreisen?'}</h2>
          <p>
            {isCompany
              ? 'Bruk Praksisportal til å skrive, publisere og følge opp praksisannonser på ett sted.'
              : 'Bli med tusenvis av studenter som har funnet sin perfekte praksis gjennom Praksisportal.'}
          </p>
          <Link to={isCompany ? '/Chatbot_test' : '/apply'} className="btn btn-primary">
            {isCompany ? 'Opprett annonse nå' : 'Søk nå'}
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact" id="contact">
        <div className="container">
          <h2>Kontakt oss</h2>
          <div className="contact-content">
            <div className="contact-info">
              <h3>Ta kontakt</h3>
              <p><strong>E-post:</strong> info@praksisportal.com</p>
              <p><strong>Telefon:</strong> +47 123 45 678</p>
              <p><strong>Adresse:</strong> School Street 1, 0000 City, Norge</p>
            </div>
            <form className="contact-form" onSubmit={handleContactSubmit} ref={contactFormRef}>
              <input type="text" placeholder="Ditt navn" required />
              <input type="email" placeholder="Din e-post" required />
              <textarea placeholder="Din melding" rows="5" style={{ resize: 'none' }} required></textarea>
              <button type="submit" className="btn btn-primary">Send melding</button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
