// Server-side case-to-student match scoring
// Mirrors the logic in src/utils/caseMatching.js

// ─── Subject inference map (12 categories) ───────────────────────────────────

const subjectMap = [
  {
    tokens: ['react', 'vue', 'angular', 'svelte', 'frontend', 'javascript', 'typescript', 'css', 'html', 'web'],
    subjects: ['Webutvikling', 'Frontendutvikling', 'Interaksjonsdesign'],
  },
  {
    tokens: ['ux', 'ui', 'design', 'figma', 'prototype', 'wireframe', 'brukerreise', 'brukertesting', 'sketch', 'adobe'],
    subjects: ['Interaksjonsdesign', 'Tjenestedesign', 'Grafisk design'],
  },
  {
    tokens: ['data', 'analyse', 'sql', 'python', 'dashboard', 'pandas', 'numpy', 'tableau', 'statistikk', 'maskinlæring', 'ml'],
    subjects: ['Databaser', 'Dataanalyse', 'Statistikk'],
  },
  {
    tokens: ['api', 'backend', 'node', 'server', 'express', 'django', 'flask', 'java', 'spring', 'php', 'rest', 'graphql'],
    subjects: ['Systemutvikling', 'Backendutvikling', 'Databaser'],
  },
  {
    tokens: ['sky', 'cloud', 'aws', 'azure', 'gcp', 'terraform', 'devops', 'docker', 'kubernetes'],
    subjects: ['Skyteknologi', 'Drift og DevOps', 'Systemadministrasjon'],
  },
  {
    tokens: ['sikkerhet', 'owasp', 'risiko', 'nettverk', 'penetrasjon', 'sårbarhet', 'kryptografi', 'brannmur'],
    subjects: ['Informasjonssikkerhet', 'Nettverk', 'Risikovurdering'],
  },
  {
    tokens: ['prosjektledelse', 'scrum', 'agile', 'kanban', 'jira', 'sprint', 'leveranse', 'prosjektstyring'],
    subjects: ['Prosjektledelse', 'Prosjektarbeid', 'Systemutvikling'],
  },
  {
    tokens: ['markedsføring', 'marketing', 'seo', 'sosiale medier', 'innhold', 'content', 'kampanje', 'kommunikasjon'],
    subjects: ['Markedsføring', 'Kommunikasjon', 'Medier og kommunikasjon'],
  },
  {
    tokens: ['regnskap', 'økonomi', 'budsjett', 'finans', 'regnskapsføring', 'faktura', 'bærekraft', 'rapportering'],
    subjects: ['Økonomi og administrasjon', 'Regnskap', 'Finansiell analyse'],
  },
  {
    tokens: ['mobil', 'android', 'ios', 'swift', 'kotlin', 'react native', 'flutter', 'app'],
    subjects: ['Mobilutvikling', 'Webutvikling', 'Frontendutvikling'],
  },
  {
    tokens: ['3d', 'blender', 'unity', 'spill', 'game', 'animasjon', 'rendering'],
    subjects: ['Spillutvikling', '3D-modellering', 'Grafisk design'],
  },
  {
    tokens: ['llm', 'gpt', 'kunstig intelligens', 'nlp', 'generativ', 'chatbot', 'ai', 'openai'],
    subjects: ['Kunstig intelligens', 'Dataanalyse', 'Maskinlæring'],
  },
];

// ─── Synonym groups for partial credit ───────────────────────────────────────

