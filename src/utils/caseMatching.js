// ─── Subject inference map (expanded from 6 to 12 categories) ───────────────

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
// If a required skill and a student skill share a group, the student gets
// partial credit even without a direct substring match.

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
  return (text || '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ');
}

/**
 * Maps a skill proficiency level (1–5) to a scoring weight (0.45–1.0).
 * A student with level 1 in a required skill contributes less than one at level 5.
 */
function proficiencyWeight(level) {
  if (level == null) return 0.3;  // no proficiency set → low credit
  if (level <= 1) return 0.45;
  if (level <= 2) return 0.65;
  if (level <= 3) return 0.80;
  if (level <= 4) return 0.92;
  return 1.2;                     // level 5 → bonus weight
}

/**
 * Returns the synonym group that contains the given normalised term, or null.
 */
function getSynonymGroup(normalizedTerm) {
  return synonymGroups.find((group) =>
    group.some((s) => normalizedTerm.includes(s) || s.includes(normalizedTerm))
  ) || null;
}

function getStudentSkills(studentProfile) {
  if (Array.isArray(studentProfile.skills) && studentProfile.skills.length > 0) {
    return studentProfile.skills;
  }
  if (Array.isArray(studentProfile.professionalQualifications)) {
    return studentProfile.professionalQualifications.map((name) => ({ name, level: 3 }));
  }
  return [];
}

