import { useEffect, useMemo, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import LLM from '@themaximalist/llm.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  STORAGE_KEYS,
  createEmptyCaseDraft,
  defaultCompanyProfile,
  defaultDrafts,
  defaultPublishedCases,
} from '../data/portalData';
import {
  analyzeCaseRequirements,
  buildRevisionSuggestions,
  classifyCase,
  parseList,
} from '../utils/caseMatching';
import { exportCaseToPdf } from '../utils/casePdfExport';
import { loadStoredJson, saveStoredJson } from '../utils/storage';
import { cases as casesAPI, companyProfile as companyProfileAPI } from '../utils/api';

const ROLE_OPTIONS = {
  frontend: 'Frontendutvikler',
  ux: 'UX/UI-designer',
  data: 'Dataanalytiker',
  fullstack: 'Fullstack-utvikler',
  backend: 'Backend-utvikler',
  unsure: 'Usikker / Annet',
};

const PROFILE_OPTIONS = {
  balanced: {
    label: 'Balansert profil',
    personal: 'Samarbeid, initiativ, lærevilje',
  },
  structured: {
    label: 'Strukturert og nøye',
    personal: 'Struktur, nøyaktighet, ansvarlighet',
  },
  creative: {
    label: 'Kreativ og utforskende',
    personal: 'Nysgjerrighet, kommunikasjon, iderikdom',
  },
};

const SCOPE_OPTIONS = {
  short: {
    label: 'Kort prosjekt',
    hours: '120',
    startWithin: 'Senest innen 2 uker',
    deliveries: 'Et avgrenset leveranseutkast, demo og kort oppsummering.',
  },
  medium: {
    label: 'Vanlig praksisforløp',
    hours: '200',
    startWithin: 'Senest innen 3 uker',
    deliveries: 'Konkrete leveranser, dokumentasjon og demo til teamet.',
  },
  extended: {
    label: 'Større leveranse',
    hours: '280',
    startWithin: 'Senest innen 4 uker',
    deliveries: 'Flere del-leveranser, demoer underveis og avsluttende oppsummering.',
  },
};

const COLLABORATION_OPTIONS = {
  guided: 'Trenger tett oppfølging og tydelige rammer.',
  team: 'Kan samarbeide i team, ta imot tilbakemeldinger og levere jevnt underveis.',
  independent: 'Kan jobbe selvstendig, dokumentere valg og drive egne deloppgaver fremover.',
};

const WORK_MODE_OPTIONS = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
};

const OFFERING_OPTIONS = {
  workplace: 'Mulighet for jobb etter oppdraget',
  certification: 'Sertifisering gjennom jobben',
  reference: 'Attest / referanse',
};

function prepareCaseForm(form, companyProfile) {
  const getStringValue = (val) => {
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.join(', ');
    return String(val || '');
  };

  const selectedRoleTracks =
    Array.isArray(form.roleTracks) && form.roleTracks.length > 0
      ? form.roleTracks
      : form.roleTrack
        ? [form.roleTrack]
        : ['frontend'];
  const roleLabel = selectedRoleTracks
    .map((role) => ROLE_OPTIONS[role])
    .filter(Boolean)
    .join(' / ') || form.taskFocus || 'Praksisstudent';
  const scope = SCOPE_OPTIONS[form.scopePreset] || SCOPE_OPTIONS.medium;
  const collaborationExpectation =
    COLLABORATION_OPTIONS[form.collaborationStyle] || COLLABORATION_OPTIONS.team;
  const profile = PROFILE_OPTIONS[form.candidateProfile] || PROFILE_OPTIONS.balanced;
  const location = getStringValue(form.location).trim() || '';
  const workMode = WORK_MODE_OPTIONS[form.workMode] || WORK_MODE_OPTIONS.hybrid;
  const taskDescription = getStringValue(form.taskDescription).trim() || '';
  const website = companyProfile?.website?.trim() || getStringValue(form.website).trim() || '';

  return {
    ...form,
    roleTracks: selectedRoleTracks,
    roleTrack: selectedRoleTracks[0],
    taskFocus: getStringValue(form.taskFocus).trim() || roleLabel,
    assignmentContext: getStringValue(form.assignmentContext).trim() || taskDescription,
    taskDescription,
    technicalTerms: getStringValue(form.technicalTerms).trim() || getStringValue(form.requiredQualifications).trim() || roleLabel,
    deliveries: getStringValue(form.deliveries).trim() || scope.deliveries,
    expectations:
      getStringValue(form.expectations).trim() || `${collaborationExpectation} Arbeidsform: ${workMode}.`,
    personalQualifications: getStringValue(form.personalQualifications).trim() || profile.personal,
    companyQualifications: getStringValue(form.companyQualifications).trim() || '',
    professionalQualifications: getStringValue(form.professionalQualifications).trim() || '',
    startWithin: getStringValue(form.startWithin).trim() || scope.startWithin,
    maxHours: String(form.maxHours || scope.hours),
    location: location || workMode,
  };
}

function formatDate(dateString) {
  if (!dateString) {
    return 'Ikke satt';
  }

  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString));
}

