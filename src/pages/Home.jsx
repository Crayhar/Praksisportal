import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { internships } from '../data/internships';
import Footer from '../components/Footer';

export default function Home() {
  const contactFormRef = useRef(null);

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

  return (
    <main>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Velkommen til Praksisportal</h1>
          <p>Din inngangsport til ekte arbeidserfaring</p>
          <Link to="/internships" className="btn btn-primary">Utforsk praksisplasser</Link>
          <Link to="/Chatbot_test" className="btn btn-secondary">Test Chatbot</Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Hvorfor velge vår portal?</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Finn muligheter</h3>
              <p>Se gjennom hundrevis av praksisplasser fra ledende bedrifter.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h3>Enkel søknad</h3>
              <p>Søk på stillinger med noen få klikk og følg søknadene dine.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Nettverk</h3>
              <p>Knytt kontakt med mentorer og fagpersoner innen ditt interessefelt.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Internships Section */}
      <section className="latest-internships">
        <div className="container">
          <h2>Siste praksisplasser</h2>
          <div className="internship-list">
            {latestInternships.map((internship) => (
              <div key={internship.id} className="internship-card">
                <h3>{internship.title}</h3>
                <p className="company">🏢 {internship.company}</p>
                <p className="location">📍 {internship.location}</p>
                <p>{internship.description}</p>
                <Link to="/apply" className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '8px 20px' }}>
                  Søk nå
                </Link>
              </div>
            ))}
          </div>
          <div className="center-btn">
            <Link to="/internships" className="btn btn-secondary">Se alle praksisplasser</Link>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Klar for å starte praksisreisen?</h2>
          <p>Bli med tusenvis av studenter som har funnet sin perfekte praksis gjennom Praksisportal.</p>
          <Link to="/apply" className="btn btn-primary">Søk nå</Link>
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
