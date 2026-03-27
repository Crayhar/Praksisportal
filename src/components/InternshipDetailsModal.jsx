import { Link } from 'react-router-dom';

export default function InternshipDetailsModal({ internship, onClose, userRole }) {
  if (!internship) {
    return null;
  }

  const isCompany = userRole === 'company';
  const isStudent = userRole === 'student';
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