function buildPrompt(form, classification, requirementAnalysis, companyProfile, mode = 'initial') {
  const websiteGuidance = form.website
    ? `Bedriften har oppgitt nettsiden ${form.website}. Bruk den som viktig selskapskontekst.`
    : 'Bedriften har ikke oppgitt nettside. Hvis selskapsnavn og beskrivelse ikke er nok til å skrive et presis prosjekt, skal du be bedriften legge inn nettsidelenken i revisjonsinstruksjonsfeltet.';
  const revisionSection =
    mode === 'revision'
      ? `
Eksisterende utkast:
${form.generatedAd}

Du skal revidere utkastet over basert pa denne endringsbestillingen:
${form.revisionInstruction || 'Forbedre klarhet og presisjon uten a endre fakta.'}
`
      : '';

  return `
Du er en norsk AI-assistent som hjelper en bedrift med å skrive et praksis- eller studentprosjekt.

Hvis bedriften velger Usikker/annet på Hovedfokus, bruk informasjonen i de andre feltene for å finne det beste fokuset og klassifisere saken.

Bedrift:
- Navn: ${companyProfile?.name || form.logo || 'Ikke oppgitt'}
- Logo: ${form.logo || 'Ikke oppgitt'}
- Nettside: ${form.website || 'Ikke oppgitt'}
- Hva bedriften gjør: ${form.companyQualifications}

Oppdrag:
- Tittel/hovedfokus: ${form.title || form.taskFocus}
- Spesifikk oppdragskontekst: ${form.assignmentContext}
- Tekniske begreper: ${form.technicalTerms}
- Oppgavebeskrivelse: ${form.taskDescription}
- Leveranser: ${form.deliveries}
- Forventninger: ${form.expectations}
- Krav (MÅ ha): ${form.requiredQualifications}
- Ønskelig (FINT å ha): ${form.preferredQualifications || 'Ikke spesifisert'}
- Personlige kvalifikasjoner: ${form.personalQualifications}
- Lokasjon: ${form.location}
- Startdato: ${formatDate(form.startDate)}
- Sluttdato: ${formatDate(form.endDate)}
- Start senest innen: ${form.startWithin}
- Omfang: ${form.maxHours} timer
- Sakstype vurdert av systemet: ${classification.type}
- Relevante fag: ${classification.relevantSubjects.join(', ')}
- Viktigste kvalifikasjon i kravbildet: ${requirementAnalysis.mostImportantQualification}
- Kvalitetsdekning for forventninger: ${requirementAnalysis.expectationCoverage}%
- Revisjonsinstruksjon: ${form.revisionInstruction || 'Ingen'}
- Ekstra veiledning: ${websiteGuidance}

${revisionSection}

Svar kun med gyldig JSON i dette formatet:
{
  "title": "string",
  "summary": "string",
  "companySummary": "string",
  "assignmentContext": "string",
  "tasks": ["string"],
  "deliveries": ["string"],
  "expectations": ["string"],
  "qualificationsProfessional": ["string"],
  "qualificationsPersonal": ["string"],
  "targetAudience": "string",
  "recommendedSubjects": ["string"],
  "practicalInfo": {
    "location": "string",
    "startDate": "string",
    "endDate": "string",
    "startWithin": "string",
    "maxHours": "string",
  },
  "closingText": "string",
  "markdown": "string"
}

Krav:
- "summary" skal være 2-3 setninger som oppsummerer prosjektet for en kortlistevisning. Skal vekke nysgjerrighet og gi studenten nok til å vurdere relevans.
- "markdown" skal være et fullstendig prosjekt på norsk med disse delene:
  1. Tittel
  2. Kort om bedriften
  3. Oppdragskontekst
  4. Arbeidsoppgaver
  5. Leveranser og forventninger
  6. Faglige og personlige kvalifikasjoner
  7. Hvem oppdraget passer for (${classification.type}) og relevante fagområder
  8. Praktisk informasjon
  9. Kort avslutning
- Hvis informasjon mangler, skriv konservativt og ikke finn opp fakta.
- Hvis nettside mangler og bedriftsinformasjonen er for tynn, skriv tydelig at bedriften bør legge inn nettsidelenken i revisjonsinstruksjonsfeltet før neste AI-runde.
- Alle lister skal inneholde korte tekstverdier.
`.trim();
}

function buildFallbackAd(form, classification, requirementAnalysis) {
  const requiredQualifications = parseList(form.requiredQualifications);
  const preferredQualifications = parseList(form.preferredQualifications);
  const personalQualifications = parseList(form.personalQualifications);
  const needsWebsiteFollowUp =
    !form.website && (!form.companyQualifications.trim() || form.companyQualifications.trim().length < 80);

  return `
## ${form.title || form.taskFocus || 'Studentoppdrag'}

### Kort om bedriften
${form.companyQualifications || 'Bedriften har ikke lagt inn fullstendig selskapsbeskrivelse ennå.'}
${form.website ? `Nettside: ${form.website}` : ''}

### Oppdragskontekst
${form.assignmentContext}

### Arbeidsoppgaver
${form.taskDescription}

### Leveranser og forventninger
**Leveranser**
${form.deliveries}

**Forventninger**
${form.expectations}

### Kvalifikasjoner
**Krav – MÅ ha**
${requiredQualifications.length > 0 ? requiredQualifications.map((item) => `- ${item}`).join('\n') : '- Ikke spesifisert'}

**Ønskelig – FINT å ha**
${preferredQualifications.length > 0 ? preferredQualifications.map((item) => `- ${item}`).join('\n') : '- Ikke spesifisert'}

**Personlige kvalifikasjoner**
${personalQualifications.length > 0 ? personalQualifications.map((item) => `- ${item}`).join('\n') : '- Ikke spesifisert'}

### Hvem oppdraget passer for
Systemet vurderer dette som **${classification.type}**.
Relevante fagområder: ${classification.relevantSubjects.join(', ')}.
Viktigste kvalifikasjon i kravbildet: **${requirementAnalysis.mostImportantQualification}**.

### Praktisk informasjon
- Lokasjon: ${form.location}
- Oppstart: ${formatDate(form.startDate)}
- Slutt: ${formatDate(form.endDate)}
- Start senest innen: ${form.startWithin}
- Omfang: ${form.maxHours} timer

### Avslutning
Vi ser etter en student som kan bidra med konkrete leveranser og samtidig fa relevant erfaring i en ekte arbeidssituasjon.
${needsWebsiteFollowUp ? '\n\n**Merk:** Legg gjerne inn lenke til bedriftens nettside i revisjonsinstruksjonsfeltet før neste AI-runde hvis dere vil gi AI-en bedre selskapskontekst.' : ''}
`.trim();
}

function buildStructuredFallback(form, classification, requirementAnalysis, markdown) {
  return {
    title: form.title || form.taskFocus || 'Studentoppdrag',
    summary: form.taskDescription ? form.taskDescription.slice(0, 200).trimEnd() + (form.taskDescription.length > 200 ? '…' : '') : '',
    companySummary: form.companyQualifications || '',
    assignmentContext: form.assignmentContext || '',
    tasks: parseList(form.taskDescription),
    deliveries: parseList(form.deliveries),
    expectations: parseList(form.expectations),
    qualificationsProfessional: [...parseList(form.requiredQualifications), ...parseList(form.preferredQualifications)],
    qualificationsPersonal: parseList(form.personalQualifications),
    targetAudience: classification.type,
    recommendedSubjects: requirementAnalysis.recommendedSubjects || [],
    practicalInfo: {
      location: form.location || '',
      startDate: form.startDate || '',
      endDate: form.endDate || '',
      startWithin: form.startWithin || '',
      maxHours: String(form.maxHours || ''),
    },
    closingText:
      'Vi ser etter en student som kan bidra med konkrete leveranser og samtidig få relevant erfaring i en ekte arbeidssituasjon.',
    markdown,
  };
}

