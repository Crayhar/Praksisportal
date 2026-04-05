import { useMemo, useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import Footer from '../components/Footer';
import { internships } from '../data/internships';
import {
  STORAGE_KEYS,
  defaultPublishedCases,
  defaultStudentProfile,
} from '../data/portalData';
import { scoreCaseAgainstStudent } from '../utils/caseMatching';
import { loadStoredJson } from '../utils/storage';
import { studentProfile as studentProfileAPI, cases as casesAPI } from '../utils/api';

function mapPublishedCaseToInternship(item) {
  // Handle professionalQualifications - could be array (from API) or string (from old data)
  const qualifications = Array.isArray(item.professionalQualifications)
    ? item.professionalQualifications
    : typeof item.professionalQualifications === 'string'
      ? item.professionalQualifications.split(/\n|,/).map((value) => value.trim()).filter(Boolean)
      : [];

  return {
    id: item.id,
    title: item.title,
    company: item.logo || 'Bedrift',
    location: item.location,
    description: item.taskDescription,
    startDate: item.startDate,
    endDate: item.endDate,
    maxHours: item.maxHours,
    salaryType: item.salaryType,
    compensationAmount: item.compensationAmount,
    skills: qualifications,
    professionalQualifications: Array.isArray(item.professionalQualifications)
      ? item.professionalQualifications.join(', ')
      : item.professionalQualifications || '',
    personalQualifications: Array.isArray(item.personalQualifications)
      ? item.personalQualifications.join(', ')
      : item.personalQualifications || '',
    assignmentContext: item.assignmentContext || item.taskDescription,
    deliveries: item.deliveries || '',
    expectations: item.expectations || '',
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
    professionalQualifications: internship.professionalQualifications || internship.skills.join(', '),
    personalQualifications: internship.personalQualifications || '',
    startDate: internship.startDate,
    endDate: internship.endDate,
    maxHours: internship.maxHours,
    location: internship.location,
    technicalTerms: internship.skills.join(', '),
  };
}

export default function Apply({ userRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole: authRole, user } = useContext(AuthContext);
  const isCompany = authRole === 'company';

  const [studentProfile, setStudentProfile] = useState(null);
  const [publishedCases, setPublishedCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch student profile and published cases from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        if (authRole === 'student') {
          const profileData = await studentProfileAPI.get();
          console.log('Loaded student profile:', profileData);
          // Format the API response to match the form structure
          const formattedProfile = {
            ...profileData,
            firstName: profileData.firstName || '',
            lastName: profileData.lastName || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            headline: profileData.headline || '',
            bio: profileData.bio || '',
            school: profileData.school || '',
            field: profileData.field || '',
            degreeLevel: profileData.degree_level || '',
            graduationYear: profileData.graduation_year,
            location: profileData.location || '',
            notificationThreshold: profileData.notification_threshold || 65,
            skills: profileData.skills || [],
          };
          console.log('Formatted profile:', formattedProfile);
          setStudentProfile(formattedProfile);
        } else {
          // For non-logged-in or company users, use default
          setStudentProfile(defaultStudentProfile);
        }
        const casesData = await casesAPI.listPublished();
        setPublishedCases(casesData.map(mapPublishedCaseToInternship));
      } catch (err) {
        console.error('Failed to load data:', err);
        // For students, allow empty form instead of blocking them
        if (authRole === 'student') {
          console.warn('API failed for student, using empty form');
          setStudentProfile({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            school: '',
            skills: [],
          });
        } else if (!authRole) {
          setStudentProfile(defaultStudentProfile);
        }
        setPublishedCases([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authRole]);
  const internshipFeed = useMemo(() => [...publishedCases, ...internships], [publishedCases]);
  const selectedId = useMemo(() => new URLSearchParams(location.search).get('selected'), [location.search]);
  const selectedInternship = useMemo(
    () => internshipFeed.find((item) => String(item.id) === selectedId) || null,
    [internshipFeed, selectedId]
  );
  const matchSummary = useMemo(
    () => (selectedInternship ? scoreCaseAgainstStudent(mapInternshipToCaseLike(selectedInternship), studentProfile) : null),
    [selectedInternship, studentProfile]
  );

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    school: '',
    position: '',
    coverLetter: '',
    experience: '',
    availability: false,
    terms: false,
  });

  // Update form when studentProfile or selectedInternship changes
  useEffect(() => {
    if (!loading && studentProfile) {
      console.log('Updating form with studentProfile:', studentProfile);
      setForm({
        fullName: `${studentProfile.firstName || ''} ${studentProfile.lastName || ''}`.trim(),
        email: studentProfile.email || '',
        phone: studentProfile.phone || '',
        school: studentProfile.school || '',
        position: selectedInternship?.title || '',
        coverLetter: '',
        experience: (studentProfile.skills || [])
          .slice()
          .sort((left, right) => (right.level || 0) - (left.level || 0))
          .slice(0, 4)
          .map((skill) => `${skill.name} (${skill.level || 0}/5)`)
          .join(', '),
        availability: false,
        terms: false,
      });
    }
  }, [studentProfile, selectedInternship, loading]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.fullName || !form.email || !form.position || !form.coverLetter || !form.availability || !form.terms) {
      alert('Vennligst fyll ut alle obligatoriske felt og huk av bekreftelsene.');
      return;
    }

    alert(
      `Takk ${form.fullName}. Søknaden til ${form.position} er sendt.\n\nVi bruker kontaktinformasjonen ${form.email} videre i prosessen.`
    );

    navigate('/profile');
  };

  if (loading) {
    return (
      <main>
        <section className="hero hero-apply">
          <div className="hero-content">
            <h1>Søk på praksisplass</h1>
            <p>Laster søknadskjema...</p>
          </div>
        </section>
      </main>
    );
  }

  if (isCompany) {
    return (
      <main>
        <section className="hero hero-short">
          <div className="hero-content">
            <h1>Publiser praksisannonse</h1>
            <p>Denne visningen er laget for studenter som skal sende søknad.</p>
          </div>
        </section>
        <section className="contact section-compact">
          <div className="container container-narrow text-center">
            <h2 className="section-title-bottom">Bedrifter publiserer via annonseverktøyet</h2>
            <p className="section-copy-bottom">
              Bruk bedriftsflyten for å opprette eller revidere praksisannonser.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/chatbot')}>
              Gå til annonseverktøyet
            </button>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  if (!studentProfile && !authRole) {
    return (
      <main>
        <section className="hero hero-apply">
          <div className="hero-content">
            <h1>Søk på praksisplass</h1>
            <p>Logg inn som student for å sende søknad.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero hero-apply">
        <div className="hero-content">
          <h1>Søk på praksisplass</h1>
          <p>
            {selectedInternship
              ? `Du søker nå på ${selectedInternship.title} hos ${selectedInternship.company}.`
              : 'Velg en annonse fra markedet eller send en generell praksissøknad.'}
          </p>
        </div>
      </section>

      <section className="apply-shell">
        <div className="apply-layout">
          <aside className="apply-panel apply-panel-muted">
            <h2>Valgt annonse</h2>
            {selectedInternship ? (
              <>
                <p className="apply-copy">
                  {selectedInternship.company} • {selectedInternship.location}
                </p>
                <h3 className="apply-section-title">{selectedInternship.title}</h3>
                <p className="apply-copy">{selectedInternship.description}</p>

                {matchSummary ? (
                  <div className="apply-metric">
                    <div className="apply-score">
                      <div className="match-score-inner">
                        <strong className="apply-score-value">{matchSummary.totalScore}%</strong>
                        <span className="apply-score-caption">match</span>
                      </div>
                    </div>
                    <div className="match-summary-copy">
                      <p className="apply-kicker">Beste treff</p>
                      <p className="apply-highlight">
                        {matchSummary.rankedSkillMatches[0]?.name || matchSummary.topQualification}
                      </p>
                      <p className="apply-copy apply-copy-tight">
                        Kravene passer best mot profilen din på dette området akkurat nå.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="apply-panel-space">
                  <p><strong>Ønskede ferdigheter</strong></p>
                  <div className="apply-chip-list">
                    {selectedInternship.skills.map((skill) => (
                      <span key={skill} className="apply-chip">{skill}</span>
                    ))}
                  </div>
                </div>

                <div className="apply-copy-block">
                  <p><strong>Periode:</strong> {selectedInternship.startDate} til {selectedInternship.endDate}</p>
                  <p><strong>Omfang:</strong> {selectedInternship.maxHours} timer</p>
                </div>
              </>
            ) : (
              <p className="apply-copy apply-copy-first">
                Ingen spesifikk annonse er valgt. Gå til markedet eller profilsiden og velg en anbefalt annonse for å få en mer presis søknadsflyt.
              </p>
            )}

            <div className="apply-profile-block">
              <h3>Profilutdrag</h3>
              <p className="apply-copy">{studentProfile.headline}</p>
              <div className="apply-chip-list">
                {studentProfile.skills
                  .slice()
                  .sort((left, right) => right.level - left.level)
                  .slice(0, 4)
                  .map((skill) => (
                    <span key={skill.name} className="apply-chip">{skill.name} ({skill.level}/5)</span>
                  ))}
              </div>
            </div>
          </aside>

          <section className="apply-panel">
            <h2>Send søknad</h2>
            <p className="apply-copy">
              Skjemaet er forhåndsutfylt med informasjon fra studentprofilen. Juster teksten før innsending.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="apply-grid apply-grid-top">
                <label>
                  Fullt navn *
                  <input
                    className="apply-input"
                    value={form.fullName}
                    onChange={(event) => updateField('fullName', event.target.value)}
                  />
                </label>

                <label>
                  E-post *
                  <input
                    className="apply-input"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                  />
                </label>

                <label>
                  Telefon *
                  <input
                    className="apply-input"
                    value={form.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                  />
                </label>

                <label>
                  Universitet / skole *
                  <input
                    className="apply-input"
                    value={form.school}
                    onChange={(event) => updateField('school', event.target.value)}
                  />
                </label>

                <label className="full">
                  Hvilken annonse søker du på? *
                  <select
                    className="apply-select"
                    value={form.position}
                    onChange={(event) => updateField('position', event.target.value)}
                  >
                    <option value="">Velg en annonse...</option>
                    {internshipFeed.map((internship) => (
                      <option key={internship.id} value={internship.title}>
                        {internship.title} - {internship.company}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="full">
                  Kort motivasjon *
                  <textarea
                    className="apply-textarea"
                    rows="6"
                    value={form.coverLetter}
                    onChange={(event) => updateField('coverLetter', event.target.value)}
                    placeholder="Fortell hvorfor du er relevant for denne praksisplassen, hva du vil lære og hva du kan bidra med."
                  />
                </label>

                <label className="full">
                  Relevant erfaring og ferdigheter
                  <textarea
                    className="apply-textarea"
                    rows="5"
                    value={form.experience}
                    onChange={(event) => updateField('experience', event.target.value)}
                    placeholder="Beskriv prosjekter, kurs, verktøy og erfaring som er relevante for rollen."
                  />
                </label>
              </div>

              <label className="apply-check">
                <input
                  type="checkbox"
                  checked={form.availability}
                  onChange={(event) => updateField('availability', event.target.checked)}
                />
                <span>Jeg er tilgjengelig for oppstart innen den oppgitte perioden.</span>
              </label>

              <label className="apply-check">
                <input
                  type="checkbox"
                  checked={form.terms}
                  onChange={(event) => updateField('terms', event.target.checked)}
                />
                <span>Jeg godtar at søknaden sendes videre til bedriften.</span>
              </label>

              <div className="apply-actions">
                <button type="submit" className="btn btn-primary">Send søknad</button>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/internships')}>
                  Se flere annonser
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>

      <Footer />
    </main>
  );
}
