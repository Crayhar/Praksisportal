import { Link } from 'react-router-dom';

export default function InternshipDetailsModal({ internship, onClose, userRole }) {
  if (!internship) {
    return null;
  }

  const isCompany = userRole === 'company';
  const compensationLabel =
    internship.salaryType === 'hourly'
      ? `Timelonn: ${internship.compensationAmount} NOK per time`
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
          <h3>Onskede ferdigheter</h3>
          <p>{internship.skills.join(', ')}</p>
          <p>
            <strong>Relevant for praksispoeng:</strong> {internship.internshipCredits ? 'Ja' : 'Nei'}
          </p>
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
          <Link to={isCompany ? '/Chatbot_test' : '/apply'} className="btn btn-primary" onClick={onClose}>
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