function extractJsonBlock(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = value.indexOf('{');
  const lastBrace = value.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return value.slice(firstBrace, lastBrace + 1);
}

function normalizeGeneratedAdPayload(rawResponse, form, classification, requirementAnalysis) {
  const fallbackMarkdown = buildFallbackAd(form, classification, requirementAnalysis);
  const fallbackStructured = buildStructuredFallback(
    form,
    classification,
    requirementAnalysis,
    fallbackMarkdown
  );

  const responseText =
    typeof rawResponse === 'string'
      ? rawResponse
      : typeof rawResponse?.content === 'string'
        ? rawResponse.content
        : '';

  const jsonBlock = extractJsonBlock(responseText);
  if (!jsonBlock) {
    return {
      markdown: fallbackMarkdown,
      structured: fallbackStructured,
    };
  }

  try {
    const parsed = JSON.parse(jsonBlock);
    const markdown =
      typeof parsed.markdown === 'string' && parsed.markdown.trim()
        ? parsed.markdown.trim()
        : fallbackMarkdown;

    return {
      markdown,
      structured: {
        ...fallbackStructured,
        ...parsed,
        markdown,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : fallbackStructured.tasks,
        deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : fallbackStructured.deliveries,
        expectations: Array.isArray(parsed.expectations) ? parsed.expectations : fallbackStructured.expectations,
        qualificationsProfessional: Array.isArray(parsed.qualificationsProfessional)
          ? parsed.qualificationsProfessional
          : fallbackStructured.qualificationsProfessional,
        qualificationsPersonal: Array.isArray(parsed.qualificationsPersonal)
          ? parsed.qualificationsPersonal
          : fallbackStructured.qualificationsPersonal,
        recommendedSubjects: Array.isArray(parsed.recommendedSubjects)
          ? parsed.recommendedSubjects
          : fallbackStructured.recommendedSubjects,
        practicalInfo:
          parsed.practicalInfo && typeof parsed.practicalInfo === 'object'
            ? { ...fallbackStructured.practicalInfo, ...parsed.practicalInfo }
            : fallbackStructured.practicalInfo,
      },
    };
  } catch {
    return {
      markdown: fallbackMarkdown,
      structured: fallbackStructured,
    };
  }
}

function validateForm(form) {
  const nextErrors = {};

  // Helper to safely get string value
  const getStringValue = (val) => {
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.join(', ');
    return String(val || '');
  };

  if (!getStringValue(form.title).trim()) nextErrors.title = 'Tittel er påkrevd.';
  if (!getStringValue(form.assignmentContext).trim()) nextErrors.assignmentContext = 'Oppdragskontekst er påkrevd.';
  if (!getStringValue(form.taskDescription).trim()) nextErrors.taskDescription = 'Oppgavebeskrivelse er påkrevd.';
  if (!getStringValue(form.deliveries).trim()) nextErrors.deliveries = 'Leveranser er påkrevd.';
  const expectationsValue = getStringValue(form.expectations).trim();
  if (!expectationsValue || expectationsValue.length < 30) {
    nextErrors.expectations = 'Legg inn tydelige forventninger. Dette brukes for å forbedre AI-utkastet.';
  }
  if (!getStringValue(form.companyQualifications).trim()) nextErrors.companyQualifications = 'Beskrivelse av hva bedriften gjør er påkrevd.';
  if (!getStringValue(form.requiredQualifications).trim()) nextErrors.requiredQualifications = 'Minst ett krav (MÅ ha) er påkrevd.';
  if (!getStringValue(form.personalQualifications).trim()) nextErrors.personalQualifications = 'Personlige kvalifikasjoner er påkrevd.';
  if (!getStringValue(form.location).trim()) nextErrors.location = 'Lokasjon er påkrevd.';
  if (!form.startDate) nextErrors.startDate = 'Startdato er påkrevd.';
  if (!form.endDate) nextErrors.endDate = 'Sluttdato er påkrevd.';
  if (!getStringValue(form.startWithin).trim()) nextErrors.startWithin = 'Start senest innen er påkrevd.';
  if (!form.maxHours) nextErrors.maxHours = 'Omfang i timer er påkrevd.';

  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    nextErrors.endDate = 'Sluttdato kan ikke være tidligere enn startdato.';
  }

  return nextErrors;
}

async function generateAdWithAi(form, classification, requirementAnalysis, companyProfile, mode = 'initial') {
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const openAiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const provider = openAiApiKey ? 'openai' : geminiApiKey ? 'google' : null;

  if (!provider) {
    const markdown = buildFallbackAd(form, classification, requirementAnalysis);
    return {
      markdown,
      structured: buildStructuredFallback(form, classification, requirementAnalysis, markdown),
    };
  }

  const llm = new LLM(
    provider === 'openai'
      ? { service: 'openai', apiKey: openAiApiKey, model: 'gpt-4.1-mini' }
      : { service: 'google', apiKey: geminiApiKey, model: 'gemini-2.5-flash' }
  );

  llm.system('Du skriver profesjonelle norske student- og praksisprosjekter basert på strukturerte data.');

  const response = await llm.chat(buildPrompt(form, classification, requirementAnalysis, companyProfile, mode), {
    max_tokens: 4096,
  });

  return normalizeGeneratedAdPayload(response, form, classification, requirementAnalysis);
}

