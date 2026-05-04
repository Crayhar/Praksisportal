import { useMemo, useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { NotificationContext } from '../contexts/NotificationContext';
import Footer from '../components/Footer';
import Spinner from '../components/Spinner';
import { scoreCaseAgainstStudent } from '../utils/caseMatching';
import { studentProfile, companyProfile, cases as casesAPI } from '../utils/api';
import { exportStudentProfileToPdf } from '../utils/pdfExport';
import { getOfferingLabels } from '../utils/offerings';

function normalizeUrl(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getLinkDomain(url) {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getFaviconUrl(url) {
  try {
    const domain = new URL(normalizeUrl(url)).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

function getPhoneLink(phone) {
  const normalized = String(phone || '').replace(/\s+/g, '');
  return normalized ? `tel:${normalized}` : '';
}

function capitalizeFirstLetter(value) {
  const input = String(value ?? '');
  if (!input) return '';

  const firstVisibleIndex = input.search(/\S/);
  if (firstVisibleIndex === -1) return input;

  return (
    input.slice(0, firstVisibleIndex) +
    input.charAt(firstVisibleIndex).toUpperCase() +
    input.slice(firstVisibleIndex + 1)
  );
}

function formatDate(dateString) {
  if (!dateString) {
    return 'Ikke satt';
  }

  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString));
}

function ChipList({ items }) {
  return (
    <div className="chip-list">
      {items.map((item) => (
        <span key={item} className="chip">
          {item}
        </span>
      ))}
    </div>
  );
}

function TagEditor({ label, items, onAdd, onRemove, placeholder, loading, tooltip, suggestions = [] }) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  };

  return (
    <div className="tag-editor">
      <p className="tag-editor-label">
        <strong>{label}</strong>
        {tooltip && <FieldTooltip text={tooltip} />}
      </p>
      <div className="tag-editor-input-row">
        <input
          className="tag-editor-input"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder={placeholder}
          disabled={loading}
        />
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={handleAdd}
          disabled={loading}
        >
          Legg til
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="tag-suggestions">
          {suggestions.filter(s => !items.includes(s)).slice(0, 8).map(s => (
            <button
              key={s}
              type="button"
              className="tag-suggestion-chip"
              onClick={() => onAdd(s)}
              disabled={loading}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      <div className="tag-editor-list">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onRemove(item)}
            className="tag-editor-chip"
            disabled={loading}
          >
            {item} ×
          </button>
        ))}
      </div>
    </div>
  );
}

