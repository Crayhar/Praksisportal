import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function buildFallbackFullAd(internship) {
  const requiredQualifications = internship.requiredQualifications || internship.skills || [];
  const preferredQualifications = internship.preferredQualifications || [];
  const personalQualifications = internship.personalQualifications
    ? internship.personalQualifications.split(/\n|,/).map((item) => item.trim()).filter(Boolean)
    : [];

  return `
## ${internship.title}

### Kort om bedriften
${internship.companySummary || internship.companyDescription || `${internship.company} tilbyr et relevant praksisforløp for studenter.`}
${internship.website ? `\nNettside: ${internship.website}` : ''}

### Oppdragskontekst
${internship.assignmentContext || internship.description}

### Arbeidsoppgaver
${internship.description}

### Leveranser og forventninger
**Leveranser**
${internship.deliveries || 'Leveranser avtales nærmere med bedriften.'}

**Forventninger**
${internship.expectations || 'Forventninger konkretiseres videre i dialog med bedriften.'}

### Kvalifikasjoner
**Krav – MÅ ha**
${requiredQualifications.length > 0 ? requiredQualifications.map((item) => `- ${item}`).join('\n') : '- Ikke spesifisert'}

**Ønskelig – FINT å ha**
${preferredQualifications.length > 0 ? preferredQualifications.map((item) => `- ${item}`).join('\n') : '- Ikke spesifisert'}

**Personlige kvalifikasjoner**
${personalQualifications.length > 0 ? personalQualifications.map((item) => `- ${item}`).join('\n') : '- Ikke spesifisert'}

### Praktisk informasjon
- Lokasjon: ${internship.location}
- Oppstart: ${internship.startDate}
- Sluttdato: ${internship.endDate}
- Start senest innen: ${internship.startWithin || 'Avtales nærmere'}
- Omfang: ${internship.maxHours} timer
`.trim();
}

function sanitizeFullAd(markdown) {
  if (!markdown) {
    return '';
  }

  return markdown
    .replace(/^Her er et utkast til prosjektet basert pa informasjonen du ga:\s*/i, '')
    .replace(/^Her er et utkast til prosjektet basert på informasjonen du ga:\s*/i, '')
    .trim();
}

