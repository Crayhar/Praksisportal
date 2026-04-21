const OFFERING_LABELS = {
  workplace: 'Mulighet for jobb etter oppdraget',
  certification: 'Sertifisering gjennom jobben',
  reference: 'Attest / referanse',
  mentorship: 'Fast mentor og tett oppfolging',
};

export function getOfferingLabels(offerings, offeringOther = '') {
  const values = Array.isArray(offerings) ? offerings : [];
  const otherValue = String(offeringOther || '').trim();

  const labels = values
    .map((offering) => {
      if (offering === 'other') {
        return otherValue;
      }
      return OFFERING_LABELS[offering] || String(offering || '').trim();
    })
    .filter(Boolean);

  return [...new Set(labels)];
}
