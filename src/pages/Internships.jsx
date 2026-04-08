import { useMemo, useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    title: item.generatedAdData?.title || item.title,
    company: item.companyName || item.logo || 'Bedrift',
    companyName: item.companyName || item.logo || 'Bedrift',
    location: item.location,
    description: item.generatedAdData?.summary || item.taskDescription,
    taskDescription: item.taskDescription,
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
    startWithin: item.startWithin || '',
    generatedAd: item.generatedAd || item.generatedAdData?.markdown || '',
    generatedAdData: item.generatedAdData || null,
    website: item.website || '',
    companySummary: item.generatedAdData?.companySummary || item.companyQualifications || '',
    companyDescription: item.companyQualifications || '',
    companyQualifications: toStringArray(item.companyQualifications),
    workAreas: item.workAreas || [],
    industry: item.industry || '',
    companySize: item.companySize || '',
    offerings: Array.isArray(item.offerings) ? item.offerings : [],
    offeringOther: item.offeringOther || '',
    workMode: item.workMode || '',
    roleTrack: item.roleTrack || '',
    scopePreset: item.scopePreset || '',
  };
}

function mapInternshipToCaseLike(internship) {
  return {
    title: internship.title,
    taskFocus: internship.title,
    assignmentContext: internship.assignmentContext || internship.taskDescription || internship.description,
    taskDescription: internship.taskDescription || internship.description,
    deliveries: internship.deliveries || '',
    expectations: internship.expectations || '',
    requiredQualifications: internship.requiredQualifications?.join(', ') || internship.skills.join(', '),
    preferredQualifications: internship.preferredQualifications?.join(', ') || '',
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    workMode: '',
    classification: '',
    roleTrack: '',
    startWithin: '',
  });
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

  const filterOptions = useMemo(() => {
    const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'no'));
    return {
      locations: uniq(internshipFeed.map((i) => i.location)),
      workModes: uniq(internshipFeed.map((i) => i.workMode)),
      classifications: uniq(internshipFeed.map((i) => i.classification)),
      roleTracks: uniq(internshipFeed.map((i) => i.roleTrack)),
      startWithins: uniq(internshipFeed.map((i) => i.startWithin)),
    };
  }, [internshipFeed]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters({ location: '', workMode: '', classification: '', roleTrack: '', startWithin: '' });

  const filteredInternships = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let filtered = internshipFeed.filter((internship) => {
      // Text search
      if (
        query &&
        !internship.title.toLowerCase().includes(query) &&
        !internship.company.toLowerCase().includes(query) &&
        !(internship.location || '').toLowerCase().includes(query)
      ) return false;
      // Filters
      if (filters.location && internship.location !== filters.location) return false;
      if (filters.workMode && internship.workMode !== filters.workMode) return false;
      if (filters.classification && internship.classification !== filters.classification) return false;
      if (filters.roleTrack && internship.roleTrack !== filters.roleTrack) return false;
      if (filters.startWithin && internship.startWithin !== filters.startWithin) return false;
      return true;
    });

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
          {/* Search, Sort and Filter Controls */}
          <div className="internship-controls">
            {/* Top row: search + sort + filter toggle */}
            <div className="internship-controls-row">
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
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Nyeste først</option>
                <option value="oldest">Eldste først</option>
                <option value="title-asc">Tittel (A-Z)</option>
                <option value="title-desc">Tittel (Z-A)</option>
                {isStudent && <option value="match-high">Beste match først</option>}
                {isStudent && <option value="match-low">Laveste match først</option>}
              </select>
              <button
                type="button"
                className={`btn btn-secondary filter-toggle-btn${filtersOpen ? ' active' : ''}`}
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M3 6h18v2H3zm3 5h12v2H6zm3 5h6v2H9z" />
                </svg>
                Filter
                {activeFilterCount > 0 && (
                  <span className="filter-badge">{activeFilterCount}</span>
                )}
              </button>
            </div>

            {/* Expandable filter panel */}
            {filtersOpen && (
              <div className="filter-panel">
                <div className="filter-panel-grid">
                  {/* Location */}
                  <label className="filter-label">
                    <span>Sted</span>
                    <select
                      className="filter-select"
                      value={filters.location}
                      onChange={(e) => setFilter('location', e.target.value)}
                    >
                      <option value="">Alle steder</option>
                      {filterOptions.locations.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </label>

                  {/* Work mode */}
                  <label className="filter-label">
                    <span>Arbeidsform</span>
                    <select
                      className="filter-select"
                      value={filters.workMode}
                      onChange={(e) => setFilter('workMode', e.target.value)}
                    >
                      <option value="">Alle former</option>
                      {filterOptions.workModes.map((wm) => (
                        <option key={wm} value={wm}>
                          {wm === 'onsite' ? 'På stedet' : wm === 'hybrid' ? 'Hybrid' : wm === 'remote' ? 'Hjemmefra' : wm}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Classification */}
                  <label className="filter-label">
                    <span>Type praksis</span>
                    <select
                      className="filter-select"
                      value={filters.classification}
                      onChange={(e) => setFilter('classification', e.target.value)}
                    >
                      <option value="">Alle typer</option>
                      {filterOptions.classifications.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>

                  {/* Role track */}
                  <label className="filter-label">
                    <span>Fagretning</span>
                    <select
                      className="filter-select"
                      value={filters.roleTrack}
                      onChange={(e) => setFilter('roleTrack', e.target.value)}
                    >
                      <option value="">Alle retninger</option>
                      {filterOptions.roleTracks.map((rt) => (
                        <option key={rt} value={rt}>
                          {rt === 'frontend' ? 'Frontend' : rt === 'ux' ? 'UX / Design' : rt === 'data' ? 'Data / Analyse' : rt === 'fullstack' ? 'Full Stack' : rt === 'backend' ? 'Backend' : rt === 'unsure' ? 'Generell' : rt}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Start within */}
                  <label className="filter-label">
                    <span>Oppstart innen</span>
                    <select
                      className="filter-select"
                      value={filters.startWithin}
                      onChange={(e) => setFilter('startWithin', e.target.value)}
                    >
                      <option value="">Alle perioder</option>
                      {filterOptions.startWithins.map((sw) => (
                        <option key={sw} value={sw}>{sw}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {activeFilterCount > 0 && (
                  <button type="button" className="btn btn-secondary btn-small filter-clear-btn" onClick={clearFilters}>
                    Nullstill filter ({activeFilterCount})
                  </button>
                )}
              </div>
            )}

            {/* Active filter chips */}
            {activeFilterCount > 0 && !filtersOpen && (
              <div className="filter-chips">
                {filters.location && <span className="filter-chip">📍 {filters.location} <button onClick={() => setFilter('location', '')} aria-label="Fjern sted-filter">×</button></span>}
                {filters.workMode && <span className="filter-chip">🏢 {filters.workMode === 'onsite' ? 'På stedet' : filters.workMode === 'hybrid' ? 'Hybrid' : 'Hjemmefra'} <button onClick={() => setFilter('workMode', '')} aria-label="Fjern arbeidsform-filter">×</button></span>}
                {filters.classification && <span className="filter-chip">🎓 {filters.classification} <button onClick={() => setFilter('classification', '')} aria-label="Fjern type-filter">×</button></span>}
                {filters.roleTrack && <span className="filter-chip">💻 {filters.roleTrack === 'frontend' ? 'Frontend' : filters.roleTrack === 'ux' ? 'UX / Design' : filters.roleTrack === 'data' ? 'Data / Analyse' : filters.roleTrack === 'fullstack' ? 'Full Stack' : filters.roleTrack === 'backend' ? 'Backend' : filters.roleTrack} <button onClick={() => setFilter('roleTrack', '')} aria-label="Fjern fagretning-filter">×</button></span>}
                {filters.startWithin && <span className="filter-chip">📅 {filters.startWithin} <button onClick={() => setFilter('startWithin', '')} aria-label="Fjern periode-filter">×</button></span>}
                <button type="button" className="filter-chip filter-chip-clear" onClick={clearFilters}>Nullstill alle</button>
              </div>
            )}
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