function SkillEditor({ skills, onAdd, onRemove, onLevelChange, loading }) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState(3);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ name: trimmed, level });
    setName('');
    setLevel(3);
  };

  return (
    <div className="skill-editor">
      <p className="tag-editor-label">
        <strong>Ferdigheter og nivå</strong>
        <FieldTooltip text="Legg til tekniske og faglige ferdigheter. Velg nivå fra 1 (nybegynner) til 5 (svært sterk). Disse brukes direkte i matchmaking med bedrifter." />
      </p>
      <div className="skill-editor-grid">
        <input
          className="skill-editor-field"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="F.eks. React, Python eller Figma"
          disabled={loading}
        />
        <select
          className="skill-editor-field"
          value={level}
          onChange={(event) => setLevel(Number(event.target.value))}
          disabled={loading}
        >
          <option value={1}>1 - Nybegynner</option>
          <option value={2}>2 - Litt erfaring</option>
          <option value={3}>3 - God</option>
          <option value={4}>4 - Sterk</option>
          <option value={5}>5 - Svært sterk</option>
        </select>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={handleAdd}
          disabled={loading}
        >
          Legg til
        </button>
      </div>
      <div className="tag-suggestions">
        {SKILL_SUGGESTIONS.filter(s => !skills.some(sk => sk.name.toLowerCase() === s.toLowerCase())).slice(0, 8).map(s => (
          <button
            key={s}
            type="button"
            className="tag-suggestion-chip"
            onClick={() => onAdd({ name: s, level })}
            disabled={loading}
          >
            + {s}
          </button>
        ))}
      </div>
      <div className="skill-editor-list">
        {skills.map((skill) => (
          <div key={skill.name} className="skill-editor-card">
            <div>
              <strong>{skill.name}</strong>
            </div>
            <input
              className="skill-editor-field"
              type="range"
              min="1"
              max="5"
              value={skill.level}
              onChange={(event) => onLevelChange(skill.name, Number(event.target.value))}
              disabled={loading}
            />
            <div className="skill-editor-actions">
              <span>{skill.level}/5</span>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => onRemove(skill.name)}
                disabled={loading}
              >
                Fjern
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SKILL_SUGGESTIONS = [
  'JavaScript', 'React', 'Python', 'Java', 'TypeScript',
  'HTML/CSS', 'Node.js', 'SQL', 'Git', 'Figma',
  'Vue.js', 'C#', 'REST API', 'Agile/Scrum', 'UX-design',
];

const INTEREST_SUGGESTIONS = [
  'Webutvikling', 'Kunstig intelligens', 'UX-design', 'Dataanalyse',
  'Prosjektledelse', 'Cybersikkerhet', 'Spillutvikling', 'Mobilutvikling',
  'Skyteknologi', 'Bærekraft og teknologi',
];

const CHARACTERISTIC_SUGGESTIONS = [
  'Strukturert', 'Kreativ', 'Selvstendig', 'Teamorientert',
  'Løsningsorientert', 'Nøyaktig', 'Fleksibel', 'Initiativrik',
  'Kommunikativ', 'Analytisk',
];

const SUBJECT_SUGGESTIONS = [
  'Algoritmer og datastrukturer', 'Databaser', 'Nettverksteknologi',
  'Operativsystemer', 'Programvareutvikling', 'Maskinlæring',
  'Statistikk', 'Matematikk', 'Sikkerhet', 'Prosjektledelse',
];

function FieldTooltip({ text }) {
  return (
    <span className="field-tooltip-wrapper">
      <span className="field-tooltip-icon" aria-label="Mer informasjon" tabIndex={0}>?</span>
      <span className="field-tooltip-box" role="tooltip">{text}</span>
    </span>
  );
}

function ProfileCompletion({ data }) {
  const checks = [
    data.firstName, data.lastName, data.headline, data.bio,
    data.phone, data.location, data.school, data.field,
    data.degreeLevel, data.graduationYear,
    data.skills?.length > 0,
    data.professionalInterests?.length > 0,
    data.personalCharacteristics?.length > 0,
    data.link1,
  ];
  const filled = checks.filter(Boolean).length;
  const pct = Math.round((filled / checks.length) * 100);
  const label = pct < 40 ? 'Svak' : pct < 70 ? 'Middels' : pct < 100 ? 'God' : 'Komplett';
  return (
    <div className="profile-completion">
      <div className="profile-completion-header">
        <span>Profilstyrke – {label}</span>
        <span>{pct}%</span>
      </div>
      <div className="profile-completion-bar">
        <div className="profile-completion-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AccordionSection({ title, children, defaultOpen = true, completion }) {
  const [open, setOpen] = useState(defaultOpen);
  const pctClass = completion === undefined ? '' : completion === 100 ? 'pct-complete' : completion >= 50 ? 'pct-medium' : 'pct-low';
  return (
    <div className="accordion-section">
      <button
        type="button"
        className="accordion-header"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="accordion-header-right">
          {completion !== undefined && (
            <span className={`accordion-pct ${pctClass}`}>{completion}%</span>
          )}
          <span className="accordion-chevron">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}

function mapPublishedCaseToInternship(item) {
  const toStringArray = (val) =>
    Array.isArray(val) ? val : typeof val === 'string' ? val.split(/\n|,/).map((v) => v.trim()).filter(Boolean) : [];

  const requiredQuals = toStringArray(item.requiredQualifications || item.professionalQualifications);
  const preferredQuals = toStringArray(item.preferredQualifications);

  return {
    id: item.id,
    companyId: item.companyId,
    title: item.title,
    company: item.company || 'Bedrift',
    companyName: item.companyName || item.company || 'Bedrift',
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
    roleTrack: item.roleTrack || '',
    workMode: item.workMode || '',
    offerings: Array.isArray(item.offerings) ? item.offerings : [],
    offeringOther: item.offeringOther || '',
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

function mapPublishedCaseToMatch(item, student) {
  const internship = mapPublishedCaseToInternship(item);
  return {
    ...internship,
    scoreSummary: scoreCaseAgainstStudent(mapInternshipToCaseLike(internship), student),
  };
}

function formatCompanyData(data) {
  // Transform snake_case from database to camelCase for frontend
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    contactPerson: data.contact_person,
    email: data.email,
    phone: data.phone,
    website: data.website,
    logo: data.logo,
    industry: data.industry,
    size: data.size,
    location: data.location,
    description: data.description,
    registrationComplete: data.registration_complete,
    expectationsQualityScore: data.expectations_quality_score,
    companyQualifications: data.companyQualifications || [],
    workAreas: data.workAreas || [],
    hiringFocus: data.hiringFocus || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export default function StudentProfile({ userRole }) {
  const navigate = useNavigate();
  const { userRole: authRole } = useContext(AuthContext);
  const isCompany = authRole === 'company';

  const notifCtx = useContext(NotificationContext);
  const persistedNotifs = notifCtx?.items ?? [];
  const notifUnreadCount = notifCtx?.unreadCount ?? 0;

  const [student, setStudent] = useState(null);
  const [company, setCompany] = useState(null);
  const [publishedCases, setPublishedCases] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [companyEditData, setCompanyEditData] = useState(null);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (isCompany) {
          const companyData = await companyProfile.get();
          const formattedCompany = formatCompanyData(companyData);
          setCompany(formattedCompany);
          setCompanyEditData(formattedCompany);
        } else {
          const studentData = await studentProfile.get();
          // Convert API response skills format to UI format
          const skills = studentData.skills.map(s => ({
            name: s.name,
            level: s.level || 3
          }));

          const formattedStudent = {
            ...studentData,
            skills,
            firstName: studentData.firstName || '',
            lastName: studentData.lastName || '',
            email: studentData.email || '',
            phone: studentData.phone || '',
            headline: studentData.headline || '',
            bio: studentData.bio || '',
            school: studentData.school || '',
            field: studentData.field || '',
            degreeLevel: studentData.degree_level || '',
            graduationYear: studentData.graduation_year,
            location: studentData.location || '',
            notificationThreshold: studentData.notification_threshold || 65,
            inAppNotificationsEnabled:
              studentData.in_app_notifications_enabled === undefined
                ? true
                : Boolean(studentData.in_app_notifications_enabled),
            emailNotificationsEnabled:
              studentData.email_notifications_enabled === undefined
                ? false
                : Boolean(studentData.email_notifications_enabled),
            preferredRoleTracks: studentData.preferredRoleTracks || [],
            preferredWorkModes: studentData.preferredWorkModes || [],
            link1: studentData.link1 || '',
            link2: studentData.link2 || '',
            link3: studentData.link3 || ''
          };

          setStudent(formattedStudent);
          setEditData(formattedStudent);
        }

        const publishedCasesData = await casesAPI.listPublished();
        setPublishedCases(publishedCasesData);
      } catch (err) {
        setError(err.message);
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isCompany]);

  const activeStudent = student && (isEditing && !isCompany ? editData : student);
  const caseMatches = useMemo(
    () => {
      if (!activeStudent) return [];
      try {
        return publishedCases
          .map((item) => mapPublishedCaseToMatch(item, activeStudent))
          .sort((left, right) => right.scoreSummary.totalScore - left.scoreSummary.totalScore);
      } catch (err) {
        console.error('Error matching cases:', err);
        return [];
      }
    },
    [publishedCases, activeStudent]
  );

  const normalizeText = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const canonicalPlace = (value) =>
    normalizeText(value)
      .split(/[,/;|]/)[0]
      .replace(/\b(norge|norway)\b/g, '')
      .trim();

  const locationMatchesPreference = (caseLocation, studentLocation) => {
    const wanted = canonicalPlace(studentLocation);
    if (!wanted) return true;

    const currentRaw = normalizeText(caseLocation);
    if (currentRaw === 'remote') return true;

    const current = canonicalPlace(caseLocation);
    return current === wanted;
  };

  const notifications = activeStudent && activeStudent.inAppNotificationsEnabled !== false
    ? caseMatches.filter(
      (item) =>
        item.scoreSummary.totalScore >= activeStudent.notificationThreshold &&
        locationMatchesPreference(item.location, activeStudent.location)
    )
    : [];

  const caseMatchScoreById = useMemo(
    () => new Map(caseMatches.map((item) => [item.id, item.scoreSummary?.totalScore])),
    [caseMatches]
  );

  const updateStudentField = (name, value) => {
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const updateCompanyField = (name, value) => {
    setCompanyEditData((prev) => ({ ...prev, [name]: value }));
  };

  const capitalizeStudentField = (name) => {
    setEditData((prev) => ({
      ...prev,
      [name]: capitalizeFirstLetter(prev?.[name] || ''),
    }));
  };

  const capitalizeCompanyField = (name) => {
    setCompanyEditData((prev) => ({
      ...prev,
      [name]: capitalizeFirstLetter(prev?.[name] || ''),
    }));
  };

  const addSkill = (skill) => {
    setEditData((prev) => {
      const normalizedName = capitalizeFirstLetter(skill.name || '').trim();
      const exists = prev.skills.some((item) => item.name.toLowerCase() === normalizedName.toLowerCase());
      if (exists) return prev;
      return { ...prev, skills: [...prev.skills, { ...skill, name: normalizedName }] };
    });
  };

  const removeSkill = async (name) => {
    try {
      setSaving(true);
      await studentProfile.removeSkill(name);
      setEditData((prev) => ({
        ...prev,
        skills: prev.skills.filter((skill) => skill.name !== name),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSkillLevel = (name, level) => {
    setEditData((prev) => ({
      ...prev,
      skills: prev.skills.map((skill) => (skill.name === name ? { ...skill, level } : skill)),
    }));
  };

  const addTag = (field, value, isCompanyProfile = false) => {
    const normalizedValue = capitalizeFirstLetter(value || '').trim();
    if (!normalizedValue) return;

    if (isCompanyProfile) {
      setCompanyEditData((prev) => ({
        ...prev,
        [field]: prev[field].includes(normalizedValue) ? prev[field] : [...prev[field], normalizedValue],
      }));
    } else {
      setEditData((prev) => ({
        ...prev,
        [field]: prev[field].includes(normalizedValue) ? prev[field] : [...prev[field], normalizedValue],
      }));
    }
  };

  const removeTag = (field, value, isCompanyProfile = false) => {
    if (isCompanyProfile) {
      setCompanyEditData((prev) => ({
        ...prev,
        [field]: prev[field].filter((item) => item !== value),
      }));
    } else {
      setEditData((prev) => ({
        ...prev,
        [field]: prev[field].filter((item) => item !== value),
      }));
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setError(null);

      if (isCompany) {
        const updatedCompany = await companyProfile.update(companyEditData);
        const formattedCompany = formatCompanyData(updatedCompany);
        setCompany(formattedCompany);
        setCompanyEditData(formattedCompany);
      } else {
        await studentProfile.update(editData);
        setStudent(editData);

        // Save all skills
        for (const skill of editData.skills) {
          await studentProfile.addSkill(skill.name, skill.level);
        }

        // Save all interests
        // Map between frontend field names and backend interest_type values
        const interestMappings = {
          professionalInterests: 'professional_interest',
          personalCharacteristics: 'personal_characteristic',
          currentSubjects: 'current_subject',
          completedSubjects: 'completed_subject',
          preferredLocations: 'preferred_location',
          preferredRoleTracks: 'preferred_role_track',
          preferredWorkModes: 'preferred_work_mode',
        };

        // Save new interests
        for (const [fieldName, interestType] of Object.entries(interestMappings)) {
          const interests = editData[fieldName] || [];
          const originalInterests = student[fieldName] || [];

          // Add new interests that weren't there before
          const newInterests = interests.filter(
            (item) => !originalInterests.includes(item)
          );
          for (const interest of newInterests) {
            await studentProfile.addInterest(interestType, interest);
          }
        }
      }
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData(student);
    setCompanyEditData(company);
    setIsEditing(false);
  };

  const getStatusBadge = (score, threshold = activeStudent?.notificationThreshold || 65) => {
    if (score >= 80) return <span className="status-badge badge-accepted">Sterk match</span>;
    if (score >= threshold) return <span className="status-badge badge-pending">Relevant</span>;
    return <span className="status-badge badge-rejected">Lavere match</span>;
  };

  const openRecommendedAd = (id) => {
    navigate(`/internships?selected=${id}`);
  };

  const handleDownloadProfilePdf = () => {
    if (!student) {
      return;
    }

    exportStudentProfileToPdf(student, caseMatches, []);
  };

  if (loading) {
    return (
      <main className="student-profile">
        <div className="container">
          <Spinner label="Laster profil..." />
        </div>
      </main>
    );
  }

  if (!student && !company) {
    return (
      <main className="student-profile">
        <div className="container">
          <p style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
            {error || 'Kunne ikke laste profil. Sjekk at du er logget inn.'}
          </p>
        </div>
      </main>
    );
  }

  const profileData = isCompany ? company : student;
  const displayName = isCompany ? profileData.name : `${profileData.firstName} ${profileData.lastName}`;

  return (
    <main className="student-profile">
      <div className="container">
        <section className="profile-header profile-header-accent">
          <div className="profile-avatar">
            <div className="avatar-placeholder">
              {isCompany
                ? profileData?.logo || (profileData?.name ? profileData.name.slice(0, 2).toUpperCase() : '?')
                : `${profileData?.firstName?.charAt(0) || '?'}${profileData?.lastName?.charAt(0) || '?'}`}
            </div>
          </div>
          <div className="profile-info">
            {!isEditing ? (
              <>
                <h1>{displayName}</h1>
                {isCompany ? (
                  <p className="bio">{profileData.description}</p>
                ) : (
                  <>
                    {profileData.headline && <p className="bio">{profileData.headline}</p>}
                    {profileData.bio && <p className="bio bio-secondary">{profileData.bio}</p>}
                    {(() => {
                      const links = [profileData.link1, profileData.link2, profileData.link3].filter(Boolean);
                      return links.length > 0 ? (
                        <div className="profile-links">
                          {links.map((link) => (
                            <a
                              key={link}
                              href={normalizeUrl(link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="profile-link-btn"
                            >
                              <img
                                src={getFaviconUrl(link)}
                                alt=""
                                className="profile-link-icon"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                              <span>{getLinkDomain(link)}</span>
                            </a>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
                <div className="profile-details">
                  {isCompany && profileData.contactPerson ? (
                    <span>👤 {profileData.contactPerson}</span>
                  ) : null}
                  <span>
                    📧 {' '}
                    {profileData.email ? (
                      <a className="profile-email-link" href={`mailto:${profileData.email}`}>
                        {profileData.email}
                      </a>
                    ) : (
                      'Ikke satt'
                    )}
                  </span>
                  <span>
                    📱{' '}
                    {profileData.phone ? (
                      <a className="profile-phone-link" href={getPhoneLink(profileData.phone)}>
                        {profileData.phone}
                      </a>
                    ) : (
                      'Ikke satt'
                    )}
                  </span>
                  <span>
                    {isCompany
                      ? `🏢 ${profileData.industry || 'Ikke satt'} • ${profileData.size || 'Ikke satt'}`
                      : `🎓 ${profileData.school || 'Ikke satt'} • ${profileData.degreeLevel || 'Ikke satt'} i ${profileData.field || 'Ikke satt'}`}
                  </span>
                  <span>
                    {isCompany
                      ? `📍 ${profileData.location || 'Ikke satt'}`
                      : `📍 ${profileData.location || 'Ikke satt'} • Varselterskel ${profileData.notificationThreshold}%`}
                  </span>
                  {isCompany && profileData.website ? (
                    <span>
                      🌐{' '}
                      <a href={normalizeUrl(profileData.website)} target="_blank" rel="noreferrer">
                        {profileData.website}
                      </a>
                    </span>
                  ) : null}
                </div>
                {isCompany && (
                  <>
                    {(profileData.companyQualifications || []).length > 0 && (
                      <div className="chip-section">
                        <p className="chip-section-label">Kjernekompetanse</p>
                        <ChipList items={profileData.companyQualifications} />
                      </div>
                    )}
                    {(profileData.workAreas || []).length > 0 && (
                      <div className="chip-section">
                        <p className="chip-section-label">Arbeidsområder</p>
                        <ChipList items={profileData.workAreas} />
                      </div>
                    )}
                    {(profileData.hiringFocus || []).length > 0 && (
                      <div className="chip-section">
                        <p className="chip-section-label">Hvem vi ser etter</p>
                        <ChipList items={profileData.hiringFocus} />
                      </div>
                    )}
                  </>
                )}
                {!isCompany ? (
                  <div className="notification-settings-summary">
                    <p className="notification-settings-summary-title">Varslingsinnstillinger</p>
                    <div className="notification-settings-summary-row">
                      <span className={`status-badge ${profileData.inAppNotificationsEnabled !== false ? 'badge-accepted' : 'badge-rejected'}`}>
                        In-app: {profileData.inAppNotificationsEnabled !== false ? 'På' : 'Av'}
                      </span>
                      <span className={`status-badge ${profileData.emailNotificationsEnabled === true ? 'badge-accepted' : 'badge-rejected'}`}>
                        E-post: {profileData.emailNotificationsEnabled === true ? 'På' : 'Av'}
                      </span>
                    </div>
                  </div>
                ) : null}

                {!isCompany && (
                  <>
                    {(profileData.preferredRoleTracks || []).length > 0 && (
                      <div className="chip-section">
                        <p className="chip-section-label">Foretrukne fagretninger</p>
                        <div className="chip-list">
                          {(profileData.preferredRoleTracks || []).map((rt) => (
                            <span key={rt} className="chip">
                              {rt === 'frontend' ? 'Frontend' : rt === 'ux' ? 'UX / Design' : rt === 'data' ? 'Data / Analyse' : rt === 'fullstack' ? 'Full Stack' : rt === 'backend' ? 'Backend' : 'Generell'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(profileData.preferredWorkModes || []).length > 0 && (
                      <div className="chip-section">
                        <p className="chip-section-label">Foretrukket arbeidsform</p>
                        <div className="chip-list">
                          {(profileData.preferredWorkModes || []).map((wm) => (
                            <span key={wm} className="chip">
                              {wm === 'onsite' ? 'På stedet' : wm === 'hybrid' ? 'Hybrid' : 'Hjemmefra / Remote'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="profile-header-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setIsEditing(true)}
                    disabled={saving}
                  >
                    {isCompany ? 'Rediger bedriftsprofil' : 'Rediger studentprofil'}
                  </button>
                  {!isCompany && (
                    <button
                      className="btn btn-secondary"
                      onClick={handleDownloadProfilePdf}
                      disabled={saving}
                    >
                      Last ned profil (PDF)
                    </button>
                  )}
                </div>
                {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
              </>
            ) : (
              <div className="edit-form edit-form-accent">
                {isCompany ? (
                  <>
                    {(() => {
                      const infoPct = Math.round(
                        [companyEditData.name, companyEditData.contactPerson, companyEditData.email, companyEditData.phone, companyEditData.website, companyEditData.location, companyEditData.size, companyEditData.industry, companyEditData.description]
                          .filter(Boolean).length / 9 * 100
                      );
                      const competencePct = Math.round(
                        [(companyEditData.companyQualifications || []).length > 0, (companyEditData.workAreas || []).length > 0, (companyEditData.hiringFocus || []).length > 0]
                          .filter(Boolean).length / 3 * 100
                      );
                      return (
                        <>
                          <AccordionSection title="Bedriftsinformasjon" completion={infoPct}>
                            <div className="form-group">
                              <label>Bedriftsnavn</label>
                              <input
                                type="text"
                                value={companyEditData.name}
                                onChange={(event) => updateCompanyField('name', event.target.value)}
                                onBlur={() => capitalizeCompanyField('name')}
                                disabled={saving}
                              />
                            </div>
                            <div className="form-group">
                              <label>Kontaktperson</label>
                              <input
                                type="text"
                                value={companyEditData.contactPerson || ''}
                                onChange={(event) => updateCompanyField('contactPerson', event.target.value)}
                                onBlur={() => capitalizeCompanyField('contactPerson')}
                                disabled={saving}
                              />
                            </div>
                            <div className="form-group">
                              <label>E-post</label>
                              <input
                                type="email"
                                value={companyEditData.email || ''}
                                onChange={(event) => updateCompanyField('email', event.target.value)}
                                disabled={saving}
                              />
                            </div>
                            <div className="form-group">
                              <label>Telefon</label>
                              <input
                                type="tel"
                                value={companyEditData.phone || ''}
                                onChange={(event) => updateCompanyField('phone', event.target.value)}
                                disabled={saving}
                              />
                            </div>
                            <div className="form-group">
                              <label>Nettside</label>
                              <input
                                type="text"
                                value={companyEditData.website || ''}
                                onChange={(event) => updateCompanyField('website', event.target.value)}
                                disabled={saving}
                              />
                            </div>
                            <div className="form-group">
                              <label>Lokasjon</label>
                              <input
                                type="text"
                                value={companyEditData.location || ''}
                                onChange={(event) => updateCompanyField('location', event.target.value)}
                                onBlur={() => capitalizeCompanyField('location')}
                                disabled={saving}
                              />
                            </div>
                            <div className="form-group">
                              <label>Bedriftsstørrelse</label>
                              <input
                                type="text"
                                value={companyEditData.size || ''}
                                onChange={(event) => updateCompanyField('size', event.target.value)}
                                onBlur={() => capitalizeCompanyField('size')}
                                disabled={saving}
                              />
                            </div>
                            <div className="form-group">
                              <label>Bransje</label>
                              <input
                                type="text"
                                value={companyEditData.industry || ''}
                                onChange={(event) => updateCompanyField('industry', event.target.value)}
                                onBlur={() => capitalizeCompanyField('industry')}
                                disabled={saving}
                              />
                            </div>
                            <div className="form-group">
                              <label>Beskrivelse</label>
                              <textarea
                                rows="4"
                                value={companyEditData.description || ''}
                                onChange={(event) => updateCompanyField('description', event.target.value)}
                                disabled={saving}
                              />
                            </div>
                          </AccordionSection>

                          <AccordionSection title="Kompetanse og fokus" completion={competencePct}>
                            <TagEditor
                              label="Kjernekompetanse"
                              items={companyEditData.companyQualifications || []}
                              onAdd={(value) => addTag('companyQualifications', value, true)}
                              onRemove={(value) => removeTag('companyQualifications', value, true)}
                              placeholder="F.eks. React, Prosjektledelse"
                              loading={saving}
                              suggestions={['React', 'TypeScript', 'Python', 'Node.js', 'Java', '.NET', 'SQL', 'Docker', 'AWS', 'Figma', 'UX-design', 'Prosjektledelse', 'Agile / Scrum', 'Machine Learning', 'Cybersikkerhet', 'Vue', 'Angular', 'Kubernetes', 'Data-analyse', 'DevOps']}
                            />
                            <TagEditor
                              label="Arbeidsområder"
                              items={companyEditData.workAreas || []}
                              onAdd={(value) => addTag('workAreas', value, true)}
                              onRemove={(value) => removeTag('workAreas', value, true)}
                              placeholder="F.eks. Webutvikling, Data-analyse"
                              loading={saving}
                              suggestions={['Webutvikling', 'Mobilutvikling', 'Frontend-utvikling', 'Backend-utvikling', 'Full Stack', 'Data og analyse', 'Kunstig intelligens', 'Skyteknologi', 'Cybersikkerhet', 'UX og design', 'Produktutvikling', 'DevOps', 'Automatisering', 'IoT', 'Systemintegrasjon']}
                            />
                            <TagEditor
                              label="Hvem dere ser etter"
                              items={companyEditData.hiringFocus || []}
                              onAdd={(value) => addTag('hiringFocus', value, true)}
                              onRemove={(value) => removeTag('hiringFocus', value, true)}
                              placeholder="F.eks. Bachelor i IT, Motiverte studenter"
                              loading={saving}
                              suggestions={['Bachelor i Informatikk', 'Bachelor i IT', 'Masterstudenter', 'UX-studenter', 'Datastudenter', 'Frontend-interesserte', 'Backend-interesserte', 'Motiverte studenter', 'Selvstendige studenter', 'Teamorienterte studenter', 'Studenter med interesse for AI', 'Utvekslingsstudenter']}
                            />
                          </AccordionSection>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <ProfileCompletion data={editData} />

                    {(() => {
                      const pct = (fields) => Math.round(fields.filter(Boolean).length / fields.length * 100);
                      const personalPct = pct([editData.firstName, editData.lastName, editData.headline, editData.bio, editData.email, editData.phone, editData.location, editData.link1]);
                      const educationPct = pct([editData.school, editData.field, editData.degreeLevel, editData.graduationYear]);
                      const skillsPct = pct([editData.skills?.length > 0, editData.professionalInterests?.length > 0, editData.personalCharacteristics?.length > 0, editData.currentSubjects?.length > 0, editData.completedSubjects?.length > 0]);
                      const preferencesPct = pct([editData.preferredLocations?.length > 0, editData.preferredRoleTracks?.length > 0, editData.preferredWorkModes?.length > 0]);
                      return (<>

                        <AccordionSection title="Personlig info" completion={personalPct}>
                          <div className="form-group">
                            <label>
                              Fornavn
                              <FieldTooltip text="Ditt juridiske fornavn, slik det vises i offisielle dokumenter." />
                            </label>
                            <input
                              type="text"
                              value={editData.firstName}
                              onChange={(event) => updateStudentField('firstName', event.target.value)}
                              onBlur={() => capitalizeStudentField('firstName')}
                              placeholder="F.eks. Kari"
                              disabled={saving}
                            />
                          </div>
                          <div className="form-group">
                            <label>
                              Etternavn
                              <FieldTooltip text="Ditt juridiske etternavn." />
                            </label>
                            <input
                              type="text"
                              value={editData.lastName}
                              onChange={(event) => updateStudentField('lastName', event.target.value)}
                              onBlur={() => capitalizeStudentField('lastName')}
                              placeholder="F.eks. Nordmann"
                              disabled={saving}
                            />
                          </div>
                          <div className="form-group">
                            <label>
                              Overskrift
                              <FieldTooltip text="En kort setning som oppsummerer deg faglig. Dette er det første en bedrift ser på profilen din." />
                            </label>
                            <input
                              type="text"
                              value={editData.headline}
                              onChange={(event) => updateStudentField('headline', event.target.value)}
                              onBlur={() => capitalizeStudentField('headline')}
                              placeholder="F.eks. Informatikkstudent med interesse for webutvikling og UX"
                              disabled={saving}
                            />
                          </div>
                          <div className="form-group">
                            <label>
                              Biografi
                              <FieldTooltip text="Fortell hvem du er, hva du er interessert i og hva du ønsker å lære i praksis. 3–5 setninger er ideelt." />
                            </label>
                            <textarea
                              rows="4"
                              value={editData.bio}
                              onChange={(event) => updateStudentField('bio', event.target.value)}
                              placeholder="F.eks. Jeg er en engasjert student i mitt tredje år ved UiO, med særlig interesse for frontend-utvikling og brukeropplevelse. Jeg er strukturert, nysgjerrig og trives med å jobbe i team."
                              disabled={saving}
                            />
                          </div>
                          <div className="form-group">
                            <label>
                              E-post
                              <FieldTooltip text="E-postadressen bedrifter bruker for å kontakte deg. Bruk gjerne en privat e-post du sjekker regelmessig." />
                            </label>
                            <input
                              type="email"
                              value={editData.email}
                              onChange={(event) => updateStudentField('email', event.target.value)}
                              placeholder="F.eks. kari.nordmann@gmail.com"
                              disabled={saving}
                            />
                          </div>
                          <div className="form-group">
                            <label>
                              Telefon
                              <FieldTooltip text="Ditt mobilnummer. Skriv det med landskode om du er utenlandsk student, f.eks. +47 98 76 54 32." />
                            </label>
                            <input
                              type="tel"
                              value={editData.phone}
                              onChange={(event) => updateStudentField('phone', event.target.value)}
                              placeholder="F.eks. 98 76 54 32"
                              disabled={saving}
                            />
                          </div>
                          <div className="form-group">
                            <label>
                              Lokasjon
                              <FieldTooltip text="Byen eller stedet der du bor eller studerer. Brukes til å matche deg med praksisplasser i nærheten." />
                            </label>
                            <input
                              type="text"
                              value={editData.location}
                              onChange={(event) => updateStudentField('location', event.target.value)}
                              onBlur={() => capitalizeStudentField('location')}
                              placeholder="F.eks. Oslo"
                              disabled={saving}
                            />
                          </div>
                          <div className="link-editor">
                            <p className="tag-editor-label">
                              <strong>Lenker</strong>
                              <FieldTooltip text="Legg til lenker til LinkedIn, GitHub, portfolio o.l. Hjelper bedrifter å bli bedre kjent med deg." />
                            </p>
                            <div className="form-group">
                              <label>Lenke 1</label>
                              <input
                                type="url"
                                value={editData.link1 || ''}
                                onChange={(event) => updateStudentField('link1', event.target.value)}
                                placeholder="https://linkedin.com/in/ditt-navn"
                                disabled={saving}
                              />
                            </div>
                            {editData.link1?.trim() && (
                              <div className="form-group">
                                <label>Lenke 2</label>
                                <input
                                  type="url"
                                  value={editData.link2 || ''}
                                  onChange={(event) => updateStudentField('link2', event.target.value)}
                                  placeholder="https://github.com/ditt-brukernavn"
                                  disabled={saving}
                                />
                              </div>
                            )}
                            {editData.link1?.trim() && editData.link2?.trim() && (
                              <div className="form-group">
                                <label>Lenke 3</label>
                                <input
                                  type="url"
                                  value={editData.link3 || ''}
                                  onChange={(event) => updateStudentField('link3', event.target.value)}
                                  placeholder="https://portfolio.ditt-navn.no"
                                  disabled={saving}
                                />
                              </div>
                            )}
                          </div>
                        </AccordionSection>

                        <AccordionSection title="Utdanning" completion={educationPct}>
                          <div className="form-group">
                            <label>
                              Universitet / skole
                              <FieldTooltip text="Navnet på høyskolen eller universitetet der du studerer, f.eks. 'Universitetet i Oslo' eller 'OsloMet'." />
                            </label>
                            <input
                              type="text"
                              value={editData.school || ''}
                              onChange={(event) => updateStudentField('school', event.target.value)}
                              onBlur={() => capitalizeStudentField('school')}
                              placeholder="F.eks. Universitetet i Oslo"
                              disabled={saving}
                            />
                          </div>
                          <div className="form-group">
                            <label>
                              Studieretning / fagfelt
                              <FieldTooltip text="Hva studerer du? Skriv inn studieretningen din, f.eks. 'Informatikk', 'Markedsføring' eller 'Industridesign'." />
                            </label>
                            <input
                              type="text"
                              value={editData.field || ''}
                              onChange={(event) => updateStudentField('field', event.target.value)}
                              onBlur={() => capitalizeStudentField('field')}
                              placeholder="F.eks. Informatikk eller Interaksjonsdesign"
                              disabled={saving}
                            />
                          </div>
                          <div className="form-group">
                            <label>
                              Gradsnivå
                              <FieldTooltip text="Velg typen grad du tar. Hjelper bedrifter å forstå nivået på utdanningen din." />
                            </label>
                            <select
                              className="form-select"
                              value={editData.degreeLevel || ''}
                              onChange={(event) => updateStudentField('degreeLevel', event.target.value)}
                              disabled={saving}
                            >
                              <option value="">Velg gradsnivå</option>
                              <option value="Fagskole">Fagskole</option>
                              <option value="Bachelor">Bachelor</option>
                              <option value="Master">Master</option>
                              <option value="Ph.d">Ph.d</option>
                              <option value="Profesjonsstudium">Profesjonsstudium</option>
                              <option value="Utveksling">Utveksling</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>
                              Ferdigstillingsår
                              <FieldTooltip text="Året du forventer å fullføre graden din. Brukes til å vise bedrifter når du er tilgjengelig for fast jobb." />
                            </label>
                            <input
                              type="number"
                              value={editData.graduationYear || ''}
                              onChange={(event) => updateStudentField('graduationYear', Number(event.target.value) || null)}
                              placeholder="F.eks. 2026"
                              min="2024"
                              max="2035"
                              disabled={saving}
                            />
                          </div>
                        </AccordionSection>

                        <AccordionSection title="Ferdigheter og interesser" completion={skillsPct}>
                          <SkillEditor
                            skills={editData.skills}
                            onAdd={addSkill}
                            onRemove={removeSkill}
                            onLevelChange={updateSkillLevel}
                            loading={saving}
                          />
                          <TagEditor
                            label="Faglige interesser"
                            tooltip="Fagområder du er interessert i å jobbe med. Brukes i matchmaking for å finne relevante praksisplasser."
                            items={editData.professionalInterests}
                            onAdd={(value) => addTag('professionalInterests', value)}
                            onRemove={(value) => removeTag('professionalInterests', value)}
                            placeholder="F.eks. Webutvikling eller Maskinlæring"
                            loading={saving}
                            suggestions={INTEREST_SUGGESTIONS}
                          />
                          <TagEditor
                            label="Personlige egenskaper"
                            tooltip="Egenskaper som beskriver deg som person og kollega. Hjelper bedrifter å vurdere om du passer inn i teamet deres."
                            items={editData.personalCharacteristics}
                            onAdd={(value) => addTag('personalCharacteristics', value)}
                            onRemove={(value) => removeTag('personalCharacteristics', value)}
                            placeholder="F.eks. Strukturert eller Løsningsorientert"
                            loading={saving}
                            suggestions={CHARACTERISTIC_SUGGESTIONS}
                          />
                          <TagEditor
                            label="Pågående fag"
                            tooltip="Fag du tar dette semesteret. Kan være direkte relevante for praksisplassen du søker på."
                            items={editData.currentSubjects}
                            onAdd={(value) => addTag('currentSubjects', value)}
                            onRemove={(value) => removeTag('currentSubjects', value)}
                            placeholder="F.eks. Webutvikling eller Algoritmer"
                            loading={saving}
                            suggestions={SUBJECT_SUGGESTIONS}
                          />
                          <TagEditor
                            label="Fullførte fag"
                            tooltip="Fag du allerede har bestått. Gir bedriften et bilde av din faglige bakgrunn og kompetanse."
                            items={editData.completedSubjects}
                            onAdd={(value) => addTag('completedSubjects', value)}
                            onRemove={(value) => removeTag('completedSubjects', value)}
                            placeholder="F.eks. Databaser eller Statistikk"
                            loading={saving}
                            suggestions={SUBJECT_SUGGESTIONS}
                          />
                        </AccordionSection>

                        <AccordionSection title="Preferanser" completion={preferencesPct}>
                          <TagEditor
                            label="Foretrukne steder"
                            tooltip="Byer eller regioner der du ønsker å ha praksis. Brukes i matchmaking for å filtrere praksisplasser etter lokasjon."
                            items={editData.preferredLocations}
                            onAdd={(value) => addTag('preferredLocations', value)}
                            onRemove={(value) => removeTag('preferredLocations', value)}
                            placeholder="F.eks. Oslo eller Bergen"
                            loading={saving}
                            suggestions={['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø', 'Kristiansand', 'Remote']}
                          />
                          <div className="tag-editor">
                            <p className="tag-editor-label">
                              <strong>Foretrukne fagretninger</strong>
                              <FieldTooltip text="Velg hvilke typer faglige oppdrag du er mest interessert i. Brukes direkte i matchmaking-algoritmen." />
                            </p>
                            <div className="filter-multi-list filter-multi-list-inline">
                              {[
                                { key: 'frontend', label: 'Frontend' },
                                { key: 'ux', label: 'UX / Design' },
                                { key: 'data', label: 'Data / Analyse' },
                                { key: 'fullstack', label: 'Full Stack' },
                                { key: 'backend', label: 'Backend' },
                                { key: 'unsure', label: 'Generell / Usikker' },
                              ].map(({ key, label }) => (
                                <label key={key} className="filter-check">
                                  <input
                                    type="checkbox"
                                    checked={(editData.preferredRoleTracks || []).includes(key)}
                                    onChange={() => {
                                      const current = editData.preferredRoleTracks || [];
                                      updateStudentField('preferredRoleTracks',
                                        current.includes(key) ? current.filter(v => v !== key) : [...current, key]
                                      );
                                    }}
                                    disabled={saving}
                                  />
                                  <span>{label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="tag-editor">
                            <p className="tag-editor-label">
                              <strong>Foretrukket arbeidsform</strong>
                              <FieldTooltip text="Hvordan ønsker du å jobbe? 'På stedet' = fysisk på kontoret, 'Hybrid' = kombinasjon, 'Remote' = hjemmefra." />
                            </p>
                            <div className="filter-multi-list filter-multi-list-inline">
                              {[
                                { key: 'onsite', label: 'På stedet' },
                                { key: 'hybrid', label: 'Hybrid' },
                                { key: 'remote', label: 'Hjemmefra / Remote' },
                              ].map(({ key, label }) => (
                                <label key={key} className="filter-check">
                                  <input
                                    type="checkbox"
                                    checked={(editData.preferredWorkModes || []).includes(key)}
                                    onChange={() => {
                                      const current = editData.preferredWorkModes || [];
                                      updateStudentField('preferredWorkModes',
                                        current.includes(key) ? current.filter(v => v !== key) : [...current, key]
                                      );
                                    }}
                                    disabled={saving}
                                  />
                                  <span>{label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </AccordionSection>

                        <AccordionSection title="Varslingsinnstillinger" defaultOpen={false}>
                          <div className="form-group">
                            <label>
                              Varselterskel: {editData.notificationThreshold}%
                              <FieldTooltip text="Du varsles kun om praksisplasser der matchprosenten er lik eller høyere enn denne. Lavere = flere varsler, høyere = færre men mer relevante." />
                            </label>
                            <input
                              type="range"
                              className="threshold-slider"
                              min="0"
                              max="100"
                              value={editData.notificationThreshold}
                              onChange={(event) => updateStudentField('notificationThreshold', Number(event.target.value))}
                              disabled={saving}
                            />
                            <div className="threshold-labels">
                              <span>0%</span>
                              <span>Varsle ved {editData.notificationThreshold}% match eller høyere</span>
                              <span>100%</span>
                            </div>
                          </div>
                          <div className="form-group notification-toggle-group">
                            <label className="notification-toggle-label">
                              <input
                                type="checkbox"
                                checked={Boolean(editData.inAppNotificationsEnabled)}
                                onChange={(event) => updateStudentField('inAppNotificationsEnabled', event.target.checked)}
                                disabled={saving}
                              />
                              <span>In-app varslinger</span>
                              <small className="notification-toggle-hint"> Vis varsler inne i appen</small>
                            </label>
                          </div>
                          <div className="form-group notification-toggle-group">
                            <label className="notification-toggle-label">
                              <input
                                type="checkbox"
                                checked={Boolean(editData.emailNotificationsEnabled)}
                                onChange={(event) => updateStudentField('emailNotificationsEnabled', event.target.checked)}
                                disabled={saving}
                              />
                              <span>E-postvarslinger</span>
                              <small className="notification-toggle-hint"> Motta varsler på e-postadressen din</small>
                            </label>
                          </div>
                        </AccordionSection>
                      </>);
                    })()}
                  </>
                )}
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={handleSaveChanges} disabled={saving}>
                    {saving ? 'Lagrer...' : 'Lagre endringer'}
                  </button>
                  <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
                    Avbryt
                  </button>
                </div>
                {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
              </div>
            )}
          </div>
        </section>

        {isCompany && (
          <section className="profile-section company-public-cases-section">
            <h2>Våres publiserte prosjekter</h2>
            {(() => {
              const myCases = publishedCases.filter(
                (c) => String(c.companyId || c.company_id) === String(company?.id)
              );
              if (myCases.length === 0) {
                return (
                  <p className="company-public-empty">
                    Du har ingen publiserte prosjekter ennå.{' '}
                    <a href="/apply">Publiser et nytt prosjekt her.</a>
                  </p>
                );
              }
              return (
                <div className="internship-list">
                  {myCases.map((item) => (
                    <article key={item.id} className="internship-card company-public-case-card">
                      <h3>{item.generatedAdData?.title || item.title}</h3>
                      <p className="location">📍 {item.location || 'Ikke oppgitt'}</p>
                      <p>{item.generatedAdData?.summary || item.taskDescription || 'Ingen beskrivelse tilgjengelig.'}</p>
                      <p className="internship-meta">
                        <strong>Periode:</strong> {item.startDate || 'Ikke oppgitt'} til {item.endDate || 'Ikke oppgitt'}
                      </p>
                      <div className="profile-header-actions">
                        <button
                          className="btn btn-secondary btn-inline-small"
                          onClick={() => navigate('/chatbot', { state: { caseToEdit: item } })}
                        >
                          Rediger
                        </button>
                        <a
                          className="btn btn-primary btn-inline-small"
                          href={`/internships?selected=${item.id}`}
                        >
                          Se annonse
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              );
            })()}
          </section>
        )}

        {!isCompany && (
          <section className="notices notices-persistent">
            <div className="notices-header">
              <h2>
                Varslinger
                {notifUnreadCount > 0 && (
                  <span className="notif-count-badge">{notifUnreadCount} ny{notifUnreadCount !== 1 ? 'e' : ''}</span>
                )}
              </h2>
              <div className="notices-actions">
                {persistedNotifs.length > 0 && notifUnreadCount > 0 && notificationsExpanded && (
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => notifCtx.markAllRead()}
                  >
                    Merk alle lest
                  </button>
                )}
                {persistedNotifs.length > 0 && (
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => setNotificationsExpanded((prev) => !prev)}
                  >
                    {notificationsExpanded ? 'Skjul' : 'Vis'} varslinger
                  </button>
                )}
              </div>
            </div>
            {persistedNotifs.length === 0 ? (
              <p className="notices-empty">
                Ingen varslinger ennå. Du varsles når nye praksisplasser matcher profilen din over {activeStudent?.notificationThreshold ?? 65}%.
              </p>
            ) : !notificationsExpanded ? (
              <p className="notices-empty">
                {persistedNotifs.length} varslinger totalt. Trykk "Vis varslinger" for detaljer.
              </p>
            ) : (
              <ul className="notif-list">
                {persistedNotifs.map((n) => (
                  <li key={n.id} className={`notif-item${n.isRead ? ' notif-read' : ' notif-unread'}`}>
                    <div className="notif-item-body">
                      {!n.isRead && <span className="notif-dot" aria-hidden="true" />}
                      <div className="notif-item-text">
                        <span className="notif-item-title">{n.caseTitle}</span>
                        <span className="notif-item-meta">
                          {n.companyName} · {caseMatchScoreById.get(n.caseId) ?? n.matchScore}% match
                        </span>
                      </div>
                      <div className="notif-item-actions">
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => navigate('/internships')}
                        >
                          Se sak
                        </button>
                        {!n.isRead && (
                          <button
                            className="btn btn-secondary btn-small"
                            onClick={() => notifCtx.markRead(n.id)}
                          >
                            Merk lest
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!isCompany && (
          <section className="notices">
            <h2>Relevante praksisplasser</h2>
            <p>Basert på profilen din får du varsler når nye praksisplasser matcher dine interesser over varselterskel på {activeStudent?.notificationThreshold}%.</p>
            {notifications.length === 0 ? (
              <p>Ingen varsler akkurat nå. Sjekk alle <a href="/internships">praksisplassene</a>.</p>
            ) : (
              <div className="internship-list">
                {notifications.map((notice) => (
                  (() => {
                    const offeringLabels = getOfferingLabels(notice.offerings, notice.offeringOther);

                    return (
                      <div
                        key={notice.id}
                        className="internship-card internship-card-clickable"
                        role="button"
                        tabIndex={0}
                        onClick={() => openRecommendedAd(notice.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openRecommendedAd(notice.id);
                          }
                        }}
                      >
                        {notice.scoreSummary ? (
                          <div className="match-summary">
                            <div className="match-summary-copy">
                              <p className="match-summary-kicker">Din match</p>
                              <p className="match-summary-title">
                                {notice.scoreSummary.rankedSkillMatches[0]?.name || notice.scoreSummary.topQualification}
                              </p>
                            </div>
                            <div className="match-score match-score-md">
                              <div className="match-score-inner">
                                <strong className="match-score-value match-score-value-md">{notice.scoreSummary.totalScore}%</strong>
                                <span className="match-score-caption">match</span>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        <h3>{notice.title}</h3>
                        <p className="company">
                          🏢{' '}
                          {notice.companyId ? (
                            <Link
                              className="company-profile-link"
                              to={`/companies/${notice.companyId}?fromCase=${notice.id}`}
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              {notice.company}
                            </Link>
                          ) : notice.company}
                        </p>
                        <p className="location">📍 {notice.location}</p>
                        <p>{notice.description}</p>
                        {offeringLabels.length > 0 ? (
                          <p className="internship-meta">
                            <strong>Tilbyr:</strong> {offeringLabels.join(' • ')}
                          </p>
                        ) : null}
                        <p className="internship-meta">
                          <strong>Periode:</strong> {notice.startDate} til {notice.endDate}
                        </p>
                        <p className="internship-meta">
                          <strong>Maks timer:</strong> {notice.maxHours}
                        </p>
                        <button type="button" className="btn btn-primary btn-inline-small">
                          Se mer info
                        </button>
                      </div>
                    );
                  })()
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      <Footer />
    </main>
  );
}