export default function InternshipDetailsModal({ internship, onClose, userRole }) {
  const [viewMode, setViewMode] = useState('summary');

  useEffect(() => {
    setViewMode('summary');
  }, [internship?.id]);

  if (!internship) {
    return null;
  }

  const isCompany = userRole === 'company';
  const isStudent = userRole === 'student';
  const companyInfoText =
    internship.companyDescription || internship.companySummary || internship.assignmentContext || 'Bedriften har ikke lagt inn en utvidet beskrivelse ennå.';
  const fullAd = sanitizeFullAd(
    internship.generatedAdData?.markdown || internship.generatedAd || buildFallbackFullAd(internship)
  );

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="internship-modal-title"
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Lukk detaljvisning">
          ×
        </button>

        <p className="modal-eyebrow">{isCompany ? 'Oppdragsdetaljer' : 'Stillingsdetaljer'}</p>
        {isStudent && internship.matchSummary ? (
          <div className="match-summary match-summary-modal">
            <div className="match-summary-copy">
              <p className="match-summary-kicker">Din match med prosjektet</p>
              <p className="match-summary-title">
                Beste treff: {internship.matchSummary.rankedSkillMatches[0]?.name || internship.matchSummary.topQualification}
              </p>
            </div>
            <div className="match-score match-score-lg">
              <div className="match-score-inner">
                <strong className="match-score-value match-score-value-md">{internship.matchSummary.totalScore}%</strong>
                <span className="match-score-caption">match</span>
              </div>
            </div>
          </div>
        ) : null}
        <h2 id="internship-modal-title">{internship.title}</h2>
        <p className="modal-company">🏢 {internship.company}</p>
        <p className="modal-location">📍 {internship.location}</p>

        <div className="modal-view-switch">
          <button
            type="button"
            className={`modal-view-button ${viewMode === 'summary' ? 'active' : ''}`}
            onClick={() => setViewMode('summary')}
          >
            Sammendrag
          </button>
          <button
            type="button"
            className={`modal-view-button ${viewMode === 'full' ? 'active' : ''}`}
            onClick={() => setViewMode('full')}
          >
            Se hele prosjektet
          </button>
        </div>

        <div className="modal-layout">
          <div className="modal-main">
            {viewMode === 'full' ? (
              <div className="modal-panel modal-full-ad-panel">
                <h3>Hele prosjektet</h3>
                <div className="modal-full-ad">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullAd}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <>
                <div className="modal-grid">
                  <div className="modal-panel">
                    <h3>Om prosjektet</h3>
                    <p>{internship.generatedAdData?.summary || internship.description}</p>
                  </div>
                  <div className="modal-panel">
                    <h3>Praktisk informasjon</h3>
                    <p><strong>Oppstart:</strong> {internship.startDate}</p>
                    <p><strong>Sluttdato:</strong> {internship.endDate}</p>
                    <p>
                      <strong>Arbeidsform:</strong> {internship.location.toLowerCase().includes('remote') ? 'Fjernarbeid eller hybrid' : 'Oppmøte hos bedriften'}
                    </p>
                  </div>
                </div>

                <div className="modal-panel">
                  <h3>Kvalifikasjoner</h3>
                  {internship.requiredQualifications?.length > 0 && (
                    <p><strong>MÅ ha:</strong> {internship.requiredQualifications.join(', ')}</p>
                  )}
                  {internship.preferredQualifications?.length > 0 && (
                    <p><strong>FINT å ha:</strong> {internship.preferredQualifications.join(', ')}</p>
                  )}
                  {!internship.requiredQualifications?.length && !internship.preferredQualifications?.length && (
                    <p>{internship.skills.join(', ')}</p>
                  )}
                  <p>
                    <strong>Relevant for praksispoeng:</strong> {internship.internshipCredits ? 'Ja' : 'Nei'}
                  </p>
                  {internship.classification?.type ? (
                    <p>
                      <strong>Sakstype:</strong> {internship.classification.type}
                    </p>
                  ) : null}
                  {isStudent && internship.matchSummary ? (
                    <>
                      <p>
                        <strong>Matchscore:</strong> {internship.matchSummary.totalScore}%
                      </p>
                      <p>
                        <strong>Viktigste treff:</strong> {internship.matchSummary.topQualification}
                      </p>
                    </>
                  ) : null}
                </div>

                <div className="modal-panel">
                  <h3>{isCompany ? 'Hvorfor dette prosjektet fungerer' : 'Hvorfor denne praksisen kan passe deg'}</h3>
                  <p>
                    {isCompany
                      ? 'Dette prosjektet kombinerer tydelig rollebeskrivelse, sted og varighet. Du kan bruke det som utgangspunkt for å skrive et bedre eller mer presist prosjekt.'
                      : 'Prosjektet gir en konkret rollebeskrivelse og tydelig praktisk informasjon, slik at du raskt kan vurdere om praksisplassen passer ferdighetene og målene dine.'}
                  </p>
                </div>
              </>
            )}
          </div>

          <aside className="modal-side">
            <div className="modal-panel">
              <h3>Om bedriften</h3>
              <p><strong>Navn:</strong> {internship.companyName || internship.company}</p>
              <p>{companyInfoText}</p>
              {internship.industry ? (
                <p><strong>Bransje:</strong> {internship.industry}</p>
              ) : null}
              {internship.companySize ? (
                <p><strong>Størrelse:</strong> {internship.companySize}</p>
              ) : null}
              {internship.website ? (
                <p>
                  <strong>Nettside:</strong>{' '}
                  <a href={internship.website} target="_blank" rel="noreferrer">
                    {internship.website}
                  </a>
                </p>
              ) : null}
            </div>

            {(internship.workAreas?.length || internship.companyQualifications?.length) ? (
              <div className="modal-panel">
                <h3>Arbeidsområder</h3>
                <p>{(internship.workAreas?.length ? internship.workAreas : internship.companyQualifications).join(', ')}</p>
              </div>
            ) : null}

            <div className="modal-panel">
              <h3>Før du søker</h3>
              <p>
                Les gjennom oppdraget, leveransene og forventningene nøye. Bruk bedriftsinformasjonen her for å vurdere om miljøet og fagområdet passer deg.
              </p>
            </div>
          </aside>
        </div>

        <div className="modal-actions">
          <Link
            to={isCompany ? '/Chatbot_test' : `/apply?selected=${internship.id}`}
            className="btn btn-primary"
            onClick={onClose}
          >
            {isCompany ? 'Lag lignende prosjekt' : 'Søk på prosjektet'}
          </Link>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
}
