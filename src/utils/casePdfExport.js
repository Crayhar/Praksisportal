import { jsPDF } from 'jspdf';

const PRIMARY = [41, 128, 185];
const DARK = [44, 62, 80];
const GRAY = [127, 140, 141];
const WHITE = [255, 255, 255];

const MARGIN = 18;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/\n|,/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function formatDate(dateString) {
  if (!dateString) return 'Ikke satt';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function addFooter(doc, caseTitle, pageNum, totalPages) {
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    `Praksisportal  •  ${caseTitle}  •  Side ${pageNum} av ${totalPages}`,
    PAGE_WIDTH / 2,
    291,
    { align: 'center' }
  );
}

function ensureSpace(doc, y, neededHeight) {
  if (y + neededHeight > 278) {
    doc.addPage();
    return 20;
  }
  return y;
}

function sectionHeader(doc, title, y) {
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 9, 1, 1, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title.toUpperCase(), MARGIN + 4, y + 6.2);
  return y + 14;
}

function writeParagraph(doc, text, y) {
  const content = String(text || 'Ikke oppgitt').trim() || 'Ikke oppgitt';
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(content, CONTENT_WIDTH);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 5 + 4;
}

function writeBullets(doc, items, y) {
  const safeItems = items.length > 0 ? items : ['Ikke oppgitt'];
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  safeItems.forEach((item) => {
    y = ensureSpace(doc, y, 8);
    const lines = doc.splitTextToSize(`• ${item}`, CONTENT_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 1;
  });

  return y + 2;
}

function buildFallbackFullAd(caseData) {
  const requiredQualifications = toArray(
    caseData.requiredQualifications || caseData.professionalQualifications
  );
  const preferredQualifications = toArray(caseData.preferredQualifications);
  const personalQualifications = toArray(caseData.personalQualifications);

  return `
## ${caseData.title || caseData.taskFocus || 'Studentprosjekt'}

### Kort om bedriften
${caseData.companyQualifications || `${caseData.companyName || caseData.logo || 'Bedriften'} tilbyr et relevant praksisforløp for studenter.`}
${caseData.website ? `\nNettside: ${caseData.website}` : ''}

### Oppdragskontekst
${caseData.assignmentContext || caseData.taskDescription || 'Ikke oppgitt'}

### Arbeidsoppgaver
${caseData.taskDescription || 'Ikke oppgitt'}

### Leveranser og forventninger
**Leveranser**
${caseData.deliveries || 'Leveranser avtales nærmere med bedriften.'}

**Forventninger**
${caseData.expectations || 'Forventninger konkretiseres videre i dialog med bedriften.'}

### Kvalifikasjoner
**Krav – MÅ ha**
${requiredQualifications.length > 0 ? requiredQualifications.map((item) => `- ${item}`).join('\n') : '- Ikke spesifisert'}

**Ønskelig – FINT å ha**
${preferredQualifications.length > 0 ? preferredQualifications.map((item) => `- ${item}`).join('\n') : '- Ikke spesifisert'}

**Personlige kvalifikasjoner**
${personalQualifications.length > 0 ? personalQualifications.map((item) => `- ${item}`).join('\n') : '- Ikke spesifisert'}

### Praktisk informasjon
- Lokasjon: ${caseData.location || 'Ikke oppgitt'}
- Oppstart: ${formatDate(caseData.startDate)}
- Sluttdato: ${formatDate(caseData.endDate)}
- Start senest innen: ${caseData.startWithin || 'Avtales nærmere'}
- Omfang: ${caseData.maxHours || 'Ikke oppgitt'} timer
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

function markdownToPlainText(markdown) {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^###\s+/gm, '')
    .replace(/^##\s+/gm, '')
    .replace(/^#\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^-\s+/gm, '• ')
    .replace(/^\*\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function exportCaseToPdf(caseData, companyProfile = null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const title = caseData.title || caseData.taskFocus || 'Studentprosjekt';
  const companyName =
    caseData.companyName || companyProfile?.name || caseData.logo || 'Bedrift';
  const status = caseData.status === 'published' ? 'Publisert' : 'Utkast';

  const fullAdMarkdown = sanitizeFullAd(
    caseData.generatedAdData?.markdown || caseData.generatedAd || buildFallbackFullAd(caseData)
  );
  const fullAdText = markdownToPlainText(fullAdMarkdown);

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PAGE_WIDTH, 42, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(title, MARGIN, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${companyName}  •  ${status}`, MARGIN, 25);

  const detailsLine = [
    caseData.location || 'Lokasjon ikke satt',
    caseData.workMode || null,
    caseData.startWithin || null,
    caseData.maxHours ? `${caseData.maxHours} timer` : null,
  ]
    .filter(Boolean)
    .join('  •  ');

  doc.setFontSize(9);
  doc.text(detailsLine || 'Ingen detaljinfo satt', MARGIN, 32);

  doc.text(
    `${formatDate(caseData.startDate)} - ${formatDate(caseData.endDate)}`,
    MARGIN,
    38
  );

  let y = 50;

  y = sectionHeader(doc, 'Hele prosjektet', y);
  const lines = doc.splitTextToSize(fullAdText || 'Ikke generert ennå.', CONTENT_WIDTH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  lines.forEach((line) => {
    y = ensureSpace(doc, y, 6);
    doc.text(line, MARGIN, y);
    y += 5;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, title, i, totalPages);
  }

  const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]+/g, '_');
  doc.save(`${sanitizedTitle || 'studentprosjekt'}_${status.toLowerCase()}.pdf`);
}
