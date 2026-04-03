import { useMemo, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import Footer from '../components/Footer';
import { scoreCaseAgainstStudent } from '../utils/caseMatching';
import { studentProfile, companyProfile, cases as casesAPI } from '../utils/api';

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

function TagEditor({ label, items, onAdd, onRemove, placeholder, loading }) {
  const [value, setValue] = useState('');

  return (
    <div className="tag-editor">
      <p className="tag-editor-label"><strong>{label}</strong></p>
      <div className="tag-editor-input-row">
        <input
          className="tag-editor-input"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          disabled={loading}
        />
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => {
            const trimmed = value.trim();
            if (!trimmed) return;
            onAdd(trimmed);
            setValue('');
          }}
          disabled={loading}
        >
          Legg til
        </button>
      </div>
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

  return (
    <div className="skill-editor">
      <p className="tag-editor-label"><strong>Ferdigheter og nivå</strong></p>
      <div className="skill-editor-grid">
        <input
          className="skill-editor-field"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="For eksempel React"
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
          onClick={() => {
            const trimmed = name.trim();
            if (!trimmed) return;
            onAdd({ name: trimmed, level });
            setName('');
            setLevel(3);
          }}
          disabled={loading}
        >
          Legg til
        </button>
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
    company: item.company || 'Bedrift',
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

function mapPublishedCaseToMatch(item, student) {
  const internship = mapPublishedCaseToInternship(item);
  return {
    ...internship,
    scoreSummary: scoreCaseAgainstStudent(mapInternshipToCaseLike(internship), student),
  };
}

export default function StudentProfile({ userRole }) {
  const navigate = useNavigate();
  const { userRole: authRole } = useContext(AuthContext);
  const isCompany = authRole === 'company';

  const [student, setStudent] = useState(null);
  const [company, setCompany] = useState(null);
  const [publishedCases, setPublishedCases] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [companyEditData, setCompanyEditData] = useState(null);
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
          setCompany(companyData);
          setCompanyEditData(companyData);
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
  const notifications = activeStudent
    ? caseMatches.filter((item) => item.scoreSummary.totalScore >= activeStudent.notificationThreshold)
    : [];

  const updateStudentField = (name, value) => {
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const updateCompanyField = (name, value) => {
    setCompanyEditData((prev) => ({ ...prev, [name]: value }));
  };

  const addSkill = (skill) => {
    setEditData((prev) => {
      const exists = prev.skills.some((item) => item.name.toLowerCase() === skill.name.toLowerCase());
      if (exists) return prev;
      return { ...prev, skills: [...prev.skills, skill] };
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
    if (isCompanyProfile) {
      setCompanyEditData((prev) => ({
        ...prev,
        [field]: prev[field].includes(value) ? prev[field] : [...prev[field], value],
      }));
    } else {
      setEditData((prev) => ({
        ...prev,
        [field]: prev[field].includes(value) ? prev[field] : [...prev[field], value],
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
        await companyProfile.update(companyEditData);
        setCompany(companyEditData);
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

  if (loading) {
    return (
      <main className="student-profile">
        <div className="container">
          <p style={{ textAlign: 'center', padding: '20px' }}>Laster profil...</p>
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
                ? profileData.logo || profileData.name.slice(0, 2).toUpperCase()
                : `${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`}
            </div>
          </div>
          <div className="profile-info">
            {!isEditing ? (
              <>
                <h1>{displayName}</h1>
                <p className="bio">{isCompany ? profileData.description : profileData.headline}</p>
                <div className="profile-details">
                  <span>📧 {profileData.email || 'Ikke satt'}</span>
                  <span>📱 {profileData.phone || 'Ikke satt'}</span>
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
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(true)}
                  disabled={saving}
                >
                  {isCompany ? 'Rediger bedriftsprofil' : 'Rediger studentprofil'}
                </button>
                {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
              </>
            ) : (
              <div className="edit-form edit-form-accent">
                {isCompany ? (
                  <>
                    <div className="form-group">
                      <label>Bedriftsnavn</label>
                      <input
                        type="text"
                        value={companyEditData.name}
                        onChange={(event) => updateCompanyField('name', event.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Kontaktperson</label>
                      <input
                        type="text"
                        value={companyEditData.contactPerson || ''}
                        onChange={(event) => updateCompanyField('contactPerson', event.target.value)}
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
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Bedriftsstorrelse</label>
                      <input
                        type="text"
                        value={companyEditData.size || ''}
                        onChange={(event) => updateCompanyField('size', event.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Bransje</label>
                      <input
                        type="text"
                        value={companyEditData.industry || ''}
                        onChange={(event) => updateCompanyField('industry', event.target.value)}
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
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Fornavn</label>
                      <input
                        type="text"
                        value={editData.firstName}
                        onChange={(event) => updateStudentField('firstName', event.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Etternavn</label>
                      <input
                        type="text"
                        value={editData.lastName}
                        onChange={(event) => updateStudentField('lastName', event.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Overskrift</label>
                      <input
                        type="text"
                        value={editData.headline}
                        onChange={(event) => updateStudentField('headline', event.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Biografi</label>
                      <textarea
                        rows="4"
                        value={editData.bio}
                        onChange={(event) => updateStudentField('bio', event.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>E-post</label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(event) => updateStudentField('email', event.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Telefon</label>
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(event) => updateStudentField('phone', event.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Lokasjon</label>
                      <input
                        type="text"
                        value={editData.location}
                        onChange={(event) => updateStudentField('location', event.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Universitet / skole</label>
                      <input
                        type="text"
                        value={editData.school || ''}
                        onChange={(event) => updateStudentField('school', event.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Grad nivå</label>
                      <input
                        type="text"
                        value={editData.degreeLevel || ''}
                        onChange={(event) => updateStudentField('degreeLevel', event.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Graduerings år</label>
                      <input
                        type="number"
                        value={editData.graduationYear || ''}
                        onChange={(event) => updateStudentField('graduationYear', Number(event.target.value) || null)}
                        disabled={saving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Varselterskel</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editData.notificationThreshold}
                        onChange={(event) => updateStudentField('notificationThreshold', Number(event.target.value))}
                        disabled={saving}
                      />
                    </div>
                    <SkillEditor
                      skills={editData.skills}
                      onAdd={addSkill}
                      onRemove={removeSkill}
                      onLevelChange={updateSkillLevel}
                      loading={saving}
                    />
                    <TagEditor
                      label="Faglige interesser"
                      items={editData.professionalInterests}
                      onAdd={(value) => addTag('professionalInterests', value)}
                      onRemove={(value) => removeTag('professionalInterests', value)}
                      placeholder="For eksempel Produktdesign"
                      loading={saving}
                    />
                    <TagEditor
                      label="Personlige egenskaper"
                      items={editData.personalCharacteristics}
                      onAdd={(value) => addTag('personalCharacteristics', value)}
                      onRemove={(value) => removeTag('personalCharacteristics', value)}
                      placeholder="For eksempel Strukturert"
                      loading={saving}
                    />
                    <TagEditor
                      label="Pågående fag"
                      items={editData.currentSubjects}
                      onAdd={(value) => addTag('currentSubjects', value)}
                      onRemove={(value) => removeTag('currentSubjects', value)}
                      placeholder="For eksempel Webutvikling"
                      loading={saving}
                    />
                    <TagEditor
                      label="Fullførte fag"
                      items={editData.completedSubjects}
                      onAdd={(value) => addTag('completedSubjects', value)}
                      onRemove={(value) => removeTag('completedSubjects', value)}
                      placeholder="For eksempel Databaser"
                      loading={saving}
                    />
                    <TagEditor
                      label="Foretrukne steder"
                      items={editData.preferredLocations}
                      onAdd={(value) => addTag('preferredLocations', value)}
                      onRemove={(value) => removeTag('preferredLocations', value)}
                      placeholder="For eksempel Oslo"
                      loading={saving}
                    />
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

        {!isCompany && (
          <section className="notices">
            <h2>Relevante praksisplasser</h2>
            <p>Basert på profilen din får du varsler når nye praksisplasser matcher dine interesser over varselterskel på {activeStudent?.notificationThreshold}%.</p>
            {notifications.length === 0 ? (
              <p>Ingen varsler akkurat nå. Sjekk alle <a href="/internships">praksisplassene</a>.</p>
            ) : (
              <div className="internship-list">
                {notifications.map((notice) => (
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
                    <p className="company">🏢 {notice.company}</p>
                    <p className="location">📍 {notice.location}</p>
                    <p>{notice.description}</p>
                    <p className="internship-meta">
                      <strong>Periode:</strong> {notice.startDate} til {notice.endDate}
                    </p>
                    <p className="internship-meta">
                      <strong>Maks timer:</strong> {notice.maxHours}
                    </p>
                    <p className="internship-meta">
                      <strong>Kompensasjon:</strong>{' '}
                      {notice.salaryType === 'hourly'
                        ? `Timelønn: ${notice.compensationAmount} NOK/time`
                        : `Fastpris: ${notice.compensationAmount} NOK`}
                    </p>
                    <button type="button" className="btn btn-primary btn-inline-small">
                      Se mer info
                    </button>
                  </div>
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
