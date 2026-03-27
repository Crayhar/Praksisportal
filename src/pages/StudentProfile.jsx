import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import {
  STORAGE_KEYS,
  defaultCompanyProfile,
  defaultDrafts,
  defaultPublishedCases,
  defaultStudentProfile,
} from '../data/portalData';
import { scoreCaseAgainstStudent } from '../utils/caseMatching';
import { loadStoredJson, saveStoredJson } from '../utils/storage';

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

function TagEditor({ label, items, onAdd, onRemove, placeholder }) {
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
          >
            {item} ×
          </button>
        ))}
      </div>
    </div>
  );
}

function SkillEditor({ skills, onAdd, onRemove, onLevelChange }) {
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
        />
        <select className="skill-editor-field" value={level} onChange={(event) => setLevel(Number(event.target.value))}>
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
            />
            <div className="skill-editor-actions">
              <span>{skill.level}/5</span>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => onRemove(skill.name)}>
                Fjern
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function mapPublishedCaseToMatch(item, student) {
  return {
    ...item,
    scoreSummary: scoreCaseAgainstStudent(item, student),
  };
}

export default function StudentProfile({ userRole }) {
  const navigate = useNavigate();
  const isCompany = userRole === 'company';

  const [student, setStudent] = useState(() => loadStoredJson(STORAGE_KEYS.studentProfile, defaultStudentProfile));
  const [company, setCompany] = useState(() => loadStoredJson(STORAGE_KEYS.companyProfile, defaultCompanyProfile));
  const [drafts] = useState(() => loadStoredJson(STORAGE_KEYS.caseDrafts, defaultDrafts));
  const [publishedCases] = useState(() => loadStoredJson(STORAGE_KEYS.publishedCases, defaultPublishedCases));
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(student);
  const [companyEditData, setCompanyEditData] = useState(company);

  const activeStudent = isEditing && !isCompany ? editData : student;
  const caseMatches = useMemo(
    () =>
      publishedCases
        .map((item) => mapPublishedCaseToMatch(item, activeStudent))
        .sort((left, right) => right.scoreSummary.totalScore - left.scoreSummary.totalScore),
    [publishedCases, activeStudent]
  );
  const notifications = caseMatches.filter(
    (item) => item.scoreSummary.totalScore >= activeStudent.notificationThreshold
  );

  const updateStudentField = (name, value) => {
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const updateCompanyField = (name, value) => {
    setCompanyEditData((prev) => ({ ...prev, [name]: value }));
  };

  const addTag = (field, value, isCompanyProfile = false) => {
    if (isCompanyProfile) {
      setCompanyEditData((prev) => ({
        ...prev,
        [field]: prev[field].includes(value) ? prev[field] : [...prev[field], value],
      }));
      return;
    }

    setEditData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field] : [...prev[field], value],
    }));
  };

  const removeTag = (field, value, isCompanyProfile = false) => {
    if (isCompanyProfile) {
      setCompanyEditData((prev) => ({
        ...prev,
        [field]: prev[field].filter((item) => item !== value),
      }));
      return;
    }

    setEditData((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== value),
    }));
  };

  const addSkill = (skill) => {
    setEditData((prev) => {
      const exists = prev.skills.some((item) => item.name.toLowerCase() === skill.name.toLowerCase());
      if (exists) {
        return prev;
      }
      return { ...prev, skills: [...prev.skills, skill] };
    });
  };

  const removeSkill = (name) => {
    setEditData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill.name !== name),
    }));
  };

  const updateSkillLevel = (name, level) => {
    setEditData((prev) => ({
      ...prev,
      skills: prev.skills.map((skill) => (skill.name === name ? { ...skill, level } : skill)),
    }));
  };

  const handleSaveChanges = () => {
    if (isCompany) {
      setCompany(companyEditData);
      saveStoredJson(STORAGE_KEYS.companyProfile, companyEditData);
    } else {
      setStudent(editData);
      saveStoredJson(STORAGE_KEYS.studentProfile, editData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(student);
    setCompanyEditData(company);
    setIsEditing(false);
  };

  const getStatusBadge = (score, threshold = activeStudent.notificationThreshold) => {
    if (score >= 80) return <span className="status-badge badge-accepted">Sterk match</span>;
    if (score >= threshold) return <span className="status-badge badge-pending">Relevant</span>;
    return <span className="status-badge badge-rejected">Lavere match</span>;
  };

  const openRecommendedAd = (id) => {
    navigate(`/internships?selected=${id}`);
  };

  return (
    <main className="student-profile">
      <div className="container">
        <section className="profile-header profile-header-accent">
          <div className="profile-avatar">
            <div className="avatar-placeholder">
              {isCompany
                ? company.logo || company.name.slice(0, 2).toUpperCase()
                : `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`}
            </div>
          </div>
          <div className="profile-info">
            {!isEditing ? (
              <>
                <h1>{isCompany ? company.name : `${student.firstName} ${student.lastName}`}</h1>
                <p className="bio">{isCompany ? company.description : student.headline}</p>
                <div className="profile-details">
                  <span>📧 {isCompany ? company.email : student.email}</span>
                  <span>📱 {isCompany ? company.phone : student.phone}</span>
                  <span>{isCompany ? `🏢 ${company.industry} • ${company.size}` : `🎓 ${student.school} • ${student.degreeLevel} i ${student.field}`}</span>
                  <span>{isCompany ? `📍 ${company.location}` : `📍 ${student.location} • Varselterskel ${student.notificationThreshold}%`}</span>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditData(student);
                    setCompanyEditData(company);
                    setIsEditing(true);
                  }}
                >
                  {isCompany ? 'Rediger bedriftsprofil' : 'Rediger studentprofil'}
                </button>
              </>
            ) : (
              <div className="edit-form edit-form-accent">
                {isCompany ? (
                  <>
                    <div className="form-group">
                      <label>Bedriftsnavn</label>
                      <input type="text" value={companyEditData.name} onChange={(event) => updateCompanyField('name', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Kontaktperson</label>
                      <input type="text" value={companyEditData.contact} onChange={(event) => updateCompanyField('contact', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>E-post</label>
                      <input type="email" value={companyEditData.email} onChange={(event) => updateCompanyField('email', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Telefon</label>
                      <input type="tel" value={companyEditData.phone} onChange={(event) => updateCompanyField('phone', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Nettside</label>
                      <input type="text" value={companyEditData.website} onChange={(event) => updateCompanyField('website', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Lokasjon</label>
                      <input type="text" value={companyEditData.location} onChange={(event) => updateCompanyField('location', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Bedriftsstorrelse</label>
                      <input type="text" value={companyEditData.size} onChange={(event) => updateCompanyField('size', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Bransje</label>
                      <input type="text" value={companyEditData.industry} onChange={(event) => updateCompanyField('industry', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Beskrivelse</label>
                      <textarea rows="4" value={companyEditData.description} onChange={(event) => updateCompanyField('description', event.target.value)} />
                    </div>
                    <TagEditor
                      label="Bedriftskvalifikasjoner"
                      items={companyEditData.companyQualifications}
                      onAdd={(value) => addTag('companyQualifications', value, true)}
                      onRemove={(value) => removeTag('companyQualifications', value, true)}
                      placeholder="For eksempel Produktutvikling"
                    />
                    <TagEditor
                      label="Arbeidsområder"
                      items={companyEditData.workAreas}
                      onAdd={(value) => addTag('workAreas', value, true)}
                      onRemove={(value) => removeTag('workAreas', value, true)}
                      placeholder="For eksempel Analyseverktøy"
                    />
                    <TagEditor
                      label="Rekrutteringsfokus"
                      items={companyEditData.hiringFocus}
                      onAdd={(value) => addTag('hiringFocus', value, true)}
                      onRemove={(value) => removeTag('hiringFocus', value, true)}
                      placeholder="For eksempel Frontend"
                    />
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Fornavn</label>
                      <input type="text" value={editData.firstName} onChange={(event) => updateStudentField('firstName', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Etternavn</label>
                      <input type="text" value={editData.lastName} onChange={(event) => updateStudentField('lastName', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Overskrift</label>
                      <input type="text" value={editData.headline} onChange={(event) => updateStudentField('headline', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Biografi</label>
                      <textarea rows="4" value={editData.bio} onChange={(event) => updateStudentField('bio', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>E-post</label>
                      <input type="email" value={editData.email} onChange={(event) => updateStudentField('email', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Telefon</label>
                      <input type="tel" value={editData.phone} onChange={(event) => updateStudentField('phone', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Lokasjon</label>
                      <input type="text" value={editData.location} onChange={(event) => updateStudentField('location', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Studieprogram</label>
                      <input type="text" value={editData.field} onChange={(event) => updateStudentField('field', event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Varselterskel</label>
                      <input type="number" min="0" max="100" value={editData.notificationThreshold} onChange={(event) => updateStudentField('notificationThreshold', Number(event.target.value))} />
                    </div>
                    <SkillEditor
                      skills={editData.skills}
                      onAdd={addSkill}
                      onRemove={removeSkill}
                      onLevelChange={updateSkillLevel}
                    />
                    <TagEditor
                      label="Faglige interesser"
                      items={editData.professionalInterests}
                      onAdd={(value) => addTag('professionalInterests', value)}
                      onRemove={(value) => removeTag('professionalInterests', value)}
                      placeholder="For eksempel Produktdesign"
                    />
                    <TagEditor
                      label="Personlige egenskaper"
                      items={editData.personalCharacteristics}
                      onAdd={(value) => addTag('personalCharacteristics', value)}
                      onRemove={(value) => removeTag('personalCharacteristics', value)}
                      placeholder="For eksempel Strukturert"
                    />
                    <TagEditor
                      label="Pågående fag"
                      items={editData.currentSubjects}
                      onAdd={(value) => addTag('currentSubjects', value)}
                      onRemove={(value) => removeTag('currentSubjects', value)}
                      placeholder="For eksempel Webutvikling"
                    />
                    <TagEditor
                      label="Fullførte fag"
                      items={editData.completedSubjects}
                      onAdd={(value) => addTag('completedSubjects', value)}
                      onRemove={(value) => removeTag('completedSubjects', value)}
                      placeholder="For eksempel Databaser"
                    />
                    <TagEditor
                      label="Foretrukne steder"
                      items={editData.preferredLocations}
                      onAdd={(value) => addTag('preferredLocations', value)}
                      onRemove={(value) => removeTag('preferredLocations', value)}
                      placeholder="For eksempel Oslo"
                    />
                  </>
                )}
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={handleSaveChanges}>Lagre endringer</button>
                  <button className="btn btn-secondary" onClick={handleCancel}>Avbryt</button>
                </div>
              </div>
            )}
          </div>
        </section>

        {isCompany ? (
          <>
            <section className="profile-section">
              <h2>Bedriftsoversikt</h2>
              <div className="applications-list">
                <div className="application-card">
                  <div className="app-info">
                    <h3>Registrering</h3>
                    <p>{company.registrationComplete ? 'Registrert og klar for publisering.' : 'Registrering ikke fullfort.'}</p>
                    <small>{company.location} • {company.size}</small>
                  </div>
                  <div className="app-status">{getStatusBadge(85, 65)}</div>
                </div>
                <div className="application-card">
                  <div className="app-info">
                    <h3>Forventningsgrunnlag</h3>
                    <p>{company.expectationsQualityScore}% kvalitet i bedriftsprofilen</p>
                    <small>Kan forbedres ved a beskrive leveranser og teamarbeid tydeligere.</small>
                  </div>
                  <div className="app-status">{getStatusBadge(company.expectationsQualityScore, 65)}</div>
                </div>
              </div>
            </section>

            <section className="profile-section">
              <h2>Pågående annonsearbeid</h2>
              {drafts.length > 0 ? (
                <div className="applications-list">
                  {drafts.map((draft) => (
                    <div key={draft.id} className="application-card">
                      <div className="app-info">
                        <h3>{draft.title || 'Ny upublisert sak'}</h3>
                        <p>{draft.startWithin || 'Ingen oppstartsfrist lagt inn'}</p>
                        <small>Sist oppdatert {formatDate(draft.lastEditedAt)}</small>
                      </div>
                      <div className="app-status">
                        <button className="btn btn-primary btn-small" onClick={() => navigate('/Chatbot_test')}>Fortsett</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Ingen pågående annonseutkast akkurat nå.</p>
              )}
            </section>

            <section className="profile-section">
              <h2>Publiserte saker</h2>
              <div className="applications-list">
                {publishedCases.map((ad) => (
                  <div key={ad.id} className="application-card">
                    <div className="app-info">
                      <h3>{ad.title}</h3>
                      <p>{ad.classification?.type || 'Bachelor'} • Viktigste krav: {ad.topQualification || ad.requirementAnalysis?.mostImportantQualification}</p>
                      <small>Publisert {formatDate(ad.publishedAt)}</small>
                    </div>
                    <div className="app-status">
                      <button className="btn btn-primary btn-small" onClick={() => navigate('/Chatbot_test')}>Rediger ny versjon</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="profile-section">
              <h2>Bedriftsprofil</h2>
              <p><strong>Kjerneområder</strong></p>
              <ChipList items={company.companyQualifications} />
              <p className="section-spacer-top"><strong>Arbeidsområder</strong></p>
              <ChipList items={company.workAreas} />
              <p className="section-spacer-top"><strong>Rekrutteringsfokus</strong></p>
              <ChipList items={company.hiringFocus} />
            </section>
          </>
        ) : (
          <>
            <section className="profile-section">
              <h2>Faglig profil</h2>
              <p><strong>Rangerte ferdigheter</strong></p>
              <div className="skill-bar-list">
                {student.skills
                  .slice()
                  .sort((left, right) => right.level - left.level)
                  .map((skill) => (
                    <div key={skill.name} className="skill-bar-row">
                      <strong>{skill.name}</strong>
                      <div className="skill-bar-track">
                        <div className={`skill-bar-fill skill-bar-fill-${skill.level}`} />
                      </div>
                      <span>{skill.level}/5</span>
                    </div>
                  ))}
              </div>
              <p className="section-spacer-top"><strong>Interesser</strong></p>
              <ChipList items={student.professionalInterests} />
              <p className="section-spacer-top"><strong>Personlige egenskaper</strong></p>
              <ChipList items={student.personalCharacteristics} />
            </section>

            <section className="profile-section">
              <h2>Fag og preferanser</h2>
              <p><strong>Pågående fag</strong></p>
              <ChipList items={student.currentSubjects} />
              <p className="section-spacer-top"><strong>Fullførte fag</strong></p>
              <ChipList items={student.completedSubjects} />
              <p className="section-spacer-top"><strong>Foretrukne steder</strong></p>
              <ChipList items={student.preferredLocations} />
            </section>

            <section className="profile-section">
              <h2>Varsler og match</h2>
              {notifications.length > 0 ? (
                <div className="applications-list">
                  {notifications.map((item) => (
                    <div key={item.id} className="application-card">
                      <div className="app-info">
                        <h3>{item.title}</h3>
                        <p>{item.classification?.type || 'Bachelor'} • {item.scoreSummary.totalScore}% match</p>
                        <small>
                          Beste ferdigheter: {item.scoreSummary.rankedSkillMatches.slice(0, 2).map((skill) => `${skill.name} (${skill.level}/5)`).join(', ') || item.scoreSummary.topQualification}
                        </small>
                      </div>
                      <div className="app-status app-status-stack">
                        {getStatusBadge(item.scoreSummary.totalScore)}
                        <button className="btn btn-primary btn-small" onClick={() => openRecommendedAd(item.id)}>
                          Se annonse
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Ingen publiserte saker ligger over varselterskelen din ennå.</p>
              )}
            </section>

            <section className="profile-section">
              <h2>Match mot publiserte saker</h2>
              <div className="applications-list">
                {caseMatches.map((item) => (
                  <div key={item.id} className="application-card">
                    <div className="app-info">
                      <h3>{item.title}</h3>
                      <p>{item.classification?.type || 'Bachelor'} • Total score {item.scoreSummary.totalScore}%</p>
                      <small>
                        Toppferdigheter: {item.scoreSummary.rankedSkillMatches.slice(0, 2).map((skill) => `${skill.name} (${skill.level}/5)`).join(', ') || 'Ingen direkte ferdighetstreff'}
                      </small>
                    </div>
                    <div className="app-status app-status-stack">
                      {getStatusBadge(item.scoreSummary.totalScore)}
                      <button className="btn btn-primary btn-small" onClick={() => openRecommendedAd(item.id)}>
                        Åpen annonse
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="profile-section">
              <h2>Automatisk datainnhenting</h2>
              <div className="applications-list">
                <div className="application-card">
                  <div className="app-info">
                    <h3>Status</h3>
                    <p>{student.dataCollectionStatus}</p>
                    <small>Neste naturlige steg er synk mot studieprogresjon, CV eller LinkedIn-import.</small>
                  </div>
                  <div className="app-status">
                    <button className="btn btn-secondary btn-small" onClick={() => navigate('/internships')}>Se praksisplasser</button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
