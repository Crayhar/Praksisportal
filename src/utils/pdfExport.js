import { jsPDF } from 'jspdf';

const PRIMARY = [41, 128, 185];
const DARK = [44, 62, 80];
const GRAY = [127, 140, 141];
const LIGHT_BG = [245, 248, 250];
const WHITE = [255, 255, 255];

const MARGIN = 18;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function addPageFooter(doc, studentName, pageNum, totalPages) {
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    `Praksisportal  •  ${studentName}  •  Side ${pageNum} av ${totalPages}`,
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

function drawSectionHeader(doc, title, y) {
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 9, 1, 1, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), MARGIN + 4, y + 6.2);
  return y + 14;
}

function drawSkillBar(doc, skill, x, y, barStart, barLength) {
  doc.setTextColor(...DARK);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`• ${skill.name}`, x, y);

  doc.setFillColor(220, 225, 230);
  doc.roundedRect(barStart, y - 3.5, barLength, 3.5, 1, 1, 'F');

  doc.setFillColor(...PRIMARY);
  doc.roundedRect(barStart, y - 3.5, (skill.level / 5) * barLength, 3.5, 1, 1, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(`${skill.level}/5`, barStart + barLength + 3, y);
}

function drawChips(doc, items, y) {
  let x = MARGIN + 4;
  const chipH = 6;
  const paddingX = 4;
  const paddingY = 1;

  items.forEach((item) => {
    const textWidth = doc.getTextWidth(item);
    const chipW = textWidth + paddingX * 2;

    if (x + chipW > PAGE_WIDTH - MARGIN) {
      x = MARGIN + 4;
      y += chipH + 3;
    }

    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...PRIMARY);
    doc.roundedRect(x, y - chipH + paddingY, chipW, chipH, 1.5, 1.5, 'FD');

    doc.setTextColor(...PRIMARY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(item, x + paddingX, y - 0.5);

    x += chipW + 3;
  });

  return y + chipH + 4;
}

export function exportStudentProfileToPdf(student, caseMatches = [], completedCases = []) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const fullName = `${student.firstName} ${student.lastName}`;

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PAGE_WIDTH, 46, 'F');

  doc.setFillColor(...WHITE);
  doc.circle(MARGIN + 13, 23, 13, 'F');
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`;
  doc.text(initials, MARGIN + 13, 26, { align: 'center' });

  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(fullName, MARGIN + 32, 19);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(student.headline || '', MARGIN + 32, 27);

  doc.setFontSize(8.5);
  const contactParts = [student.email, student.phone, student.location].filter(Boolean);
  doc.text(contactParts.join('   •   '), MARGIN + 32, 35);
  if (student.school) {
    doc.text(`${student.school}  •  ${student.degreeLevel || ''} i ${student.field || ''}`, MARGIN + 32, 41);
  }

  let y = 56;

  if (student.bio) {
    doc.setTextColor(...GRAY);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'italic');
    const bioLines = doc.splitTextToSize(student.bio, CONTENT_WIDTH);
    doc.text(bioLines, MARGIN, y);
    y += bioLines.length * 5 + 6;
  }

  if (student.skills?.length > 0) {
    y = ensureSpace(doc, y, 20);
    y = drawSectionHeader(doc, 'Ferdigheter', y);

    const sorted = [...student.skills].sort((a, b) => b.level - a.level);
    const col1 = sorted.slice(0, Math.ceil(sorted.length / 2));
    const col2 = sorted.slice(Math.ceil(sorted.length / 2));
    const colW = CONTENT_WIDTH / 2 - 4;
    const barStart = MARGIN + 38;
    const barLength = colW - 38 - 10;
    const col2X = MARGIN + CONTENT_WIDTH / 2 + 2;
    const bar2Start = col2X + 38 - MARGIN;

    const maxRows = Math.max(col1.length, col2.length);
    for (let i = 0; i < maxRows; i++) {
      y = ensureSpace(doc, y, 8);
      if (col1[i]) drawSkillBar(doc, col1[i], MARGIN + 4, y, barStart, barLength);
      if (col2[i]) drawSkillBar(doc, col2[i], col2X, y, bar2Start + MARGIN, barLength);
      y += 8;
    }
    y += 4;
  }

  if (student.professionalInterests?.length > 0) {
    y = ensureSpace(doc, y, 24);
    y = drawSectionHeader(doc, 'Faglige interesser', y);
    y = drawChips(doc, student.professionalInterests, y);
  }

  if (student.personalCharacteristics?.length > 0) {
    y = ensureSpace(doc, y, 24);
    y = drawSectionHeader(doc, 'Personlige egenskaper', y);
    y = drawChips(doc, student.personalCharacteristics, y);
  }

  if (student.currentSubjects?.length > 0) {
    y = ensureSpace(doc, y, 24);
    y = drawSectionHeader(doc, 'Pågående fag', y);
    y = drawChips(doc, student.currentSubjects, y);
  }

  if (student.completedSubjects?.length > 0) {
    y = ensureSpace(doc, y, 24);
    y = drawSectionHeader(doc, 'Fullførte fag', y);
    y = drawChips(doc, student.completedSubjects, y);
  }

  if (student.preferredLocations?.length > 0) {
    y = ensureSpace(doc, y, 24);
    y = drawSectionHeader(doc, 'Foretrukne steder', y);
    y = drawChips(doc, student.preferredLocations, y);
  }

  y = ensureSpace(doc, y, 24);
  y = drawSectionHeader(doc, 'Gjennomførte praksisperioder', y);

  if (completedCases.length === 0) {
    doc.setTextColor(...GRAY);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'italic');
    doc.text('Ingen registrerte praksisperioder ennå.', MARGIN + 4, y);
    y += 10;
  } else {
    completedCases.forEach((item) => {
      y = ensureSpace(doc, y, 14);
      doc.setTextColor(...DARK);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(item.title, MARGIN + 4, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(`${item.companyName || ''}  •  ${item.startDate || ''} – ${item.endDate || ''}`, MARGIN + 4, y);
      y += 8;
    });
  }

  if (caseMatches.length > 0) {
    y = ensureSpace(doc, y, 24);
    y = drawSectionHeader(doc, 'Beste praksismatcher', y);

    caseMatches.slice(0, 5).forEach((match) => {
      y = ensureSpace(doc, y, 14);

      const score = match.scoreSummary.totalScore;
      const badgeColor = score >= 80 ? [39, 174, 96] : score >= 55 ? [41, 128, 185] : [127, 140, 141];
      doc.setFillColor(...badgeColor);
      doc.roundedRect(MARGIN + 4, y - 5, 18, 7, 1.5, 1.5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${score}%`, MARGIN + 13, y, { align: 'center' });

      doc.setTextColor(...DARK);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(match.title, MARGIN + 26, y);

      y += 6;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      const topSkill = match.scoreSummary.rankedSkillMatches[0]?.name || match.scoreSummary.topQualification || '';
      doc.text(
        `${match.companyName || ''}${topSkill ? `  •  Beste treff: ${topSkill}` : ''}`,
        MARGIN + 26,
        y
      );
      y += 8;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(doc, fullName, i, totalPages);
  }

  doc.save(`${student.firstName}_${student.lastName}_profil.pdf`);
}