const synonymGroups = [
  ['react', 'vue', 'angular', 'svelte'],
  ['javascript', 'typescript', 'js', 'ts'],
  ['python', 'pandas', 'numpy', 'jupyter'],
  ['sql', 'postgresql', 'mysql', 'sqlite', 'database', 'databaser'],
  ['figma', 'sketch', 'adobe xd', 'ux', 'ui', 'design'],
  ['node', 'express', 'backend', 'server', 'api'],
  ['aws', 'azure', 'gcp', 'cloud', 'sky'],
  ['docker', 'kubernetes', 'devops'],
  ['git', 'github', 'gitlab', 'versjonskontroll'],
  ['html', 'css', 'web', 'frontend'],
  ['java', 'spring', 'kotlin'],
  ['ml', 'maskinlæring', 'tensorflow', 'pytorch', 'ai', 'llm'],
  ['scrum', 'agile', 'kanban', 'jira', 'prosjektledelse'],
  ['android', 'ios', 'swift', 'react native', 'flutter'],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(text) {
  return (text || '').toLowerCase().replace(/[^\w\s-]/g, ' ');
}

function parseList(input) {
  if (!input || typeof input !== 'string') return [];
  return input.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
}

function proficiencyWeight(level) {
  if (level == null) return 0.3;
  if (level <= 1) return 0.45;
  if (level <= 2) return 0.65;
  if (level <= 3) return 0.80;
  if (level <= 4) return 0.92;
  return 1.2;
}

function getSynonymGroup(normalizedTerm) {
  return synonymGroups.find((group) =>
    group.some((s) => normalizedTerm.includes(s) || s.includes(normalizedTerm))
  ) || null;
}

function inferRelevantSubjects(caseData) {
  const blob = normalize(
    [caseData.taskText, caseData.technicalTerms, caseData.requiredQuals, caseData.preferredQuals].join(' ')
  );
  const subjectSet = new Set();
  subjectMap.forEach((entry) => {
    if (entry.tokens.some((t) => blob.includes(t))) {
      entry.subjects.forEach((s) => subjectSet.add(s));
    }
  });
  if (subjectSet.size === 0) {
    subjectSet.add('Prosjektarbeid');
    subjectSet.add('Profesjonsfaglig kommunikasjon');
  }
  return [...subjectSet];
}

// ─── Professional scoring with proficiency + synonyms + partial credit ────────

function scoreRequirementAgainstSkills(requirement, studentSkills, subjectPool) {
  const normReq = normalize(requirement);

  for (const skill of studentSkills) {
    const normSkill = normalize(skill.name);
    if (normSkill.includes(normReq) || normReq.includes(normSkill)) {
      return proficiencyWeight(skill.level);
    }
  }

  for (const subject of subjectPool) {
    const normSubject = normalize(subject);
    if (normSubject.includes(normReq) || normReq.includes(normSubject)) {
      return 0.75;
    }
  }

  const group = getSynonymGroup(normReq);
  if (group) {
    for (const skill of studentSkills) {
      const normSkill = normalize(skill.name);
      if (group.some((s) => normSkill.includes(s) || s.includes(normSkill))) {
        return Math.min(proficiencyWeight(skill.level) * 0.55, 0.5);
      }
    }
    for (const subject of subjectPool) {
      const normSubject = normalize(subject);
      if (group.some((s) => normSubject.includes(s) || s.includes(normSubject))) {
        return 0.25;
      }
    }
  }

  return 0;
}

function scoreProfessional(requirements, studentSkills, subjectPool) {
  if (requirements.length === 0) return { score: 100 };
  let totalCredit = 0;
  for (const req of requirements) {
    totalCredit += scoreRequirementAgainstSkills(req, studentSkills, subjectPool);
  }
  return { score: Math.round((totalCredit / requirements.length) * 100) };
}

// ─── Stricter personal scoring ────────────────────────────────────────────────

function matchPersonalTrait(trait, candidate) {
  const t = normalize(trait);
  const c = normalize(candidate);
  if (t.includes(c) && c.length >= t.length * 0.55) return true;
  if (c.includes(t) && t.length >= c.length * 0.55) return true;
  return false;
}

function scorePersonal(requirements, candidateValues) {
  if (requirements.length === 0) return 100;
  let matches = 0;
  requirements.forEach((req) => {
    if (candidateValues.some((c) => matchPersonalTrait(req, c))) matches++;
  });
  const rawScore = Math.round((matches / requirements.length) * 100);
  return requirements.length >= 3 && matches < 2
    ? Math.round(rawScore * 0.6)
    : rawScore;
}

// ─── Subject scoring (unchanged logic, uses expanded map) ────────────────────

function scoreSubjects(inferredSubjects, subjectPool) {
  if (inferredSubjects.length === 0) return 100;
  const normPool = subjectPool.map(normalize);
  const matches = inferredSubjects.filter((s) => {
    const ns = normalize(s);
    return normPool.some((p) => p.includes(ns) || ns.includes(p));
  });
  return Math.round((matches.length / inferredSubjects.length) * 100);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute a 0–100 match score between a case and a student.
 *
 * @param {{
 *   taskText: string,
 *   technicalTerms: string,
 *   requiredQuals: string,
 *   preferredQuals: string,
 *   personalQuals: string
 * }} caseInfo
 *
 * @param {{
 *   skills: Array<{name: string, level: number}>,
 *   currentSubjects: string[],
 *   completedSubjects: string[],
 *   personalChars: string[],
 *   professionalInterests: string[]
 * }} studentInfo
 *
 * @returns {number} totalScore 0–100
 */
export function computeMatchScore(caseInfo, studentInfo) {
  const required = parseList(caseInfo.requiredQuals);
  const preferred = parseList(caseInfo.preferredQuals);
  const personalReqs = parseList(caseInfo.personalQuals);

  const studentSkills = Array.isArray(studentInfo.skills) ? studentInfo.skills : [];
  const fieldSubjects = studentInfo.field ? [studentInfo.field] : [];
  const subjectPool = [
    ...studentInfo.currentSubjects,
    ...studentInfo.completedSubjects,
    ...fieldSubjects,
  ];
  const personalPool = [
    ...studentInfo.personalChars,
    ...studentInfo.professionalInterests,
  ];

  // Improvement 1+2+3: required 70 %, preferred 30 %, proficiency-weighted, synonym partial credit
  const requiredResult = scoreProfessional(required, studentSkills, subjectPool);
  const preferredResult = preferred.length > 0
    ? scoreProfessional(preferred, studentSkills, subjectPool)
    : { score: 100 };

  const professionalScore = required.length > 0
    ? Math.round(requiredResult.score * 0.7 + preferredResult.score * 0.3)
    : preferredResult.score;

  // Improvement 5: stricter personal matching
  const personalScore = scorePersonal(personalReqs, personalPool);

  // Improvement 4: expanded subject map
  const inferredSubjects = inferRelevantSubjects(caseInfo);
  const subjectScore = scoreSubjects(inferredSubjects, subjectPool);

  // Preference alignment: role track, work mode, location
  let preferenceScore = 100;
  let preferenceFactors = 0;
  let preferenceTotal = 0;

  const preferredRoleTracks = studentInfo.preferredRoleTracks || [];
  if (preferredRoleTracks.length > 0 && caseInfo.roleTrack) {
    preferenceFactors++;
    preferenceTotal += preferredRoleTracks.includes(caseInfo.roleTrack) ? 100 : 0;
  }

  const preferredWorkModes = studentInfo.preferredWorkModes || [];
  if (preferredWorkModes.length > 0 && caseInfo.workMode) {
    preferenceFactors++;
    preferenceTotal += preferredWorkModes.includes(caseInfo.workMode) ? 100 : 0;
  }

  const preferredLocations = studentInfo.preferredLocations || [];
  if (preferredLocations.length > 0 && caseInfo.location) {
    const normLoc = (v) => (v || '').toLowerCase().split(/[,/;|]/)[0].replace(/\b(norge|norway)\b/g, '').trim();
    const caseLocNorm = normLoc(caseInfo.location);
    const isRemote = caseLocNorm === 'remote';
    preferenceFactors++;
    preferenceTotal += (isRemote || preferredLocations.some((l) => normLoc(l) === caseLocNorm)) ? 100 : 0;
  }

  if (preferenceFactors > 0) {
    preferenceScore = Math.round(preferenceTotal / preferenceFactors);
  }

  const hasPreferences = preferenceFactors > 0;
  return Math.round(
    professionalScore * (hasPreferences ? 0.45 : 0.50) +
    personalScore * (hasPreferences ? 0.20 : 0.25) +
    subjectScore * (hasPreferences ? 0.20 : 0.25) +
    (hasPreferences ? preferenceScore * 0.15 : 0)
  );
}
