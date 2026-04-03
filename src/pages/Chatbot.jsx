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

function prepareCaseForm(form) {
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
  const location = form.location?.trim() || '';
  const workMode = WORK_MODE_OPTIONS[form.workMode] || WORK_MODE_OPTIONS.hybrid;
  const taskDescription = form.taskDescription?.trim() || '';

  return {
    ...form,
    roleTracks: selectedRoleTracks,
    roleTrack: selectedRoleTracks[0],
    taskFocus: form.taskFocus?.trim() || roleLabel,
    assignmentContext: form.assignmentContext?.trim() || taskDescription,
    taskDescription,
    technicalTerms: form.technicalTerms?.trim() || form.professionalQualifications?.trim() || roleLabel,
    deliveries: form.deliveries?.trim() || scope.deliveries,
    expectations:
      form.expectations?.trim() || `${collaborationExpectation} Arbeidsform: ${workMode}.`,
    personalQualifications: form.personalQualifications?.trim() || profile.personal,
    startWithin: form.startWithin?.trim() || scope.startWithin,
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

function buildPrompt(form, classification, requirementAnalysis, mode = 'initial') {
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
Du er en norsk AI-assistent som hjelper en bedrift med å skrive en praksis- eller studentannonse.

Hvis bedriften velger Usikker/annet på Hovedfokus, bruk informasjonen i de andre feltene for å finne det beste fokuset og klassifisere saken.

Bedrift:
- Navn/logo: ${form.logo || 'Ikke oppgitt'}
- Nettside: ${form.website}
- Hva bedriften gjør: ${form.companyQualifications}

Oppdrag:
- Tittel/hovedfokus: ${form.title || form.taskFocus}
- Spesifikk oppdragskontekst: ${form.assignmentContext}
- Tekniske begreper: ${form.technicalTerms}
- Oppgavebeskrivelse: ${form.taskDescription}
- Leveranser: ${form.deliveries}
- Forventninger: ${form.expectations}
- Faglige kvalifikasjoner: ${form.professionalQualifications}
- Personlige kvalifikasjoner: ${form.personalQualifications}
- Lokasjon: ${form.location}
- Startdato: ${formatDate(form.startDate)}
- Sluttdato: ${formatDate(form.endDate)}
- Start senest innen: ${form.startWithin}
- Omfang: ${form.maxHours} timer
- Lonnstype: ${form.salaryType}
- Kompensasjon: ${form.compensationAmount}
- Sakstype vurdert av systemet: ${classification.type}
- Relevante fag: ${classification.relevantSubjects.join(', ')}
- Viktigste kvalifikasjon i kravbildet: ${requirementAnalysis.mostImportantQualification}
- Kvalitetsdekning for forventninger: ${requirementAnalysis.expectationCoverage}%
- Revisjonsinstruksjon: ${form.revisionInstruction || 'Ingen'}

${revisionSection}

Svar kun med gyldig JSON i dette formatet:
{
  "title": "string",
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
    "salaryType": "string",
    "compensationAmount": "string"
  },
  "closingText": "string",
  "markdown": "string"
}

Krav:
- "markdown" skal være en full annonse på norsk med disse delene:
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
- Alle lister skal inneholde korte tekstverdier.
`.trim();
}

function buildFallbackAd(form, classification, requirementAnalysis) {
  const professionalQualifications = parseList(form.professionalQualifications);
  const personalQualifications = parseList(form.personalQualifications);

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
**Faglige kvalifikasjoner**
${professionalQualifications.length > 0 ? professionalQualifications.map((item) => `- ${item}`).join('\n') : '- Ikke spesifisert'}

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
- Kompensasjon: ${form.salaryType === 'hourly' ? `${form.compensationAmount} NOK per time` : `${form.compensationAmount} NOK fastpris`}

### Avslutning
Vi ser etter en student som kan bidra med konkrete leveranser og samtidig fa relevant erfaring i en ekte arbeidssituasjon.
`.trim();
}

function buildStructuredFallback(form, classification, requirementAnalysis, markdown) {
  return {
    title: form.title || form.taskFocus || 'Studentoppdrag',
    companySummary: form.companyQualifications || '',
    assignmentContext: form.assignmentContext || '',
    tasks: parseList(form.taskDescription),
    deliveries: parseList(form.deliveries),
    expectations: parseList(form.expectations),
    qualificationsProfessional: parseList(form.professionalQualifications),
    qualificationsPersonal: parseList(form.personalQualifications),
    targetAudience: classification.type,
    recommendedSubjects: requirementAnalysis.recommendedSubjects || [],
    practicalInfo: {
      location: form.location || '',
      startDate: form.startDate || '',
      endDate: form.endDate || '',
      startWithin: form.startWithin || '',
      maxHours: String(form.maxHours || ''),
      salaryType: form.salaryType || '',
      compensationAmount: String(form.compensationAmount || ''),
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

  if (!form.title.trim()) nextErrors.title = 'Tittel er påkrevd.';
  if (!form.assignmentContext.trim()) nextErrors.assignmentContext = 'Oppdragskontekst er påkrevd.';
  if (!form.taskDescription.trim()) nextErrors.taskDescription = 'Oppgavebeskrivelse er påkrevd.';
  if (!form.deliveries.trim()) nextErrors.deliveries = 'Leveranser er påkrevd.';
  if (!form.expectations.trim() || form.expectations.trim().length < 30) {
    nextErrors.expectations = 'Legg inn tydelige forventninger. Dette brukes for å forbedre AI-utkastet.';
  }
  if (!form.companyQualifications.trim()) nextErrors.companyQualifications = 'Beskrivelse av hva bedriften gjør er påkrevd.';
  if (!form.professionalQualifications.trim()) nextErrors.professionalQualifications = 'Faglige kvalifikasjoner er påkrevd.';
  if (!form.personalQualifications.trim()) nextErrors.personalQualifications = 'Personlige kvalifikasjoner er påkrevd.';
  if (!form.website.trim()) nextErrors.website = 'Nettside er påkrevd.';
  if (!form.location.trim()) nextErrors.location = 'Lokasjon er påkrevd.';
  if (!form.startDate) nextErrors.startDate = 'Startdato er påkrevd.';
  if (!form.endDate) nextErrors.endDate = 'Sluttdato er påkrevd.';
  if (!form.startWithin.trim()) nextErrors.startWithin = 'Start senest innen er påkrevd.';
  if (!form.maxHours) nextErrors.maxHours = 'Omfang i timer er påkrevd.';
  if (!form.compensationAmount.trim()) nextErrors.compensationAmount = 'Kompensasjon er påkrevd.';

  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    nextErrors.endDate = 'Sluttdato kan ikke være tidligere enn startdato.';
  }

  return nextErrors;
}

async function generateAdWithAi(form, classification, requirementAnalysis, mode = 'initial') {
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

  llm.system('Du skriver profesjonelle norske student- og praksisannonser basert på strukturerte data.');

  const response = await llm.chat(buildPrompt(form, classification, requirementAnalysis, mode), {
    max_tokens: 4096,
  });

  return normalizeGeneratedAdPayload(response, form, classification, requirementAnalysis);
}

export default function Chatbot({ userRole }) {
  const navigate = useNavigate();
  const { userRole: authRole } = useContext(AuthContext);
  const isCompany = authRole === 'company';

  const [companyProfile, setCompanyProfile] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [publishedCases, setPublishedCases] = useState([]);
  const [form, setForm] = useState(createEmptyCaseDraft());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [initializing, setInitializing] = useState(true);
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
            setForm(draftList[0]);
          } else {
            setForm(createEmptyCaseDraft({
              website: company.website,
              logo: company.logo,
              companyQualifications: company.description,
            }));
          }
        }
        const published = await casesAPI.listPublished();
        setPublishedCases(published);
      } catch (err) {
        console.error('Failed to load data:', err);
        setCompanyProfile(defaultCompanyProfile);
        setDrafts(defaultDrafts);
        setPublishedCases(defaultPublishedCases);
      } finally {
        setInitializing(false);
      }
    };

    if (isCompany) {
      loadData();
    } else {
      setInitializing(false);
    }
  }, [isCompany]);

  const preparedForm = useMemo(() => prepareCaseForm(form), [form]);
  const classification = useMemo(() => classifyCase(preparedForm), [preparedForm]);
  const requirementAnalysis = useMemo(() => analyzeCaseRequirements(preparedForm), [preparedForm]);
  const revisionSuggestions = useMemo(
    () => buildRevisionSuggestions(preparedForm, {
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
    }),
    [preparedForm]
  );

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

  const syncCurrentDraft = async (nextForm) => {
    try {
      if (nextForm.id && drafts.some(d => d.id === nextForm.id)) {
        // Update existing draft
        await casesAPI.updateDraft(nextForm.id, nextForm);
      } else if (isCompany) {
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
    setStatusMessage('Ny annonseutforming er startet.');
    setDrafts((prev) => [nextDraft, ...prev]);
  };

  const handleLoadDraft = (draft) => {
    setForm(draft);
    setErrors({});
    setStatusMessage(`Fortsetter utkast: ${draft.title || 'Ny sak'}.`);
  };

  const handleSaveDraft = () => {
    const nextDraft = {
      ...preparedForm,
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
      ...preparedForm,
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
      setStatusMessage('Fyll ut obligatoriske felt for a generere utkastet.');
      return;
    }

    setLoading(true);
    setStatusMessage('Systemet genererer annonseutkast og vurderer match mot studentprofilen.');

    try {
      const result = await generateAdWithAi(preparedForm, classification, requirementAnalysis, 'initial');
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
      const result = await generateAdWithAi(preparedForm, classification, requirementAnalysis, 'revision');
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
      setStatusMessage('Fullfør alle obligatoriske felt for publisering.');
      return;
    }

    try {
      setLoading(true);

      const publishedCase = {
        ...preparedForm,
        title: preparedForm.title || preparedForm.taskFocus,
        classification,
        requirementAnalysis,
        topQualification: requirementAnalysis.mostImportantQualification,
        suggestions: revisionSuggestions,
        status: 'published',
        publishedAt: new Date().toISOString(),
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

      // Publish via API
      if (form.id) {
        await casesAPI.publishDraft(form.id);
      }

      setPublishedCases((prev) => [publishedCase, ...prev.filter((item) => item.id !== publishedCase.id)]);
      setDrafts((prev) => prev.filter((draft) => draft.id !== publishedCase.id));
      setForm(
        createEmptyCaseDraft({
          website: companyProfile?.website,
          logo: companyProfile?.logo,
          companyQualifications: companyProfile?.description,
        })
      );
      setStatusMessage('Saken er publisert. Studenten kan nå motta matchvarsling på profilsiden.');
    } catch (err) {
      console.error('Failed to publish:', err);
      setStatusMessage('Kunne ikke publisere saken. Prøv igjen.');
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

  if (!isCompany) {
    return (
      <main className="chatbot-locked-shell">
        <section className="profile-section">
          <h1 className="chatbot-locked-title">AI-verktøy for bedrifter</h1>
          <p className="chatbot-locked-copy chatbot-locked-copy-spaced">
            Denne visningen er laget for bedrifter som skal registrere seg, opprette en studentsak og generere annonsetekst.
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
          sakstype, finner relevante fag og rangerer hvilke kvalifikasjoner som er viktigst i annonsen.
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
          </div>

          <div className="draft-list">
            {drafts.map((draft) => (
              <button
                type="button"
                key={draft.id}
                className={`draft-button ${draft.id === form.id ? 'active' : ''}`}
                onClick={() => handleLoadDraft(draft)}
              >
                <strong className="draft-title">{draft.title || 'Ny upublisert sak'}</strong>
                <span className="muted draft-meta">
                  Sist redigert {formatDate(draft.lastEditedAt)}
                </span>
                <span className="muted">{draft.startWithin || 'Ingen oppstart lagt inn'}</span>
              </button>
            ))}
          </div>

          <h3 className="section-title-top">Publiserte saker</h3>
          <div className="draft-list">
            {publishedCases.slice(0, 3).map((item) => (
              <div key={item.id} className="draft-button">
                <strong className="draft-title">{item.title}</strong>
                <span className="muted draft-meta">
                  {item.classification?.type || 'Bachelor'} • Publisert {formatDate(item.publishedAt)}
                </span>
                <span className="muted">Topprangert krav: {item.topQualification || item.requirementAnalysis?.mostImportantQualification}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="case-main-column">
          <section className="case-panel">
            {statusMessage ? <div className="case-status">{statusMessage}</div> : null}

            <div className="case-form-header">
              <div>
                <h2>Lag annonse</h2>
                <p className="muted case-panel-top-copy">
                  Fyll inn en kort brief. Resten blir strukturert automatisk for AI-utkastet.
                </p>
              </div>
              <div className="case-form-header-actions">
                <button type="button" className="primary-action" onClick={handleGenerateFirstDraft} disabled={loading}>
                  {loading ? 'Genererer...' : 'Generer utkast'}
                </button>
                <button type="button" className="secondary-action" onClick={handleSaveDraft}>
                  Lagre
                </button>
              </div>
            </div>

            <div className="case-grid">
              <label>
                Tittel *
                <input
                  className="case-input"
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="For eksempel Frontend-praksis for analyseplattform"
                />
                {errors.title ? <p className="error-text">{errors.title}</p> : null}
              </label>

              <label>
                Nettside *
                <input
                  className="case-input"
                  value={form.website}
                  onChange={(event) => updateField('website', event.target.value)}
                  placeholder="https://bedrift.no"
                />
                {errors.website ? <p className="error-text">{errors.website}</p> : null}
              </label>

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
                  className="case-textarea"
                  value={form.taskDescription}
                  onChange={(event) => updateField('taskDescription', event.target.value)}
                  placeholder="Beskriv hva studenten skal jobbe med, hva som skal leveres og hvorfor oppdraget er relevant."
                />
                {errors.taskDescription ? <p className="error-text">{errors.taskDescription}</p> : null}
              </label>

              <label className="full">
                Bedriftsbeskrivelse *
                <textarea
                  className="case-textarea"
                  value={form.companyQualifications}
                  onChange={(event) => updateField('companyQualifications', event.target.value)}
                  placeholder="Kort om bedriften, teamet og hvorfor dere trenger en student."
                />
                {errors.companyQualifications ? <p className="error-text">{errors.companyQualifications}</p> : null}
              </label>

              <label className="full">
                Viktige ferdigheter / teknologi *
                <textarea
                  className="case-textarea"
                  value={form.professionalQualifications}
                  onChange={(event) => updateField('professionalQualifications', event.target.value)}
                  placeholder="For eksempel React, SQL, Figma, API, analyse. Skill med komma."
                />
                {errors.professionalQualifications ? <p className="error-text">{errors.professionalQualifications}</p> : null}
              </label>

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
                  className="case-input"
                  value={form.location}
                  onChange={(event) => updateField('location', event.target.value)}
                  placeholder="Halden, Oslo eller Remote"
                />
                {errors.location ? <p className="error-text">{errors.location}</p> : null}
              </label>

              <label>
                Startdato *
                <input
                  className="case-input"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => updateField('startDate', event.target.value)}
                />
                {errors.startDate ? <p className="error-text">{errors.startDate}</p> : null}
              </label>

              <label>
                Sluttdato *
                <input
                  className="case-input"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => updateField('endDate', event.target.value)}
                />
                {errors.endDate ? <p className="error-text">{errors.endDate}</p> : null}
              </label>

              {/* <label className="full">
                Lonnsmodell
                <div className="case-radio-group compact">
                  <label className={`case-radio-card ${form.salaryType === 'hourly' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="salaryType"
                      checked={form.salaryType === 'hourly'}
                      onChange={() => updateField('salaryType', 'hourly')}
                    />
                    <span>Timelønn</span>
                  </label>
                  <label className={`case-radio-card ${form.salaryType === 'fixed' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="salaryType"
                      checked={form.salaryType === 'fixed'}
                      onChange={() => updateField('salaryType', 'fixed')}
                    />
                    <span>Fastpris</span>
                  </label>
                </div>
              </label>

              <label>
                Kompensasjon *
                <input
                  className="case-input"
                  value={form.compensationAmount}
                  onChange={(event) => updateField('compensationAmount', event.target.value)}
                  placeholder="250"
                />
                {errors.compensationAmount ? <p className="error-text">{errors.compensationAmount}</p> : null}
              </label> */}
            </div>

            {revisionSuggestions.length > 0 ? (
              <>
                <h3 className="section-title-top">Endringer etter første utkast</h3>
                <p className="muted case-panel-top-copy">
                  Velg et forslag eller skriv egne endringer i feltet "Revisjonsinstruksjon". Send deretter utkastet tilbake til AI.
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
              </>
            ) : null}
          </section>

          <section className="case-panel preview case-preview-panel">
            <h2>AI-vurdering og utkast</h2>
            <p className="muted case-panel-top-copy">
              Systemet bruker forventninger og kvalifikasjoner for å finne hva som er viktigst i kravbildet, uten å matche mot en bestemt student under utkastskrivingen.
            </p>

            <div className="analysis-grid">
              <div className="metric-card">
                <strong>{classification.type}</strong>
                <span>{classification.reason}</span>
              </div>
              <div className="metric-card">
                <strong>{requirementAnalysis.expectationCoverage}%</strong>
                <span>Forventningsdekning</span>
              </div>
              <div className="metric-card">
                <strong>{parseList(preparedForm.professionalQualifications).length}</strong>
                <span>Faglige krav</span>
              </div>
              <div className="metric-card">
                <strong>{parseList(preparedForm.personalQualifications).length}</strong>
                <span>Personlige krav</span>
              </div>
            </div>

            <div className="case-section-top">
              <h3>Viktigste kvalifikasjon</h3>
              <p className="muted">{requirementAnalysis.mostImportantQualification}</p>
            </div>

            <div className="case-section-top">
              <h3>Relevante fag for saken</h3>
              <div className="case-chip-row">
                {classification.relevantSubjects.map((subject) => (
                  <span key={subject} className="case-chip case-chip-static">
                    {subject}
                  </span>
                ))}
              </div>
            </div>

            <div className="case-section-top">
              <h3>Prioriterte kvalifikasjoner</h3>
              <p className="muted">
                {requirementAnalysis.rankedQualifications.length > 0
                  ? requirementAnalysis.rankedQualifications.map((item) => `${item.name} (${item.weight})`).join(', ')
                  : 'Ingen faglige kvalifikasjoner er lagt inn ennå.'}
              </p>
            </div>

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
                <button type="button" className="secondary-action" onClick={handlePublish}>
                  Publiser sak
                </button>
              </div>
              <div className="case-output">
                {form.generatedAd ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.generatedAd}</ReactMarkdown>
                ) : (
                  <p className="muted">
                    Generer utkast for a se annonsetekst, sakstype, scoringsgrunnlag og revisjonsmuligheter.
                  </p>
                )}
              </div>
            </div>

            <div className="case-section-top-lg">
              <h3>Fagområder som systemet anbefaler</h3>
              <p className="muted">{requirementAnalysis.recommendedSubjects.join(', ')}</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
