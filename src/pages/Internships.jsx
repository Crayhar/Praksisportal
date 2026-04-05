import { useMemo, useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import Footer from '../components/Footer';
import InternshipDetailsModal from '../components/InternshipDetailsModal';
import { defaultStudentProfile } from '../data/portalData';
import { scoreCaseAgainstStudent } from '../utils/caseMatching';
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
    company: item.companyName || item.logo || 'Bedrift',
    companyName: item.companyName || item.logo || 'Bedrift',
    location: item.location,
    description: item.taskDescription,
    startDate: item.startDate,
    endDate: item.endDate,
    maxHours: item.maxHours,
    salaryType: item.salaryType,
    compensationAmount: item.compensationAmount,
    skills: qualifications,
    internshipCredits: true,
    classification: item.classification,
    professionalQualifications: Array.isArray(item.professionalQualifications)
      ? item.professionalQualifications.join(', ')
      : item.professionalQualifications || '',
    personalQualifications: Array.isArray(item.personalQualifications)
      ? item.personalQualifications.join(', ')
      : item.personalQualifications || '',
    assignmentContext: item.assignmentContext || item.taskDescription,
    deliveries: item.deliveries || '',
    expectations: item.expectations || '',
    startWithin: item.startWithin || '',
    generatedAd: item.generatedAd || item.generatedAdData?.markdown || '',
    generatedAdData: item.generatedAdData || null,
    website: item.website || '',
    companySummary: item.generatedAdData?.companySummary || item.companyProfileDescription || item.companyQualifications || '',
    companyDescription: item.companyProfileDescription || item.companyQualifications || '',
    companyQualifications: item.companyQualifications
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
  const { userRole: authRole } = useContext(AuthContext);
  const isCompany = authRole === 'company';
  const isStudent = authRole === 'student';

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(isStudent ? 'match-high' : 'newest');
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [studentProfile, setStudentProfile] = useState(defaultStudentProfile);
  const [publishedCases, setPublishedCases] = useState([]);

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
          console.log('Updated student profile:', formattedProfile);
          setStudentProfile(formattedProfile);
        } else {
          setStudentProfile(defaultStudentProfile);
        }

        const casesData = await casesAPI.listPublished();
        console.log('Fetched published cases:', casesData);
        const mapped = casesData.map(mapPublishedCaseToInternship);
        setPublishedCases(mapped);
      } catch (err) {
        console.error('Failed to load data:', err);
        // Fallback to defaults on error
        setStudentProfile(defaultStudentProfile);
        setPublishedCases([]);
      }
    };

    loadData();
  }, [isStudent, location.pathname]);
  const internshipFeed = useMemo(() => publishedCases, [publishedCases]);

  const getCompensationSummary = (internship) =>
    internship.salaryType === 'hourly'
      ? `Timelønn: ${internship.compensationAmount} NOK/time`
      : `Fastpris: ${internship.compensationAmount} NOK`;

  const filteredInternships = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let filtered = internshipFeed.filter(
      (internship) =>
        internship.title.toLowerCase().includes(query) ||
        internship.company.toLowerCase().includes(query) ||
        internship.location.toLowerCase().includes(query)
    );

    // Apply sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'title-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'no'));
        break;
      case 'title-desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title, 'no'));
        break;
      case 'newest':
        // Published cases are newer, so they come first
        sorted.sort((a, b) => {
          const aIsPublished = publishedCases.some(c => c.id === a.id);
          const bIsPublished = publishedCases.some(c => c.id === b.id);
          if (aIsPublished && !bIsPublished) return -1;
          if (!aIsPublished && bIsPublished) return 1;
          return 0;
        });
        break;
      case 'oldest':
        // Static internships come first
        sorted.sort((a, b) => {
          const aIsPublished = publishedCases.some(c => c.id === a.id);
          const bIsPublished = publishedCases.some(c => c.id === b.id);
          if (!aIsPublished && bIsPublished) return -1;
          if (aIsPublished && !bIsPublished) return 1;
          return 0;
        });
        break;
      case 'match-high':
        if (isStudent) {
          sorted.sort((a, b) => {
            const aScore = scoreCaseAgainstStudent(mapInternshipToCaseLike(a), studentProfile).totalScore;
            const bScore = scoreCaseAgainstStudent(mapInternshipToCaseLike(b), studentProfile).totalScore;
            return bScore - aScore;
          });
        }
        break;
      case 'match-low':
        if (isStudent) {
          sorted.sort((a, b) => {
            const aScore = scoreCaseAgainstStudent(mapInternshipToCaseLike(a), studentProfile).totalScore;
            const bScore = scoreCaseAgainstStudent(mapInternshipToCaseLike(b), studentProfile).totalScore;
            return aScore - bScore;
          });
        }
        break;
      default:
        break;
    }

    return sorted;
  }, [internshipFeed, searchQuery, sortBy, isStudent, studentProfile, publishedCases]);
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
          {/* Search and Sort Controls */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
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
              style={{ flex: '1 1 300px', minWidth: '300px' }}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '10px 15px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: '#fff',
                cursor: 'pointer',
                minWidth: '200px',
                flex: '0 1 auto',
              }}
            >
              <option value="newest">Nyeste først</option>
              <option value="oldest">Eldste først</option>
              <option value="title-asc">Tittel (A-Z)</option>
              <option value="title-desc">Tittel (Z-A)</option>
              {isStudent && <option value="match-high">Best match først</option>}
              {isStudent && <option value="match-low">Lavest match først</option>}
            </select>
          </div>

          {/* Internship Cards */}
          <div className="internship-list">
            {filteredInternships.length > 0 ? (
              filteredInternships.map((internship) => (
                (() => {
                  const matchSummary = isStudent
                    ? scoreCaseAgainstStudent(mapInternshipToCaseLike(internship), studentProfile)
                    : null;

                  if (internship.title?.includes('Full Stack') || internship.title?.includes('Fullstack')) {
                    console.log('Full Stack internship match calculation:', {
                      title: internship.title,
                      matchScore: matchSummary?.totalScore,
                      caseLike: mapInternshipToCaseLike(internship),
                      studentProfile: studentProfile
                    });
                  }

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
