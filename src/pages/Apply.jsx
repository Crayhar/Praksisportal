import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function Apply({ userRole }) {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const isCompany = userRole === 'company';

  const handleSubmit = (e) => {
    e.preventDefault();

    const fullName = formRef.current.querySelector('#fullName').value;
    const email = formRef.current.querySelector('#email').value;
    const position = formRef.current.querySelector('#position').value;

    if (!fullName || !email || !position) {
      alert('Vennligst fyll ut alle obligatoriske felt.');
      return;
    }

    alert(
      `Takk ${fullName}! Søknaden din er sendt.\n\nVi vil gjennomgå søknaden og kontakte deg på ${email} snart. Lykke til!`
    );

    formRef.current.reset();

    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  return (
    <main>
      {/* Page Header */}
      <section className="hero" style={{ minHeight: '300px' }}>
        <div className="hero-content">
          <h1>{isCompany ? 'Publiser praksisannonse' : 'Søk på praksisplass'}</h1>
          <p>{isCompany ? 'Denne visningen er for bedrifter som vil publisere et oppdrag.' : 'Ta det første steget mot dine karrieremål'}</p>
        </div>
      </section>

      {isCompany ? (
        <section className="contact" style={{ padding: '60px 20px' }}>
          <div className="container" style={{ maxWidth: '760px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem' }}>Bedrifter publiserer ikke via studentskjemaet</h2>
            <p style={{ marginBottom: '1.5rem', color: '#527174' }}>
              Som bedrift skal du bruke annonseverktøyet for å opprette en praksisannonse, med eller uten AI-hjelp.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/Chatbot_test')}>
              Gå til annonseverktøyet
            </button>
          </div>
        </section>
      ) : (
        <section className="contact" style={{ padding: '60px 20px' }}>
          <div className="container" style={{ maxWidth: '600px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Søknadsskjema for praksisplass</h2>
            <form id="applicationForm" ref={formRef} onSubmit={handleSubmit}>
            {/* Basic Information */}
              <fieldset>
                <legend>Personlig informasjon</legend>

                <label htmlFor="fullName">Fullt navn *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                />

                <label htmlFor="email">E-postadresse *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                />

                <label htmlFor="phone">Telefonnummer *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                />

                <label htmlFor="school">Universitet *</label>
                <input
                  type="text"
                  id="school"
                  name="school"
                  required
                />
              </fieldset>

            {/* Application Details */}
              <fieldset>
                <legend>Søknadsdetaljer</legend>

                <label htmlFor="position">Stilling du søker på *</label>
                <select
                  id="position"
                  name="position"
                  required
                >
                  <option value="">Velg en stilling...</option>
                  <option value="web-developer">Webutvikler - praksisplass</option>
                  <option value="ux-ui">UX/UI Design - praksisplass</option>
                  <option value="data-science">Data Science - praksisplass</option>
                  <option value="mobile-dev">Mobilutvikler - praksisplass</option>
                  <option value="marketing">Markedsføring - praksisplass</option>
                  <option value="backend">Backendutvikler - praksisplass</option>
                </select>

                <label htmlFor="coverLetter">Søknadsbrev *</label>
                <textarea
                  id="coverLetter"
                  name="coverLetter"
                  placeholder="Fortell hvorfor du er interessert i denne praksisplassen og hva du kan bidra med..."
                  rows="6"
                  required
                ></textarea>

                <label htmlFor="experience">Relevant erfaring</label>
                <textarea
                  id="experience"
                  name="experience"
                  placeholder="Beskriv relevante ferdigheter, prosjekter eller tidligere erfaring..."
                  rows="4"
                ></textarea>
              </fieldset>

            {/* Additional Information */}
              <fieldset>
                <legend>Tilleggsinformasjon</legend>

                <label>
                  <input type="checkbox" name="availability" required />
                  <span>Jeg er tilgjengelig for å starte praksisplassen innen de neste 3 månedene *</span>
                </label>

                <label>
                  <input type="checkbox" name="terms" required />
                  <span>Jeg godtar vilkår og betingelser *</span>
                </label>
              </fieldset>

            {/* Submit Button */}
              <div style={{ textAlign: 'center' }}>
                <button type="submit" className="btn btn-primary">Send søknad</button>
              </div>
            </form>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
