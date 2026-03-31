import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function buildFallbackFullAd(internship) {
  const professionalQualifications = internship.professionalQualifications
    ? internship.professionalQualifications.split(/\n|,/).map((item) => item.trim()).filter(Boolean)
    : internship.skills || [];
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
**Faglige kvalifikasjoner**
${professionalQualifications.length > 0 ? professionalQualifications.map((item) => `- ${item}`).join('\n') : '- Ikke spesifisert'}

**Personlige kvalifikasjoner**
${personalQualifications.length > 0 ? personalQualifications.map((item) => `- ${item}`).join('\n') : '- Ikke spesifisert'}

### Praktisk informasjon
- Lokasjon: ${internship.location}
- Oppstart: ${internship.startDate}
- Sluttdato: ${internship.endDate}
- Start senest innen: ${internship.startWithin || 'Avtales nærmere'}
- Omfang: ${internship.maxHours} timer
- Kompensasjon: ${internship.salaryType === 'hourly' ? `${internship.compensationAmount} NOK per time` : `${internship.compensationAmount} NOK fastpris`}
`.trim();
}

function sanitizeFullAd(markdown) {
  if (!markdown) {
    return '';
  }

  return markdown
    .replace(/^Her er et utkast til annonsen basert pa informasjonen du ga:\s*/i, '')
    .replace(/^Her er et utkast til annonsen basert på informasjonen du ga:\s*/i, '')
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
  const compensationLabel =
    internship.salaryType === 'hourly'
      ? `Timelønn: ${internship.compensationAmount} NOK per time`
      : `Fastpris: ${internship.compensationAmount} NOK`;

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
              <p className="match-summary-kicker">Din match med annonsen</p>
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

        {isStudent ? (
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
              Se hele annonsen
            </button>
          </div>
        ) : null}

        <div className="modal-layout">
          <div className="modal-main">
            {viewMode === 'full' ? (
              <div className="modal-panel modal-full-ad-panel">
                <h3>Hele annonsen</h3>
                <div className="modal-full-ad">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullAd}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <>
                <div className="modal-grid">
                  <div className="modal-panel">
                    <h3>Om annonsen</h3>
                    <p>{internship.description}</p>
                  </div>
                  <div className="modal-panel">
                    <h3>Praktisk informasjon</h3>
                    <p><strong>Oppstart:</strong> {internship.startDate}</p>
                    <p><strong>Sluttdato:</strong> {internship.endDate}</p>
                    <p><strong>Maks antall timer:</strong> {internship.maxHours}</p>
                    <p><strong>Kompensasjon:</strong> {compensationLabel}</p>
                    <p>
                      <strong>Arbeidsform:</strong> {internship.location.toLowerCase().includes('remote') ? 'Fjernarbeid eller hybrid' : 'Oppmøte hos bedriften'}
                    </p>
                  </div>
                </div>

                <div className="modal-panel">
                  <h3>Ønskede ferdigheter</h3>
                  <p>{internship.skills.join(', ')}</p>
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
                  <h3>{isCompany ? 'Hvorfor denne annonsen fungerer' : 'Hvorfor denne praksisen kan passe deg'}</h3>
                  <p>
                    {isCompany
                      ? 'Denne annonsen kombinerer tydelig rollebeskrivelse, sted og varighet. Du kan bruke den som utgangspunkt for å skrive en bedre eller mer presis annonse.'
                      : 'Annonsen gir en konkret rollebeskrivelse og tydelig praktisk informasjon, slik at du raskt kan vurdere om praksisplassen passer ferdighetene og målene dine.'}
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
            {isCompany ? 'Lag lignende annonse' : 'Søk på annonsen'}
          </Link>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
}
