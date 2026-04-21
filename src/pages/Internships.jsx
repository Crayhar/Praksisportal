import { useMemo, useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import Footer from '../components/Footer';
import InternshipDetailsModal from '../components/InternshipDetailsModal';
import { defaultStudentProfile } from '../data/portalData';
import { scoreCaseAgainstStudent } from '../utils/caseMatching';
import { studentProfile as studentProfileAPI, cases as casesAPI } from '../utils/api';
import { getOfferingLabels } from '../utils/offerings';

const OFFERING_LABELS = {
  workplace: 'Mulighet for jobb etter oppdraget',
  certification: 'Sertifisering gjennom jobben',
  reference: 'Attest / referanse',
  mentorship: 'Fast mentor og tett oppfolging',
};

const WORK_MODE_MAP = {
  onsite: 'På stedet',
  hybrid: 'Hybrid',
  remote: 'Hjemmefra',
  hjemmefra: 'Hjemmefra',
  online: 'Hjemmefra',
};

const WORK_MODE_OPTIONS = ['onsite', 'hybrid', 'remote'];

function cleanLocationValue(location) {
  if (!location) return '';
  const val = String(location).toLowerCase().trim();
  const workModeKeywords = ['remote', 'online', 'hjemmefra', 'hybrid', 'on-site', 'onsite'];
  if (workModeKeywords.some(kw => val === kw || val.includes(kw))) {
    return '';
  }
  return location;
}

function removeNorwayFromLocation(location) {
  if (!location) return '';
  // Remove ", norge" or ",norge" suffixes (case-insensitive)
  return String(location).replace(/,\s*norge\s*$/i, '').trim();
}

function mapPublishedCaseToInternship(item) {
  const toStringArray = (val) =>
    Array.isArray(val) ? val : typeof val === 'string' ? val.split(/\n|,/).map((v) => v.trim()).filter(Boolean) : [];

  const requiredQuals = toStringArray(item.requiredQualifications || item.professionalQualifications);
  const preferredQuals = toStringArray(item.preferredQualifications);

  return {
    id: item.id,
    companyId: item.companyId || item.company_id || null,
    title: item.generatedAdData?.title || item.title,
    company: item.companyName || item.logo || 'Bedrift',
    companyName: item.companyName || item.logo || 'Bedrift',
    location: removeNorwayFromLocation(item.location),
    description: item.generatedAdData?.summary || item.taskDescription,
    taskDescription: item.taskDescription,
    startDate: item.startDate,
    endDate: item.endDate,
    maxHours: item.maxHours,
    skills: requiredQuals,
    requiredQualifications: requiredQuals,
    preferredQualifications: preferredQuals,
    internshipCredits: true,
    classification:
      typeof item.classification === 'string'
        ? item.classification
        : item.classification?.type || '',
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
    roleTrack: internship.roleTrack || '',
    workMode: internship.workMode || '',
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
    location: [],
    workMode: [],
    offerings: [],
    roleTrack: [],
    startWithin: [],
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
    
    const locations = uniq(internshipFeed.map((i) => cleanLocationValue(i.location)));
    const workModes = WORK_MODE_OPTIONS;
    const offerings = uniq(internshipFeed.flatMap((i) => i.offerings || []));
    const roleTracks = uniq(internshipFeed.map((i) => i.roleTrack));
    const startWithins = uniq(internshipFeed.map((i) => i.startWithin));
    
    return {
      locations,
      workModes,
      offerings,
      roleTracks,
      startWithins,
    };
  }, [internshipFeed]);

  const activeFilterCount = Object.values(filters).reduce((acc, value) => acc + value.length, 0);

  const toggleFilter = (key, value) => {
    setFilters((prev) => {
      const current = prev[key] || [];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  };

  const removeFilterValue = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((item) => item !== value),
    }));
  };

  const clearFilters = () =>
    setFilters({
      location: [],
      workMode: [],
      offerings: [],
      roleTrack: [],
      startWithin: [],
    });

  const filteredInternships = useMemo(() => {
    const query = searchQuery.toLowerCase();

    const normalize = (value) =>
      String(value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    const normalizeWorkMode = (value) => {
      const normalized = normalize(value);
      if (normalized === 'remote' || normalized === 'hjemmefra' || normalized === 'online') {
        return 'remote';
      }
      if (normalized === 'on-site' || normalized === 'onsite' || normalized === 'på stedet') {
        return 'onsite';
      }
      if (normalized === 'hybrid') {
        return 'hybrid';
      }
      return normalized;
    };

    const canonicalLocation = (value) =>
      normalize(value)
        .split(/[,/;|]/)[0]
        .replace(/\b(norge|norway)\b/g, '')
        .trim();

    const matchesLocation = (selectedValues, currentValue) => {
      if (selectedValues.length === 0) return true;
      const current = canonicalLocation(currentValue);
      return selectedValues.some((selected) => canonicalLocation(selected) === current);
    };

    const matchesSelection = (selectedValues, currentValue, allowPartial = false) => {
      if (selectedValues.length === 0) return true;
      const current = normalize(currentValue);
      return selectedValues.some((selected) => {
        const target = normalize(selected);
        if (!allowPartial) return current === target;
        return current === target || current.includes(target) || target.includes(current);
      });
    };

    const matchesWorkMode = (selectedValues, currentValue) => {
      if (selectedValues.length === 0) return true;
      const current = normalizeWorkMode(currentValue);
      return selectedValues.includes(current);
    };

    const matchesOfferings = (selectedValues, currentValues) => {
      if (selectedValues.length === 0) return true;
      const current = Array.isArray(currentValues) ? currentValues : [];
      return selectedValues.some((selected) => current.includes(selected));
    };

    let filtered = internshipFeed.filter((internship) => {
      // Text search
      if (
        query &&
        !internship.title.toLowerCase().includes(query) &&
        !internship.company.toLowerCase().includes(query) &&
        !(internship.location || '').toLowerCase().includes(query)
      ) return false;
      // Filters
      const locationValue = cleanLocationValue(internship.location) || '';
      const workModeValue = internship.workMode || '';
      const offeringsValue = internship.offerings || [];
      const roleTrackValue = internship.roleTrack || '';
      const startWithinValue = internship.startWithin || '';

      const passLocation = matchesLocation(filters.location, locationValue);
      const passWorkMode = matchesWorkMode(filters.workMode, workModeValue);
      const passOfferings = matchesOfferings(filters.offerings, offeringsValue);
      const passRoleTrack = matchesSelection(filters.roleTrack, roleTrackValue);
      const passStartWithin = matchesSelection(filters.startWithin, startWithinValue, true);

      if (!passLocation) return false;
      if (!passWorkMode) return false;
      if (!passOfferings) return false;
      if (!passRoleTrack) return false;
      if (!passStartWithin) return false;
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
  }, [internshipFeed, searchQuery, sortBy, isStudent, studentProfile, publishedCases, filters]);
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
                  <div className="filter-label">
                    <span>Sted</span>
                    <div className="filter-multi-list">
                      {filterOptions.locations.map((loc) => (
                        <label key={loc} className="filter-check">
                          <input
                            type="checkbox"
                            checked={filters.location.includes(loc)}
                            onChange={() => toggleFilter('location', loc)}
                          />
                          <span>{loc}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Work mode */}
                  <div className="filter-label">
                    <span>Arbeidsform</span>
                    <div className="filter-multi-list">
                      {filterOptions.workModes.map((wm) => (
                        <label key={wm} className="filter-check">
                          <input
                            type="checkbox"
                            checked={filters.workMode.includes(wm)}
                            onChange={() => toggleFilter('workMode', wm)}
                          />
                          <span>{WORK_MODE_MAP[wm] || wm}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Offerings */}
                  <div className="filter-label">
                    <span>Bedriften tilbyr</span>
                    <div className="filter-multi-list">
                      {filterOptions.offerings.map((o) => (
                        <label key={o} className="filter-check">
                          <input
                            type="checkbox"
                            checked={filters.offerings.includes(o)}
                            onChange={() => toggleFilter('offerings', o)}
                          />
                          <span>{OFFERING_LABELS[o] || o}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Role track */}
                  <div className="filter-label">
                    <span>Fagretning</span>
                    <div className="filter-multi-list">
                      {filterOptions.roleTracks.map((rt) => (
                        <label key={rt} className="filter-check">
                          <input
                            type="checkbox"
                            checked={filters.roleTrack.includes(rt)}
                            onChange={() => toggleFilter('roleTrack', rt)}
                          />
                          <span>{rt === 'frontend' ? 'Frontend' : rt === 'ux' ? 'UX / Design' : rt === 'data' ? 'Data / Analyse' : rt === 'fullstack' ? 'Full Stack' : rt === 'backend' ? 'Backend' : rt === 'unsure' ? 'Generell' : rt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Start within */}
                  <div className="filter-label">
                    <span>Oppstart innen</span>
                    <div className="filter-multi-list">
                      {filterOptions.startWithins.map((sw) => (
                        <label key={sw} className="filter-check">
                          <input
                            type="checkbox"
                            checked={filters.startWithin.includes(sw)}
                            onChange={() => toggleFilter('startWithin', sw)}
                          />
                          <span>{sw}</span>
                        </label>
                      ))}
                    </div>
                  </div>
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
                {filters.location.map((value) => (
                  <span key={`loc-${value}`} className="filter-chip">📍 {value} <button onClick={() => removeFilterValue('location', value)} aria-label="Fjern sted-filter">×</button></span>
                ))}
                {filters.workMode.map((value) => (
                  <span key={`wm-${value}`} className="filter-chip">🏢 {WORK_MODE_MAP[value] || value} <button onClick={() => removeFilterValue('workMode', value)} aria-label="Fjern arbeidsform-filter">×</button></span>
                ))}
                {filters.offerings.map((value) => (
                  <span key={`off-${value}`} className="filter-chip">🎁 {OFFERING_LABELS[value] || value} <button onClick={() => removeFilterValue('offerings', value)} aria-label="Fjern tilbud-filter">×</button></span>
                ))}
                {filters.roleTrack.map((value) => (
                  <span key={`rt-${value}`} className="filter-chip">💻 {value === 'frontend' ? 'Frontend' : value === 'ux' ? 'UX / Design' : value === 'data' ? 'Data / Analyse' : value === 'fullstack' ? 'Full Stack' : value === 'backend' ? 'Backend' : value} <button onClick={() => removeFilterValue('roleTrack', value)} aria-label="Fjern fagretning-filter">×</button></span>
                ))}
                {filters.startWithin.map((value) => (
                  <span key={`sw-${value}`} className="filter-chip">📅 {value} <button onClick={() => removeFilterValue('startWithin', value)} aria-label="Fjern periode-filter">×</button></span>
                ))}
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
                  const offeringLabels = getOfferingLabels(internship.offerings, internship.offeringOther);

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
                      <p className="company">
                        🏢{' '}
                        {internship.companyId ? (
                          <Link
                            className="company-profile-link"
                            to={`/companies/${internship.companyId}?fromCase=${internship.id}`}
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            {internship.company}
                          </Link>
                        ) : internship.company}
                      </p>
                      <p className="location">📍 {internship.location}</p>
                      <p>{internship.description}</p>
                      {offeringLabels.length > 0 ? (
                        <p className="internship-meta">
                          <strong>Tilbyr:</strong> {offeringLabels.join(' • ')}
                        </p>
                      ) : null}
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
