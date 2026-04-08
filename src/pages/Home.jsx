import { useRef, useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import Footer from '../components/Footer';
import InternshipDetailsModal from '../components/InternshipDetailsModal';
import { defaultStudentProfile } from '../data/portalData';
import { scoreCaseAgainstStudent } from '../utils/caseMatching';
import { studentProfile as studentProfileAPI, cases as casesAPI } from '../utils/api';

function mapPublishedCaseToInternship(item) {
  const toStringArray = (val) =>
    Array.isArray(val) ? val : typeof val === 'string' ? val.split(/\n|,/).map((v) => v.trim()).filter(Boolean) : [];

  const requiredQuals = toStringArray(item.requiredQualifications || item.professionalQualifications);
  const preferredQuals = toStringArray(item.preferredQualifications);

  return {
    id: item.id,
    title: item.title,
    company: item.companyName || item.logo || 'Bedrift',
    companyName: item.companyName || item.logo || 'Bedrift',
    location: item.location,
    description: item.taskDescription,
    startDate: item.startDate,
    endDate: item.endDate,
    maxHours: item.maxHours,
    skills: requiredQuals,
    requiredQualifications: requiredQuals,
    preferredQualifications: preferredQuals,
    internshipCredits: true,
    classification: item.classification,
    personalQualifications: Array.isArray(item.personalQualifications)
      ? item.personalQualifications.join(', ')
      : item.personalQualifications || '',
    assignmentContext: item.assignmentContext || item.taskDescription,
    deliveries: item.deliveries || '',
    expectations: item.expectations || '',
    generatedAd: item.generatedAd || item.generatedAdData?.markdown || '',
    generatedAdData: item.generatedAdData || null,
    website: item.website || '',
    companySummary: item.generatedAdData?.companySummary || item.companyProfileDescription || item.companyQualifications || '',
    companyDescription: item.companyProfileDescription || item.companyQualifications || '',
    companyQualifications: Array.isArray(item.companyQualifications)
      ? item.companyQualifications
      : item.companyQualifications
        ? item.companyQualifications.split(/\n|,/).map((value) => value.trim()).filter(Boolean)
        : [],
    workAreas: item.workAreas || [],
    industry: item.industry || '',
    companySize: item.companySize || '',
  };
}

function mapInternshipToCaseLike(internship) {
  return {
    title: internship.title,
    taskFocus: internship.title,
    assignmentContext: internship.assignmentContext || internship.description,
    taskDescription: internship.description,
    deliveries: internship.deliveries || '',
    expectations: internship.expectations || '',
    requiredQualifications: internship.requiredQualifications?.join(', ') || internship.skills.join(', '),
    preferredQualifications: internship.preferredQualifications?.join(', ') || '',
    personalQualifications: internship.personalQualifications || '',
    startDate: internship.startDate,
    endDate: internship.endDate,
    maxHours: internship.maxHours,
    location: internship.location,
    technicalTerms: internship.skills.join(', '),
  };
}

export default function Home({ userRole, setUserRole }) {
  const { userRole: authRole } = useContext(AuthContext);
  const location = useLocation();
  const contactFormRef = useRef(null);
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [studentProfile, setStudentProfile] = useState(defaultStudentProfile);
  const [publishedCases, setPublishedCases] = useState([]);

  const isCompany = authRole === 'company';
  const isStudent = authRole === 'student';

  // Fetch student profile and published cases from API
  useEffect(() => {
    const loadData = async () => {
      try {
        if (isStudent) {
          const profileData = await studentProfileAPI.get();
          // Convert API response skills format to UI format
          const skills = profileData.skills?.map(s => ({
            name: s.name,
            level: s.level || 3
          })) || [];

          const formattedProfile = {
            ...profileData,
            skills,
            firstName: profileData.firstName || '',
            lastName: profileData.lastName || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            school: profileData.school || '',
            field: profileData.field || '',
            degreeLevel: profileData.degree_level || '',
            graduationYear: profileData.graduation_year,
            location: profileData.location || '',
            notificationThreshold: profileData.notification_threshold || 65,
          };
          setStudentProfile(formattedProfile);
        } else {
          setStudentProfile(defaultStudentProfile);
        }

        const casesData = await casesAPI.listPublished();
        setPublishedCases(casesData.map(mapPublishedCaseToInternship));
      } catch (err) {
        console.error('Failed to load data:', err);
        // Fallback to defaults on error
        setStudentProfile(defaultStudentProfile);
        setPublishedCases([]);
      }
    };

    loadData();
  }, [isStudent]);

  // Scroll to contact section if requested
  useEffect(() => {
    if (location.state?.scrollTo === 'contact') {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        // Clear the state so it doesn't scroll again on subsequent renders
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [location]);

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

  const latestInternships = publishedCases.slice(0, 3);

  return (
    <main>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>{isCompany ? 'Velkommen til bedriftssiden i Praksisportal' : 'Velkommen til Praksisportal'}</h1>
          <p>
            {isCompany
              ? 'Publiser oppdrag, finn riktige kandidater og bruk AI til å skrive rekrutteringsprosjekter.'
              : 'Din inngangsport til ekte arbeidserfaring og relevante praksisplasser.'}
          </p>

          <div className={`hero-actions ${isCompany ? 'hero-actions-company' : ''}`}>
            <Link to={isCompany ? '/Chatbot_test' : '/internships'} className="btn btn-primary">
              {isCompany ? 'Opprett prosjekt' : 'Utforsk praksisplasser'}
            </Link>
            {isCompany ? (
              <Link to="/profile" className="btn btn-secondary">
                Se bedriftsoversikt
              </Link>
            ) : null}
          </div>
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
                  ? 'Opprett og publiser stillingsprosjekter raskt, med eller uten AI.'
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
          {isStudent ? (
            <div className="student-insight-grid">
              <div className="feature-card text-left">
                <h3>Profilmatch</h3>
                <p>Ferdigheter oppdateres fra profilsiden og brukes direkte i praksismatchingen.</p>
              </div>
              <div className="feature-card text-left">
                <h3>{studentProfile.skills.length} rangerte ferdigheter</h3>
                <p>Toppskill: {studentProfile.skills.slice().sort((a, b) => b.level - a.level)[0]?.name || 'Ikke satt'}</p>
              </div>
              <div className="feature-card text-left">
                <h3>{studentProfile.notificationThreshold}% varslingsterskel</h3>
                <p>Endres direkte fra profilsiden.</p>
              </div>
            </div>
          ) : null}
          <div className="internship-list">
            {latestInternships.map((internship) => {
              const matchSummary = isStudent
                ? scoreCaseAgainstStudent(mapInternshipToCaseLike(internship), studentProfile)
                : null;

              return (
                <div
                  key={internship.id}
                  className="internship-card internship-card-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedInternship(matchSummary ? { ...internship, matchSummary } : internship)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedInternship(matchSummary ? { ...internship, matchSummary } : internship);
                    }
                  }}
                >
                  {matchSummary ? (
                    <div className="match-summary">
                      <div className="match-summary-copy">
                        <p className="match-summary-kicker">Din match</p>
                        <p className="match-summary-title">
                          {matchSummary.rankedSkillMatches[0]?.name || matchSummary.topQualification}
                        </p>
                      </div>
                      <div className="match-score match-score-sm">
                        <div className="match-score-inner">
                          <strong className="match-score-value match-score-value-sm">{matchSummary.totalScore}%</strong>
                          <span className="match-score-caption match-score-caption-sm">match</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <h3>{internship.title}</h3>
                  <p className="company">🏢 {internship.company}</p>
                  <p className="location">📍 {internship.location}</p>
                  <p>{internship.description}</p>
                  <p className="internship-meta">
                    <strong>Periode:</strong> {internship.startDate} til {internship.endDate}
                  </p>
                  <button type="button" className="btn btn-primary btn-inline-small">
                    Se mer info
                  </button>
                </div>
              );
            })}
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
              ? 'Bruk Praksisportal til å skrive, publisere og følge opp praksisprosjekter på ett sted.'
              : 'Bli med tusenvis av studenter som har funnet sin perfekte praksis gjennom Praksisportal.'}
          </p>
          <Link to={isCompany ? '/Chatbot_test' : '/apply'} className="btn btn-primary">
            {isCompany ? 'Opprett prosjekt nå' : 'Søk nå'}
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
              <p><strong>Adresse:</strong>  B R A Veien 4, 1757 Halden, Norge</p>
            </div>
            <form className="contact-form" onSubmit={handleContactSubmit} ref={contactFormRef}>
              <input type="text" placeholder="Ditt navn" required />
              <input type="email" placeholder="Din e-post" required />
              <textarea className="contact-textarea" placeholder="Din melding" rows="5" required></textarea>
              <button type="submit" className="btn btn-primary">Send melding</button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