export default function Chatbot({ userRole }) {
  const navigate = useNavigate();
  const { userRole: authRole } = useContext(AuthContext);
  const canManageCases = authRole === 'company' || authRole === 'admin';
  const isCompany = authRole === 'company';
  const isAdmin = authRole === 'admin';

  const [companyProfile, setCompanyProfile] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [publishedCases, setPublishedCases] = useState([]);
  const [form, setForm] = useState(createEmptyCaseDraft());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [fullProjectPreview, setFullProjectPreview] = useState(null);
  const hasGeneratedDraft = Boolean(form.generatedAd);

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitializing(true);
        if (isCompany) {
          const company = await companyProfileAPI.get();
          setCompanyProfile(company);
          const draftList = await casesAPI.listDrafts();
          setDrafts(draftList);
          if (draftList.length > 0) {
            setForm(createEmptyCaseDraft(draftList[0]));
          } else {
            setForm(createEmptyCaseDraft({
              website: company.website,
              logo: company.logo,
              companyQualifications: company.description,
            }));
          }
        } else {
          setCompanyProfile(defaultCompanyProfile);
          setDrafts([]);
        }

        const published = await casesAPI.listPublished();
        setPublishedCases(published);
      } catch (err) {
        console.error('Failed to load data:', err);
        setCompanyProfile(defaultCompanyProfile);
        setDrafts([]);
        setPublishedCases([]);
      } finally {
        setInitializing(false);
      }
    };

    if (canManageCases) {
      loadData();
    } else {
      setInitializing(false);
    }
  }, [canManageCases, isCompany]);

  const preparedForm = useMemo(() => prepareCaseForm(form, companyProfile), [form, companyProfile]);
  const classification = useMemo(() => classifyCase(preparedForm), [preparedForm]);
  const requirementAnalysis = useMemo(() => analyzeCaseRequirements(preparedForm), [preparedForm]);
  const revisionSuggestions = useMemo(() => {
    const suggestions = buildRevisionSuggestions(preparedForm, {
      professionalScore: {
        missing:
          parseList(preparedForm.professionalQualifications).length > 4
            ? ['For mange faglige krav']
            : [],
      },
      personalScore: {
        missing:
          parseList(preparedForm.personalQualifications).length > 3
            ? ['Mange personlige krav']
            : [],
      },
    });

    if (!preparedForm.website) {
      return ['Legg inn lenke til bedriftens nettside i revisjonsinstruksjonen for mer presis AI-kontekst', ...suggestions];
    }

    return suggestions;
  }, [preparedForm]);
  const isEditingPublishedCase = form.status === 'published';

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      lastEditedAt: new Date().toISOString(),
    }));
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const toggleRoleTrack = (role) => {
    setForm((prev) => {
      const currentRoles =
        Array.isArray(prev.roleTracks) && prev.roleTracks.length > 0
          ? prev.roleTracks
          : prev.roleTrack
            ? [prev.roleTrack]
            : [];
      const nextRoles = currentRoles.includes(role)
        ? currentRoles.filter((item) => item !== role)
        : [...currentRoles, role];
      const safeRoles = nextRoles.length > 0 ? nextRoles : [role];

      return {
        ...prev,
        roleTracks: safeRoles,
        roleTrack: safeRoles[0],
        lastEditedAt: new Date().toISOString(),
      };
    });
  };

  const toggleOffering = (offering) => {
    setForm((prev) => {
      const current = Array.isArray(prev.offerings) ? prev.offerings : [];
      const next = current.includes(offering)
        ? current.filter((item) => item !== offering)
        : [...current, offering];
      return { ...prev, offerings: next, lastEditedAt: new Date().toISOString() };
    });
  };

  const syncCurrentDraft = async (nextForm) => {
    try {
      // If ID is a temporary frontend ID (starts with 'draft-'), always create
      const idString = String(nextForm.id || '');
      if (idString.startsWith('draft-')) {
        const created = await casesAPI.createDraft(nextForm);
        nextForm.id = created.id;
      } else if (nextForm.id && drafts.some(d => d.id === nextForm.id)) {
        // Update existing draft
        await casesAPI.updateDraft(nextForm.id, nextForm);
      } else if (canManageCases) {
        // Create new draft
        const created = await casesAPI.createDraft(nextForm);
        nextForm.id = created.id;
      }

      setDrafts((prev) => {
        const draftExists = prev.some((draft) => draft.id === nextForm.id);
        if (!draftExists) {
          return [nextForm, ...prev];
        }
        return prev.map((draft) => (draft.id === nextForm.id ? nextForm : draft));
      });
    } catch (err) {
      console.error('Failed to sync draft:', err);
      setStatusMessage('Kunne ikke lagre utkast. Sjekk internettforbindelsen.');
    }
  };

  const handleCreateNewDraft = () => {
    const nextDraft = createEmptyCaseDraft({
      website: companyProfile.website,
      logo: companyProfile.logo,
      companyQualifications: companyProfile.description,
    });
    setForm(nextDraft);
    setErrors({});
    setStatusMessage('Ny prosjektutforming er startet.');
    setDrafts((prev) => [nextDraft, ...prev]);
  };

  const handleLoadDraft = (draft) => {
    setForm(createEmptyCaseDraft(draft));
    setErrors({});
    setStatusMessage(`Fortsetter utkast: ${draft.title || 'Ny sak'}.`);
  };

  const handleDeleteDraft = async (draft) => {
    const shouldDelete = window.confirm(
      `Er du sikker på at du vil slette utkastet "${draft.title || 'Ny sak'}"? Dette kan ikke angres.`
    );

    if (!shouldDelete) {
      return;
    }

    setLoading(true);
    try {
      const idString = String(draft.id || '');
      if (!idString.startsWith('draft-')) {
        await casesAPI.deleteDraft(draft.id);
      }

      setDrafts((prev) => prev.filter((item) => item.id !== draft.id));

      if (form.id === draft.id) {
        setForm(createEmptyCaseDraft({
          website: companyProfile?.website,
          logo: companyProfile?.logo,
          companyQualifications: companyProfile?.description,
        }));
      }

      setStatusMessage('Utkastet er slettet.');
    } catch (err) {
      console.error('Failed to delete draft:', err);
      if (err.message.includes('Not authorized')) {
        setStatusMessage('Du kan ikke slette dette utkastet.');
      } else {
        setStatusMessage('Kunne ikke slette utkastet. Prøv igjen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const canManagePublishedCase = (publishedCase) =>
    isAdmin || publishedCase.companyId === companyProfile?.id;

  const handleLoadPublishedCase = (publishedCase) => {
    // Verify ownership before allowing load
    if (!canManagePublishedCase(publishedCase)) {
      setStatusMessage('Du kan ikke redigere denne saken. Den tilhører en annen bedrift.');
      return;
    }
    setForm(publishedCase);
    setErrors({});
    setStatusMessage(`Redigerer publisert sak: ${publishedCase.title || 'Ny sak'}. Publiser igjen for å oppdatere prosjektet.`);
  };

  const handleDeletePublishedCase = async (publishedCase) => {
    if (!canManagePublishedCase(publishedCase)) {
      setStatusMessage('Du kan ikke slette denne saken. Den tilhører en annen bedrift.');
      return;
    }

    const shouldDelete = window.confirm(
      `Er du sikker på at du vil slette "${publishedCase.title || 'denne saken'}"? Dette kan ikke angres.`
    );

    if (!shouldDelete) {
      return;
    }

    setLoading(true);
    try {
      await casesAPI.deletePublished(publishedCase.id);
      setPublishedCases((prev) => prev.filter((item) => item.id !== publishedCase.id));

      if (form.id === publishedCase.id) {
        setForm(createEmptyCaseDraft({
          website: companyProfile?.website,
          logo: companyProfile?.logo,
          companyQualifications: companyProfile?.description,
        }));
      }

      setStatusMessage('Saken er slettet.');
    } catch (err) {
      console.error('Failed to delete published case:', err);
      if (err.message.includes('Not authorized')) {
        setStatusMessage('Du kan ikke slette denne saken. Den tilhører en annen bedrift.');
      } else {
        setStatusMessage('Kunne ikke slette saken. Proev igjen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportCasePdf = (caseItem) => {
    const base = prepareCaseForm(caseItem, companyProfile);
    exportCaseToPdf(base, companyProfile);
    setStatusMessage('PDF er generert og lastes ned i nettleseren.');
  };

  const handleOpenFullProject = (caseItem) => {
    const base = prepareCaseForm(caseItem, companyProfile);
    const fullProjectText =
      base.generatedAdData?.markdown ||
      base.generatedAd ||
      buildFallbackAd(base, classifyCase(base), analyzeCaseRequirements(base));

    setFullProjectPreview({
      title: base.title || base.taskFocus || 'Studentprosjekt',
      status: base.status === 'published' ? 'Publisert' : 'Utkast',
      fullProjectText,
    });
  };

  const handleSaveDraft = () => {
    const nextDraft = {
      ...form,
      classification,
      requirementAnalysis,
      suggestions: revisionSuggestions,
      status: 'draft',
      lastEditedAt: new Date().toISOString(),
    };

    syncCurrentDraft(nextDraft);
    setForm(nextDraft);
    setStatusMessage('Utkastet er lagret og kan fortsettes senere.');
  };

  const handleApplySuggestion = (suggestion) => {
    updateField('revisionInstruction', suggestion);
    setStatusMessage(`Revisjonsforslag valgt: ${suggestion}. Send endringen til AI når dere er klare.`);
  };

  const persistGeneratedDraft = (generatedAd, generatedAdData, nextStatusMessage) => {
    const nextDraft = {
      ...form,
      title: generatedAdData?.title || form.title,
      generatedAd,
      generatedAdData,
      classification,
      requirementAnalysis,
      suggestions: revisionSuggestions,
      status: 'draft',
      lastEditedAt: new Date().toISOString(),
    };

    syncCurrentDraft(nextDraft);
    setForm(nextDraft);
    setStatusMessage(nextStatusMessage);
  };

  const handleGenerateFirstDraft = async () => {
    const nextErrors = validateForm(preparedForm);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatusMessage(`Fyll ut obligatoriske felt for a generere utkastet: ${Object.values(nextErrors).join(' ')}`);
      return;
    }

    setLoading(true);
    setStatusMessage('Systemet genererer prosjektutkast og vurderer match mot studentprofilen.');

    try {
      const result = await generateAdWithAi(preparedForm, classification, requirementAnalysis, companyProfile, 'initial');
      persistGeneratedDraft(
        result.markdown,
        result.structured,
        'Første utkast er klart. Velg et forslag eller skriv egne endringer før dere sender utkastet tilbake til AI.'
      );
    } catch (error) {
      console.error('Failed to generate case draft', error);
      const generatedAd = buildFallbackAd(preparedForm, classification, requirementAnalysis);
      persistGeneratedDraft(
        generatedAd,
        buildStructuredFallback(preparedForm, classification, requirementAnalysis, generatedAd),
        'AI-oppsettet var ikke tilgjengelig. Et lokalt førsteutkast ble generert i stedet.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReviseDraft = async () => {
    if (!form.generatedAd) {
      setStatusMessage('Generer første utkast før dere sender endringer til AI.');
      return;
    }

    if (!form.revisionInstruction.trim()) {
      setStatusMessage('Velg et forslag eller skriv egne endringer før dere sender revisjonen.');
      return;
    }

    setLoading(true);
    setStatusMessage('AI oppdaterer utkastet med de valgte endringene.');

    try {
      const result = await generateAdWithAi(preparedForm, classification, requirementAnalysis, companyProfile, 'revision');
      persistGeneratedDraft(
        result.markdown,
        result.structured,
        'Utkastet er oppdatert med endringene. Dere kan sende nye endringer eller publisere.'
      );
    } catch (error) {
      console.error('Failed to revise case draft', error);
      const generatedAd = `${form.generatedAd}\n\n### Oppdatert revisjonsnotat\n${form.revisionInstruction}`;
      persistGeneratedDraft(
        generatedAd,
        buildStructuredFallback(preparedForm, classification, requirementAnalysis, generatedAd),
        'AI-revisjon feilet. Revisjonsinstruksjonen er lagt ved utkastet lokalt.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    const nextErrors = validateForm(preparedForm);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatusMessage(`Fullfør alle obligatoriske felt for publisering: ${Object.values(nextErrors).join(' ')}`);
      return;
    }

    setLoading(true);

    const publishedCase = {
      ...form,
      title: form.title || preparedForm.taskFocus,
      companyName: companyProfile.name,
      companyLogo: companyProfile.logo,
      industry: companyProfile.industry,
      companySize: companyProfile.size,
      workAreas: companyProfile.workAreas,
      companyProfileDescription: companyProfile.description,
      classification,
      requirementAnalysis,
      topQualification: requirementAnalysis.mostImportantQualification,
      suggestions: revisionSuggestions,
      status: 'published',
      publishedAt: form.publishedAt || new Date().toISOString(),
      lastEditedAt: new Date().toISOString(),
      generatedAd: form.generatedAd || buildFallbackAd(preparedForm, classification, requirementAnalysis),
      generatedAdData:
        form.generatedAdData ||
        buildStructuredFallback(
          preparedForm,
          classification,
          requirementAnalysis,
          form.generatedAd || buildFallbackAd(preparedForm, classification, requirementAnalysis)
        ),
    };

    try {
      let caseId = form.id;
      const idString = String(form.id || '');

      // If editing existing published case, update it
      if (isEditingPublishedCase && form.id && !idString.startsWith('draft-')) {
        await casesAPI.updatePublished(form.id, publishedCase);
      } else if (form.id && drafts.some(d => d.id === form.id) && !idString.startsWith('draft-')) {
        // Publish existing draft
        await casesAPI.publishDraft(form.id);
      } else {
        // Create new draft first, then publish
        const created = await casesAPI.createDraft(publishedCase);
        caseId = created.id;
        // Now publish it
        await casesAPI.publishDraft(caseId);
      }

      setPublishedCases((prev) => [publishedCase, ...prev.filter((item) => item.id !== publishedCase.id)]);
      setDrafts((prev) => prev.filter((draft) => draft.id !== caseId));
      setForm(publishedCase);
      setStatusMessage(
        isEditingPublishedCase
          ? 'Den publiserte saken er oppdatert.'
          : 'Saken er publisert. Studenten kan nå motta matchvarsling på profilsiden.'
      );
    } catch (err) {
      console.error('Failed to publish case:', err);
      if (err.message.includes('Not authorized')) {
        setStatusMessage('Du kan ikke redigere denne saken. Den tilhører en annen bedrift.');
      } else {
        setStatusMessage('Kunne ikke publisere saken. Sjekk internettforbindelsen.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <main className="chatbot-locked-shell">
        <section className="profile-section">
          <p style={{ textAlign: 'center', padding: '20px' }}>Laster...</p>
        </section>
      </main>
    );
  }

  if (!canManageCases) {
    return (
      <main className="chatbot-locked-shell">
        <section className="profile-section">
          <h1 className="chatbot-locked-title">AI-verktøy for bedrifter</h1>
          <p className="chatbot-locked-copy chatbot-locked-copy-spaced">
            Denne visningen er laget for bedrifter som skal registrere seg, opprette et studentprosjekt og generere prosjekttekst.
          </p>
          <p className="chatbot-locked-copy">
            Bytt mock-innlogging til bedrift fra forsiden for å teste flyten. Studenten har allerede en dummyprofil med
            matchscore og varslinger i profilsiden.
          </p>
        </section>

        <section className="profile-section">
          <h2>Hva som er lagt opp i flyten</h2>
          <div className="saved-list">
            {publishedCases.slice(0, 3).map((item) => (
              <div key={item.id} className="saved-card">
                <div className="saved-info">
                  <h3>{item.title}</h3>
                  <p>{item.classification?.type || 'Bachelor'} • Viktigste krav: {item.topQualification}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="chatbot-shell">
      <section className="chatbot-intro">
        <p className="case-intro-kicker">
          Bedriftsregistrering og AI-støtte
        </p>
        <h1 className="case-intro-title">
          Opprett en studentsak med huskede utkast, kvalifikasjonsscore og publisering
        </h1>
        <p className="case-intro-copy">
          Bedriften registrerer kontekst, tekniske begreper, leveranser, forventninger og krav. Systemet vurderer
          sakstype, finner relevante fag og rangerer hvilke kvalifikasjoner som er viktigst i prosjektet.
        </p>
      </section>

      <div className="case-layout">
        <aside className="case-panel">
          <h2>Bedrift og utkast</h2>
          <p className="muted case-panel-top-copy">
            Registrert som {companyProfile?.name || 'Bedrift'}. Uferdige sessions lagres i databasen slik at dere kan fortsette senere.
          </p>

          <div className="metric-card case-panel-top-gap">
            <strong>{companyProfile?.expectations_quality_score || '0'}%</strong>
            <span>Estimert kvalitet på forventningsgrunnlaget i bedriftsprofilen.</span>
          </div>

          <div className="action-row">
            <button type="button" className="primary-action" onClick={handleCreateNewDraft}>
              Ny sak
            </button>
            <button type="button" className="secondary-action" onClick={handleSaveDraft}>
              Lagre utkast
            </button>
            <button type="button" className="secondary-action" onClick={() => handleOpenFullProject(form)}>
              Se hele prosjektet
            </button>
            <button type="button" className="secondary-action" onClick={() => handleExportCasePdf(form)}>
              Last ned PDF
            </button>
          </div>

          <div className="draft-list">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className={`draft-button ${draft.id === form.id ? 'active' : ''}`}
              >
                <button
                  type="button"
                  style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
                  onClick={() => handleLoadDraft(draft)}
                >
                  <strong className="draft-title">{draft.title || 'Ny upublisert sak'}</strong>
                  <span className="muted draft-meta">
                    Sist redigert {formatDate(draft.lastEditedAt)}
                  </span>
                  <span className="muted">{draft.startWithin || 'Ingen oppstart lagt inn'}</span>
                </button>
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => handleOpenFullProject(draft)}
                    disabled={loading}
                    style={{ marginRight: '8px' }}
                  >
                    Se hele prosjektet
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => handleExportCasePdf(draft)}
                    disabled={loading}
                    style={{ marginRight: '8px' }}
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => handleDeleteDraft(draft)}
                    disabled={loading}
                  >
                    Slett utkast
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h3 className="section-title-top">Publiserte saker</h3>
          <div className="draft-list">
            {publishedCases
              .filter((item) => isAdmin || item.companyId === companyProfile?.id)
              .map((item) => (
                <div
                  key={item.id}
                  className={`draft-button ${item.id === form.id ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
                    onClick={() => handleLoadPublishedCase(item)}
                  >
                    <strong className="draft-title">{item.title}</strong>
                    <span className="muted draft-meta">
                      Publisert {formatDate(item.publishedAt)}
                    </span>
                    <span className="muted">
                      Klikk for å redigere prosjektet
                    </span>
                  </button>
                  {canManagePublishedCase(item) ? (
                    <div style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => handleOpenFullProject(item)}
                        disabled={loading}
                        style={{ marginRight: '8px' }}
                      >
                        Se hele prosjektet
                      </button>
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => handleExportCasePdf(item)}
                        disabled={loading}
                        style={{ marginRight: '8px' }}
                      >
                        PDF
                      </button>
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => handleDeletePublishedCase(item)}
                        disabled={loading}
                      >
                        Slett sak
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
          </div>
        </aside>

        <div className="case-main-column">
          <section className="case-panel">
            <div className="case-form-header">
              <div>
                <h2>Lag Studentprosjekt</h2>
                <p className="muted case-panel-top-copy">
                  Fyll inn en kort brief. Resten blir strukturert automatisk for AI-utkastet.
                </p>
              </div>
            </div>

            <div className="case-grid">
              <label>
                Tittel *
                <input
                  className={`case-input ${errors.title ? 'case-input-error' : ''}`}
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="For eksempel Frontend-praksis for analyseplattform"
                  aria-invalid={Boolean(errors.title)}
                />
                {errors.title ? <p className="error-text">{errors.title}</p> : null}
              </label>

              <div>
                <span>Nettside fra bedriftsprofil</span>
                <input
                  className="case-input"
                  value={preparedForm.website || 'Ingen nettside lagt inn i bedriftsprofilen ennå'}
                  readOnly
                />
                <p className="muted case-panel-top-copy">
                  {preparedForm.website
                    ? 'Denne lenken sendes automatisk til AI-en når første utkast genereres.'
                    : 'Ingen nettside er lagret i bedriftsprofilen. Hvis AI-en mangler selskapskontekst, vil den be dere lime inn nettsidelenken i revisjonsinstruksjonsfeltet.'}
                </p>
              </div>

              <label className="full">
                Rolle / hovedspor
                <div className="case-radio-group">
                  {Object.entries(ROLE_OPTIONS).map(([value, label]) => (
                    <label
                      key={value}
                      className={`case-radio-card ${(Array.isArray(form.roleTracks) ? form.roleTracks : [form.roleTrack]).includes(value)
                        ? 'selected'
                        : ''
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={(Array.isArray(form.roleTracks) ? form.roleTracks : [form.roleTrack]).includes(value)}
                        onChange={() => toggleRoleTrack(value)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </label>

              <label className="full">
                Kort oppdragsbrief *
                <textarea
                  className={`case-textarea ${errors.taskDescription ? 'case-input-error' : ''}`}
                  value={form.taskDescription}
                  onChange={(event) => updateField('taskDescription', event.target.value)}
                  placeholder="Beskriv hva studenten skal jobbe med, hva som skal leveres og hvorfor oppdraget er relevant."
                  aria-invalid={Boolean(errors.taskDescription)}
                />
                {errors.taskDescription ? <p className="error-text">{errors.taskDescription}</p> : null}
              </label>

              <label className="full">
                Bedriftsbeskrivelse *
                <textarea
                  className={`case-textarea ${errors.companyQualifications ? 'case-input-error' : ''}`}
                  value={form.companyQualifications}
                  onChange={(event) => updateField('companyQualifications', event.target.value)}
                  placeholder="Kort om bedriften, teamet og hvorfor dere trenger en student."
                  aria-invalid={Boolean(errors.companyQualifications)}
                />
                {errors.companyQualifications ? <p className="error-text">{errors.companyQualifications}</p> : null}
              </label>

              <label className="full">
                Krav – MÅ ha *
                <textarea
                  className={`case-textarea ${errors.requiredQualifications ? 'case-input-error' : ''}`}
                  value={Array.isArray(form.requiredQualifications) ? form.requiredQualifications.join(', ') : (form.requiredQualifications || '')}
                  onChange={(event) => updateField('requiredQualifications', event.target.value)}
                  placeholder="For eksempel Python, SQL, Figma. Skill med komma."
                  aria-invalid={Boolean(errors.requiredQualifications)}
                />
                {errors.requiredQualifications ? <p className="error-text">{errors.requiredQualifications}</p> : null}
              </label>

              <label className="full">
                Ønskelig – FINT å ha
                <textarea
                  className="case-textarea"
                  value={Array.isArray(form.preferredQualifications) ? form.preferredQualifications.join(', ') : (form.preferredQualifications || '')}
                  onChange={(event) => updateField('preferredQualifications', event.target.value)}
                  placeholder="For eksempel React, TypeScript, erfaring fra agile team. Skill med komma."
                />
              </label>

              <div className="full">
                <span>Hva kan vi tilby studenten?</span>
                <div className="case-radio-group compact" style={{ marginTop: '0.5rem' }}>
                  {Object.entries(OFFERING_OPTIONS).map(([value, label]) => (
                    <label
                      key={value}
                      className={`case-radio-card ${(Array.isArray(form.offerings) ? form.offerings : []).includes(value) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={(Array.isArray(form.offerings) ? form.offerings : []).includes(value)}
                        onChange={() => toggleOffering(value)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                  <label className={`case-radio-card ${(Array.isArray(form.offerings) ? form.offerings : []).includes('other') ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={(Array.isArray(form.offerings) ? form.offerings : []).includes('other')}
                      onChange={() => toggleOffering('other')}
                    />
                    <span>Annet</span>
                  </label>
                </div>
                {(Array.isArray(form.offerings) ? form.offerings : []).includes('other') && (
                  <input
                    className="case-input"
                    style={{ marginTop: '0.5rem' }}
                    value={form.offeringOther || ''}
                    onChange={(event) => updateField('offeringOther', event.target.value)}
                    placeholder="Beskriv hva dere tilbyr..."
                  />
                )}
              </div>

              <label className="full">
                Kandidatprofil
                <div className="case-radio-group compact">
                  {Object.entries(PROFILE_OPTIONS).map(([value, option]) => (
                    <label key={value} className={`case-radio-card ${form.candidateProfile === value ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="candidateProfile"
                        checked={form.candidateProfile === value}
                        onChange={() => updateField('candidateProfile', value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </label>

              <label className="full">
                Samarbeidsnivå
                <div className="case-radio-group compact">
                  {Object.entries(COLLABORATION_OPTIONS).map(([value, label]) => (
                    <label key={value} className={`case-radio-card ${form.collaborationStyle === value ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="collaborationStyle"
                        checked={form.collaborationStyle === value}
                        onChange={() => updateField('collaborationStyle', value)}
                      />
                      <span>
                        {value === 'guided' ? 'Tett oppfølging' : value === 'team' ? 'Teamflyt' : 'Selvstendig'}
                      </span>
                    </label>
                  ))}
                </div>
              </label>

              <label className="full">
                Omfang
                <div className="case-radio-group compact">
                  {Object.entries(SCOPE_OPTIONS).map(([value, option]) => (
                    <label key={value} className={`case-radio-card ${form.scopePreset === value ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="scopePreset"
                        checked={form.scopePreset === value}
                        onChange={() => updateField('scopePreset', value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </label>

              <label>
                Arbeidsform
                <div className="case-radio-group compact">
                  {Object.entries(WORK_MODE_OPTIONS).map(([value, label]) => (
                    <label key={value} className={`case-radio-card ${form.workMode === value ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="workMode"
                        checked={form.workMode === value}
                        onChange={() => updateField('workMode', value)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </label>

              <label>
                Lokasjon *
                <input
                  className={`case-input ${errors.location ? 'case-input-error' : ''}`}
                  value={form.location}
                  onChange={(event) => updateField('location', event.target.value)}
                  placeholder="Halden, Oslo eller Remote"
                  aria-invalid={Boolean(errors.location)}
                />
                {errors.location ? <p className="error-text">{errors.location}</p> : null}
              </label>

              <label>
                Startdato *
                <input
                  className={`case-input ${errors.startDate ? 'case-input-error' : ''}`}
                  type="date"
                  value={form.startDate}
                  onChange={(event) => updateField('startDate', event.target.value)}
                  aria-invalid={Boolean(errors.startDate)}
                />
                {errors.startDate ? <p className="error-text">{errors.startDate}</p> : null}
              </label>

              <label>
                Sluttdato *
                <input
                  className={`case-input ${errors.endDate ? 'case-input-error' : ''}`}
                  type="date"
                  value={form.endDate}
                  onChange={(event) => updateField('endDate', event.target.value)}
                  aria-invalid={Boolean(errors.endDate)}
                />
                {errors.endDate ? <p className="error-text">{errors.endDate}</p> : null}
              </label>
            </div>

            <div className="case-section-top">
              <h3>Relevant fag for saken</h3>
              <div className="case-chip-row">
                {classification.relevantSubjects.map((subject) => (
                  <span key={subject} className="case-chip case-chip-static">
                    {subject}
                  </span>
                ))}
              </div>
            </div>

            <div className="case-section-top">
              <h3>Viktigste kvalifikasjon</h3>
              <p className="muted">{requirementAnalysis.mostImportantQualification}</p>
            </div>

            <div className="case-form-header-actions">
              <button type="button" className="primary-action" onClick={handleGenerateFirstDraft} disabled={loading}>
                {loading ? 'Genererer...' : 'Generer utkast'}
              </button>
              <button type="button" className="secondary-action" onClick={handlePublish}>
                {isEditingPublishedCase ? 'Oppdater publisert sak' : 'Publiser sak'}
              </button>
              <button type="button" className="secondary-action" onClick={handleSaveDraft}>
                Lagre
              </button>
              <button type="button" className="secondary-action" onClick={() => handleOpenFullProject(form)}>
                Se hele prosjektet
              </button>
              <button type="button" className="secondary-action" onClick={() => handleExportCasePdf(form)}>
                Last ned PDF
              </button>
            </div>
            <br />
            {statusMessage ? <div className="case-status">{statusMessage}</div> : null}
          </section>

          <section className="case-panel preview case-preview-panel">
            <h2>AI-utkast</h2>
            <p className="muted case-panel-top-copy">
              Her vises kun teksten AI-en skriver. Du kan gi revisjonsinstruksjoner og oppdatere utkastet før publisering.
            </p>

            <div className="case-section-top-lg">
              <h3>Utkast</h3>
              <label className="case-revision-field">
                Revisjonsinstruksjon
                <input
                  className="case-input"
                  value={form.revisionInstruction}
                  onChange={(event) => updateField('revisionInstruction', event.target.value)}
                  placeholder="For eksempel: ton ned kravene og fremhev leveranser"
                />
              </label>
              <div className="action-row">
                {hasGeneratedDraft ? (
                  <button type="button" className="secondary-action" onClick={handleReviseDraft} disabled={loading}>
                    Send endringer til AI
                  </button>
                ) : null}
              </div>
              <div className="case-output">
                {form.generatedAd ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.generatedAd}</ReactMarkdown>
                ) : (
                  <p className="muted">
                    Generer utkast for a se prosjekttekst, sakstype, scoringsgrunnlag og revisjonsmuligheter.
                  </p>
                )}
              </div>
              {revisionSuggestions.length > 0 ? (
                <div className="case-section-top">
                  <h3>Forslag til endringer</h3>
                  <p className="muted case-panel-top-copy">
                    Velg et forslag eller skriv egne endringer i feltet over, og send deretter utkastet tilbake til AI.
                  </p>
                  <div className="case-chip-row">
                    {revisionSuggestions.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion}
                        className="case-chip"
                        onClick={() => handleApplySuggestion(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {fullProjectPreview ? (
        <div className="modal-backdrop" onClick={() => setFullProjectPreview(null)} role="presentation">
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="full-project-modal-title"
          >
            <button type="button" className="modal-close" onClick={() => setFullProjectPreview(null)} aria-label="Lukk detaljvisning">
              ×
            </button>

            <p className="modal-eyebrow">{fullProjectPreview.status}</p>
            <h2 id="full-project-modal-title">{fullProjectPreview.title}</h2>

            <div className="modal-panel modal-full-ad-panel">
              <h3>Hele prosjektet</h3>
              <div className="modal-full-ad">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullProjectPreview.fullProjectText}</ReactMarkdown>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setFullProjectPreview(null)}>
                Lukk
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
