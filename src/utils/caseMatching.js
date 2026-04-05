const subjectMap = [
  { tokens: ['react', 'frontend', 'javascript', 'typescript', 'css', 'web'], subjects: ['Webutvikling', 'Frontendutvikling', 'Interaksjonsdesign'] },
  { tokens: ['ux', 'ui', 'design', 'figma', 'prototype'], subjects: ['Interaksjonsdesign', 'Tjenestedesign', 'Grafisk design'] },
  { tokens: ['data', 'analyse', 'sql', 'python', 'dashboard'], subjects: ['Databaser', 'Dataanalyse', 'Statistikk'] },
  { tokens: ['api', 'backend', 'node', 'server'], subjects: ['Systemutvikling', 'Backendutvikling', 'Databaser'] },
  { tokens: ['sky', 'cloud', 'aws', 'azure', 'terraform', 'devops'], subjects: ['Skyteknologi', 'Drift og DevOps', 'Systemadministrasjon'] },
  { tokens: ['sikkerhet', 'owasp', 'risiko', 'nettverk'], subjects: ['Informasjonssikkerhet', 'Nettverk', 'Risikovurdering'] },
];

function normalize(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ');
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
  if (!input || typeof input !== 'string') {
    return [];
  }
  return input
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
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
      caseData.professionalQualifications,
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

function scoreList(requirements, candidateValues) {
  if (requirements.length === 0) {
    return { score: 100, matches: [], missing: [] };
  }

  const normalizedCandidateValues = candidateValues.map((value) => normalize(value));
  const matches = [];
  const missing = [];

  requirements.forEach((requirement) => {
    const normalizedRequirement = normalize(requirement);
    const matched = normalizedCandidateValues.some(
      (candidateValue) =>
        candidateValue.includes(normalizedRequirement) || normalizedRequirement.includes(candidateValue)
    );

    if (matched) {
      matches.push(requirement);
    } else {
      missing.push(requirement);
    }
  });

  return {
    score: Math.round((matches.length / requirements.length) * 100),
    matches,
    missing,
  };
}

export function analyzeCaseRequirements(caseData) {
  const professionalRequirements = parseList(caseData.professionalQualifications);
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
  const professional = parseList(caseData.professionalQualifications);
  const candidatePool = [
    ...getStudentSkills(studentProfile).map((skill) => skill.name),
    ...studentProfile.currentSubjects,
    ...studentProfile.completedSubjects,
  ];

  const hits = professional.filter((qualification) =>
    candidatePool.some((candidateValue) => {
      const left = normalize(qualification);
      const right = normalize(candidateValue);
      return right.includes(left) || left.includes(right);
    })
  );

  return hits[0] || professional[0] || 'Lærevilje og relevant faglig interesse';
}

export function scoreCaseAgainstStudent(caseData, studentProfile) {
  const professionalRequirements = parseList(caseData.professionalQualifications);
  const personalRequirements = parseList(caseData.personalQualifications);
  const studentSkills = getStudentSkills(studentProfile);
  const skillNames = studentSkills.map((skill) => skill.name);

  const professionalScore = scoreList(professionalRequirements, [
    ...skillNames,
    ...studentProfile.currentSubjects,
    ...studentProfile.completedSubjects,
  ]);
  const personalScore = scoreList(personalRequirements, [
    ...studentProfile.personalCharacteristics,
    ...studentProfile.professionalInterests,
  ]);

  const subjectMatches = scoreList(inferRelevantSubjects(caseData), [
    ...studentProfile.currentSubjects,
    ...studentProfile.completedSubjects,
  ]);

  const totalScore = Math.round(
    professionalScore.score * 0.5 + personalScore.score * 0.25 + subjectMatches.score * 0.25
  );

  const rankedSkillMatches = studentSkills
    .filter((skill) =>
      professionalRequirements.some((requirement) => {
        const left = normalize(requirement);
        const right = normalize(skill.name);
        return left.includes(right) || right.includes(left);
      })
    )
    .sort((left, right) => right.level - left.level);

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

  if (!caseData.deliveries.trim()) {
    suggestions.push('Presiser leveranser');
  }
  if (parseList(caseData.expectations).length < 2) {
    suggestions.push('Gjør forventningene mer målbare');
  }
  if (matchingSummary.professionalScore.missing.length > 0) {
    suggestions.push('Juster fagkrav til realistisk studentnivå');
  }
  if (matchingSummary.personalScore.missing.length > 1) {
    suggestions.push('Forenkle personlige krav');
  }
  if (!caseData.assignmentContext.trim()) {
    suggestions.push('Legg til mer kontekst om oppdraget');
  }

  return suggestions.slice(0, 4);
}