export function parseList(input) {
  if (!input || typeof input !== 'string') return [];
  return input.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function getTokenBlob(caseData) {
  return normalize(
    [
      caseData.taskFocus,
      caseData.assignmentContext,
      caseData.taskDescription,
      caseData.deliveries,
      caseData.expectations,
      caseData.technicalTerms,
      caseData.requiredQualifications,
      caseData.preferredQualifications,
      caseData.professionalQualifications, // backward compat
      caseData.personalQualifications,
    ].join(' ')
  );
}

export function inferRelevantSubjects(caseData) {
  const blob = getTokenBlob(caseData);
  const subjectSet = new Set();

  subjectMap.forEach((entry) => {
    if (entry.tokens.some((token) => blob.includes(token))) {
      entry.subjects.forEach((subject) => subjectSet.add(subject));
    }
  });

  if (subjectSet.size === 0) {
    subjectSet.add('Prosjektarbeid');
    subjectSet.add('Profesjonsfaglig kommunikasjon');
  }

  return [...subjectSet];
}

export function classifyCase(caseData) {
  const durationDays =
    caseData.startDate && caseData.endDate
      ? Math.max(1, Math.round((new Date(caseData.endDate) - new Date(caseData.startDate)) / 86400000))
      : 0;
  const hours = Number(caseData.maxHours || 0);
  const blob = getTokenBlob(caseData);

  let type = 'Bachelor';
  let reason = 'Oppdraget ser ut som et ordinært faglig praksis- eller bachelorrelevant oppdrag.';

  if (hours > 280 || durationDays > 150 || /master|forskning|analysemodell|arkitektur|strategi/.test(blob)) {
    type = 'Master';
    reason = 'Varighet, kompleksitet eller krav peker mot masterstudenter.';
  } else if (hours > 0 && hours <= 160 && durationDays > 0 && durationDays <= 90) {
    type = 'Bedriftspraksis';
    reason = 'Kortere omfang og tydelig leveranse passer en avgrenset bedriftspraksis.';
  }

  return {
    type,
    reason,
    durationDays,
    relevantSubjects: inferRelevantSubjects(caseData),
  };
}

// ─── Improvement 1+2+3: professional scoring with proficiency + synonyms ─────

/**
 * Scores a single requirement against a student's skills and subject pool.
 * Returns a credit value between 0.0 and 1.0:
 *   1.0  — direct skill match at proficiency 5
 *   0.45 — direct skill match at proficiency 1
 *   0.75 — matched via subject (no level info)
 *   0.35 — matched via synonym group in skills (partial credit)
 *   0.25 — matched via synonym group in subjects only
 *   0.0  — no match of any kind
 */
function scoreRequirementAgainstSkills(requirement, studentSkills, subjectPool) {
  const normReq = normalize(requirement);

  // Direct match in student skills → weight by proficiency level
  for (const skill of studentSkills) {
    const normSkill = normalize(skill.name);
    if (normSkill.includes(normReq) || normReq.includes(normSkill)) {
      return proficiencyWeight(skill.level);
    }
  }

  // Direct match in academic subjects (no proficiency data)
  for (const subject of subjectPool) {
    const normSubject = normalize(subject);
    if (normSubject.includes(normReq) || normReq.includes(normSubject)) {
      return 0.75;
    }
  }

  // Synonym / related skill → partial credit
  const group = getSynonymGroup(normReq);
  if (group) {
    for (const skill of studentSkills) {
      const normSkill = normalize(skill.name);
      if (group.some((s) => normSkill.includes(s) || s.includes(normSkill))) {
        // Cap synonym credit at 0.5 so it never equals a direct match
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

/**
 * Scores a list of professional requirements, returning a 0–100 score plus
 * categorised lists for display (full match / partial / missing).
 */
function scoreProfessional(requirements, studentSkills, subjectPool) {
  if (requirements.length === 0) {
    return { score: 100, matches: [], partial: [], missing: [] };
  }

  const matches = [];
  const partial = [];
  const missing = [];
  let totalCredit = 0;

  for (const req of requirements) {
    const credit = scoreRequirementAgainstSkills(req, studentSkills, subjectPool);
    if (credit >= 0.75) matches.push(req);
    else if (credit > 0) partial.push(req);
    else missing.push(req);
    totalCredit += credit;
  }

  return {
    score: Math.round((totalCredit / requirements.length) * 100),
    matches,
    partial,
    missing,
  };
}

// ─── Improvement 5: stricter personal scoring ─────────────────────────────────

/**
 * Stricter personal trait matching.
 * Requires the shorter token to cover at least 55 % of the longer one,
 * preventing trivially short words from matching everything.
 */
function matchPersonalTrait(trait, candidate) {
  const t = normalize(trait);
  const c = normalize(candidate);
  if (t.includes(c) && c.length >= t.length * 0.55) return true;
  if (c.includes(t) && t.length >= c.length * 0.55) return true;
  return false;
}

/**
 * Scores personal qualifications with a minimum-threshold penalty.
 * If 3+ traits are required but fewer than 2 match, the raw score is
 * reduced by 40 % to prevent generic traits from inflating scores.
 */
function scorePersonal(requirements, candidateValues) {
  if (requirements.length === 0) {
    return { score: 100, matches: [], missing: [] };
  }

  const matches = [];
  const missing = [];

  requirements.forEach((req) => {
    const matched = candidateValues.some((c) => matchPersonalTrait(req, c));
    if (matched) matches.push(req);
    else missing.push(req);
  });

  const rawScore = Math.round((matches.length / requirements.length) * 100);
  // Minimum-threshold penalty: having too few matches is penalised extra
  const score =
    requirements.length >= 3 && matches.length < 2
      ? Math.round(rawScore * 0.6)
      : rawScore;

  return { score, matches, missing };
}

// ─── Backward-compat scoreList used for subject matching ─────────────────────

function scoreList(requirements, candidateValues) {
  if (requirements.length === 0) {
    return { score: 100, matches: [], missing: [] };
  }

  const normalizedCandidates = candidateValues.map((v) => normalize(v));
  const matches = [];
  const missing = [];

  requirements.forEach((requirement) => {
    const normalizedReq = normalize(requirement);
    const matched = normalizedCandidates.some(
      (c) => c.includes(normalizedReq) || normalizedReq.includes(c)
    );
    if (matched) matches.push(requirement);
    else missing.push(requirement);
  });

  return {
    score: Math.round((matches.length / requirements.length) * 100),
    matches,
    missing,
  };
}

// ─── Shared helper ────────────────────────────────────────────────────────────

function getProfessionalQuals(caseData) {
  const required = parseList(caseData.requiredQualifications || caseData.professionalQualifications);
  const preferred = parseList(caseData.preferredQualifications);
  return { required, preferred, all: [...required, ...preferred] };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function analyzeCaseRequirements(caseData) {
  const { required: professionalRequirements } = getProfessionalQuals(caseData);
  const personalRequirements = parseList(caseData.personalQualifications);
  const expectationItems = parseList(caseData.expectations);

  const rankedQualifications = professionalRequirements.map((item, index) => ({
    name: item,
    weight: Math.max(100 - index * 12, 40),
  }));

  return {
    rankedQualifications,
    mostImportantQualification:
      rankedQualifications[0]?.name || personalRequirements[0] || 'Lærevilje og tydelige leveranser',
    expectationCoverage: Math.min(100, expectationItems.length * 30),
    recommendedSubjects: inferRelevantSubjects(caseData),
  };
}

export function findTopQualification(caseData, studentProfile) {
  const { all } = getProfessionalQuals(caseData);
  const studentSkills = getStudentSkills(studentProfile);
  const subjectPool = [
    ...studentProfile.currentSubjects,
    ...studentProfile.completedSubjects,
  ];

  // No requirements on the case — show the student's strongest skill instead
  if (all.length === 0) {
    const top = [...studentSkills].sort((a, b) => (b.level || 0) - (a.level || 0))[0];
    return top?.name || '';
  }

  // Score every requirement against the student and return the closest one
  const scored = all.map((qualification) => ({
    qualification,
    score: scoreRequirementAgainstSkills(qualification, studentSkills, subjectPool),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0].qualification;
}

/**
 * Main scoring function.
 *
 * Improvements applied:
 *  1. Required quals weighted 70 %, preferred 30 % within the professional bucket.
 *  2. Partial credit for synonym/related skills (no all-or-nothing).
 *  3. Skill proficiency level (1–5) scales the credit for each match.
 *  4. Expanded subjectMap covers 12 categories instead of 6.
 *  5. Personal score uses stricter matching + minimum-threshold penalty.
 */
export function scoreCaseAgainstStudent(caseData, studentProfile) {
  const { required, preferred } = getProfessionalQuals(caseData);
  const personalRequirements = parseList(caseData.personalQualifications);
  const studentSkills = getStudentSkills(studentProfile);
  const subjectPool = [
    ...studentProfile.currentSubjects,
    ...studentProfile.completedSubjects,
  ];

  // Improvement 1+2+3: required/preferred weighted separately, with proficiency + synonyms
  const requiredResult = scoreProfessional(required, studentSkills, subjectPool);
  const preferredResult = preferred.length > 0
    ? scoreProfessional(preferred, studentSkills, subjectPool)
    : { score: 100, matches: [], partial: [], missing: [] };

  const professionalScore = required.length > 0
    ? {
        score: Math.round(requiredResult.score * 0.7 + preferredResult.score * 0.3),
        matches: requiredResult.matches,
        partial: requiredResult.partial,
        missing: requiredResult.missing,
        requiredScore: requiredResult,
        preferredScore: preferredResult,
      }
    : { ...preferredResult };

  // Improvement 5: stricter personal scoring
  const personalScore = scorePersonal(personalRequirements, [
    ...studentProfile.personalCharacteristics,
    ...studentProfile.professionalInterests,
  ]);

  // Improvement 4: expanded subject map used here
  const subjectMatches = scoreList(inferRelevantSubjects(caseData), subjectPool);

  const totalScore = Math.round(
    professionalScore.score * 0.5 +
    personalScore.score * 0.25 +
    subjectMatches.score * 0.25
  );

  const rankedSkillMatches = studentSkills
    .filter((skill) =>
      [...required, ...preferred].some((req) => {
        const left = normalize(req);
        const right = normalize(skill.name);
        return left.includes(right) || right.includes(left);
      })
    )
    .sort((a, b) => b.level - a.level);

  return {
    totalScore,
    professionalScore,
    personalScore,
    subjectMatches,
    topQualification: findTopQualification(caseData, studentProfile),
    rankedSkillMatches,
  };
}

export function buildRevisionSuggestions(caseData, matchingSummary) {
  const suggestions = [];

  if (!caseData.deliveries?.trim()) {
    suggestions.push('Presiser leveranser');
  }
  if (parseList(caseData.expectations).length < 2) {
    suggestions.push('Gjør forventningene mer målbare');
  }
  if (matchingSummary.professionalScore.missing?.length > 0) {
    suggestions.push('Juster fagkrav til realistisk studentnivå');
  }
  if (matchingSummary.personalScore.missing?.length > 1) {
    suggestions.push('Forenkle personlige krav');
  }
  if (!caseData.assignmentContext?.trim()) {
    suggestions.push('Legg til mer kontekst om oppdraget');
  }

  return suggestions.slice(0, 4);
}
