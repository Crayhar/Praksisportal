import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Footer from '../components/Footer';
import { companyProfile } from '../utils/api';

function normalizeWebsiteUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function getPhoneLink(phone) {
  const normalized = String(phone || '').replace(/\s+/g, '');
  return normalized ? `tel:${normalized}` : '';
}

export default function CompanyProfilePublic() {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await companyProfile.getById(companyId);
        setCompany(data);
      } catch (err) {
        setError(err.message || 'Kunne ikke laste bedriftsprofil.');
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [companyId]);

  return (
    <main className="student-profile company-public-page">
      <div className="container">
        {loading ? (
          <p className="company-public-state">Laster bedriftsprofil...</p>
        ) : error ? (
          <p className="company-public-state company-public-error">{error}</p>
        ) : !company ? (
          <p className="company-public-state company-public-error">Bedriften ble ikke funnet.</p>
        ) : (
          <section className="profile-header profile-header-accent">
            <div className="profile-avatar">
              <div className="avatar-placeholder">
                {company.logo || (company.name ? company.name.slice(0, 2).toUpperCase() : '?')}
              </div>
            </div>
            <div className="profile-info">
              <h1>{company.name}</h1>
              {company.description ? <p className="bio">{company.description}</p> : null}

              <div className="profile-details">
                <span>
                  📧 {company.email ? <a className="profile-email-link" href={`mailto:${company.email}`}>{company.email}</a> : 'Ikke satt'}
                </span>
                <span>
                  📱 {company.phone ? <a className="profile-phone-link" href={getPhoneLink(company.phone)}>{company.phone}</a> : 'Ikke satt'}
                </span>
                <span>🏢 {company.industry || 'Ikke satt'} • {company.size || 'Ikke satt'}</span>
                <span>📍 {company.location || 'Ikke satt'}</span>
                {company.website ? (
                  <span>
                    🌐 <a href={normalizeWebsiteUrl(company.website)} target="_blank" rel="noreferrer">{company.website}</a>
                  </span>
                ) : null}
              </div>

              {(company.companyQualifications || []).length > 0 ? (
                <div className="chip-section">
                  <p className="chip-section-label">Kjernekompetanse</p>
                  <div className="chip-list">
                    {company.companyQualifications.map((item) => (
                      <span key={item} className="chip">{item}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {(company.workAreas || []).length > 0 ? (
                <div className="chip-section">
                  <p className="chip-section-label">Arbeidsområder</p>
                  <div className="chip-list">
                    {company.workAreas.map((item) => (
                      <span key={item} className="chip">{item}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {(company.hiringFocus || []).length > 0 ? (
                <div className="chip-section">
                  <p className="chip-section-label">Hvem de ser etter</p>
                  <div className="chip-list">
                    {company.hiringFocus.map((item) => (
                      <span key={item} className="chip">{item}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="profile-header-actions">
                <Link className="btn btn-secondary" to="/internships">Tilbake til praksisplasser</Link>
              </div>
            </div>
          </section>
        )}
      </div>
      <Footer />
    </main>
  );
}
