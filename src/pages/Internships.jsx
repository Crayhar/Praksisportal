import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { internships } from '../data/internships';
import Footer from '../components/Footer';
import InternshipDetailsModal from '../components/InternshipDetailsModal';
import { STORAGE_KEYS, defaultPublishedCases, defaultStudentProfile } from '../data/portalData';
import { scoreCaseAgainstStudent } from '../utils/caseMatching';
import { loadStoredJson } from '../utils/storage';

function mapPublishedCaseToInternship(item) {
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
    skills: item.professionalQualifications
      ? item.professionalQualifications.split(/\n|,/).map((value) => value.trim()).filter(Boolean)
      : [],
    internshipCredits: true,
    classification: item.classification,
    professionalQualifications: item.professionalQualifications || '',
    personalQualifications: item.personalQualifications || '',
    assignmentContext: item.assignmentContext || item.taskDescription,
    deliveries: item.deliveries || '',
    expectations: item.expectations || '',
    startWithin: item.startWithin || '',
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
    professionalQualifications:
      internship.professionalQualifications || internship.skills.join(', '),
    personalQualifications: internship.personalQualifications || '',
    startDate: internship.startDate,
    endDate: internship.endDate,
    maxHours: internship.maxHours,
    location: internship.location,
    startWithin: internship.startWithin || '',
    technicalTerms: internship.skills.join(', '),
  };
}

export default function Internships({ userRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInternship, setSelectedInternship] = useState(null);
  const isCompany = userRole === 'company';
  const isStudent = userRole === 'student';
  const studentProfile = useMemo(
    () => loadStoredJson(STORAGE_KEYS.studentProfile, defaultStudentProfile),
    []
  );
  const publishedCases = useMemo(
    () => loadStoredJson(STORAGE_KEYS.publishedCases, defaultPublishedCases).map(mapPublishedCaseToInternship),
    []
  );
  const internshipFeed = useMemo(() => [...publishedCases, ...internships], [publishedCases]);

  const getCompensationSummary = (internship) =>
    internship.salaryType === 'hourly'
      ? `Timelønn: ${internship.compensationAmount} NOK/time`
      : `Fastpris: ${internship.compensationAmount} NOK`;

  const filteredInternships = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return internshipFeed.filter(
      (internship) =>
        internship.title.toLowerCase().includes(query) ||
        internship.company.toLowerCase().includes(query) ||
        internship.location.toLowerCase().includes(query)
    );
  }, [internshipFeed, searchQuery]);
  const selectedFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const selectedId = params.get('selected');

    if (!selectedId) {
      return null;
    }

    const internship = internshipFeed.find((item) => String(item.id) === selectedId);

    if (!internship) {
      return null;
    }

    const matchSummary = isStudent
      ? scoreCaseAgainstStudent(mapInternshipToCaseLike(internship), studentProfile)
      : null;

    return matchSummary ? { ...internship, matchSummary } : internship;
  }, [internshipFeed, isStudent, location.search, studentProfile]);
  const activeSelectedInternship = selectedInternship || selectedFromUrl;

  const handleCloseModal = () => {
    setSelectedInternship(null);

    if (new URLSearchParams(location.search).get('selected')) {
      navigate('/internships', { replace: true });
    }
  };

  return (
    <main>
      {/* Page Header */}
      <section className="hero hero-short">
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
                (() => {
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
                          <div className="match-score match-score-md">
                            <div className="match-score-inner">
                              <strong className="match-score-value match-score-value-md">{matchSummary.totalScore}%</strong>
                              <span className="match-score-caption">match</span>
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
                      <p className="internship-meta">
                        <strong>Maks timer:</strong> {internship.maxHours}
                      </p>
                      <p className="internship-meta">
                        <strong>Kompensasjon:</strong> {getCompensationSummary(internship)}
                      </p>
                      <button type="button" className="btn btn-primary btn-inline-small">
                        Se mer info
                      </button>
                    </div>
                  );
                })()
              ))
            ) : (
              <p className="empty-grid-message">
                Ingen praksisplasser funnet. Prøv å endre søket ditt.
              </p>
            )}
          </div>
        </div>
      </section>

      <InternshipDetailsModal
        internship={activeSelectedInternship}
        onClose={handleCloseModal}
        userRole={userRole}
      />

      <Footer />
    </main>
  );
}
