import { useState } from 'react';
import LLM from '@themaximalist/llm.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const initialForm = {
    taskFocus: '',
    description: '',
    website: '',
    location: '',
    startDate: '',
    endDate: '',
    maxHours: '',
    salaryType: '',
    compensationAmount: '',
    skills: [],
    internshipCredits: false,
    useAi: true,
};

function formatDate(dateString) {
    if (!dateString) {
        return '';
    }

    return new Intl.DateTimeFormat('nb-NO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(dateString));
}

function buildPrompt(form) {
    const salaryText =
        form.salaryType === 'hourly'
            ? `Lønn: Timelønn pa ${form.compensationAmount} NOK per time.`
            : `Lønn: Fastpris pa ${form.compensationAmount} NOK.`;

    const internshipCreditsText = form.internshipCredits
        ? 'Oppdraget er relevant for praksispoeng eller studiepoeng, og dette skal nevnes naturlig i annonsen.'
        : 'Det er ikke krysset av for praksispoeng eller studiepoeng.';

    return `
Skriv en profesjonell og tydelig rekrutteringsannonse pa norsk for en bedrift.
Annonsen skal vaere klar for publisering og bruke et formelt, men inviterende sprak.

Bruk denne informasjonen:
- Hovedfokus: ${form.taskFocus}
- Beskrivelse: ${form.description}
- Nettside: ${form.website}
- Sted: ${form.location}
- Oppstartsdato: ${formatDate(form.startDate)}
- Sluttdato: ${formatDate(form.endDate)}
- Maks antall timer: ${form.maxHours}
- ${salaryText}
- Ønskede ferdigheter: ${form.skills.join(', ')}
- ${internshipCreditsText}

Les gjennom nettsiden som bedriften legger inn for a forstå bedriftens virksomhet, verdier og tone. Integrer relevant informasjon fra nettsiden naturlig i annonsen for a gi et helhetlig bilde av bedriften.

Let gjennom HIOF.no og finn passende bachelor- og masterprogrammer som kan matche oppdraget, og inkluder relevante studieretninger i annonsen.

Strukturer svaret med disse delene:
1. Relevant Tittel som reflekterer hovedfokuset
2. Kort ingress
3. Om rollen eller oppdraget
4. Relevante studieretninger for kandidater
5. Arbeidsoppgaver
6. Ønskede kvalifikasjoner (Mål disse mot bachelor- og masterstudenter ved HIOF basert på informasjonen i beskrivelsen)
7. Praktisk informasjon
8. Kort avslutning med oppfordring til a søke

Hvis informasjon mangler utover feltene over, skriv ikke antakelser som ser ut som fakta.
`.trim();
}

function validateForm(form) {
    const nextErrors = {};

    if (!form.taskFocus.trim()) nextErrors.taskFocus = 'Hovedfokus er påkrevd.';
    if (!form.description.trim()) nextErrors.description = 'Beskrivelse er påkrevd.';
    if (!form.location.trim()) nextErrors.location = 'Sted er påkrevd.';
    if (!form.startDate) nextErrors.startDate = 'Oppstartsdato er påkrevd.';
    if (!form.endDate) nextErrors.endDate = 'Sluttdato er påkrevd.';
    if (!form.maxHours) nextErrors.maxHours = 'Maks antall timer er påkrevd.';
    if (!form.salaryType) nextErrors.salaryType = 'Lønnstype er påkrevd.';
    if ((form.salaryType === 'hourly' || form.salaryType === 'fixed') && !form.compensationAmount.trim()) {
        nextErrors.compensationAmount =
            form.salaryType === 'hourly'
                ? 'Timelønn er påkrevd nar timelønn er valgt.'
                : 'Fastpris er påkrevd nar fastpris er valgt.';
    }
    if (form.skills.length === 0) nextErrors.skills = 'Legg til minst en ferdighet.';

    if (form.startDate && form.endDate && form.startDate > form.endDate) {
        nextErrors.endDate = 'Sluttdato kan ikke vaere tidligere enn oppstartsdato.';
    }

    return nextErrors;
}

export default function Chatbot({ userRole }) {
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const isCompany = userRole === 'company';
    const [form, setForm] = useState(initialForm);
    const [skillInput, setSkillInput] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [llmModel, setLlmModel] = useState('google');
    const [generatedAd, setGeneratedAd] = useState('');
    const [publishedAdSummary, setPublishedAdSummary] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    const llmConfig = {
        google: { service: 'google', model: 'gemini-2.5-flash', apiKey: geminiApiKey },
        openai: { service: 'openai', apiKey: '' },
    };

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => {
            if (!prev[field]) {
                return prev;
            }

            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const addSkill = () => {
        const trimmed = skillInput.trim();
        if (!trimmed) {
            return;
        }

        const exists = form.skills.some((skill) => skill.toLowerCase() === trimmed.toLowerCase());
        if (!exists) {
            setForm((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
            setErrors((prev) => {
                if (!prev.skills) {
                    return prev;
                }

                const next = { ...prev };
                delete next.skills;
                return next;
            });
        }
        setSkillInput('');
    };

    const removeSkill = (skillToRemove) => {
        setForm((prev) => ({
            ...prev,
            skills: prev.skills.filter((skill) => skill !== skillToRemove),
        }));
    };

    const handleSkillKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addSkill();
        }
    };

    const handleGenerateAd = async () => {
        const nextErrors = validateForm(form);
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setStatusMessage('Fyll ut alle obligatoriske felter for a generere en annonse.');
            return;
        }

        if (!form.useAi) {
            setStatusMessage('Aktiver AI-valget for a generere annonsetekst.');
            return;
        }

        if (llmModel === 'google' && !geminiApiKey) {
            setStatusMessage('Mangler miljoverdi: VITE_GEMINI_API_KEY.');
            return;
        }

        setLoading(true);
        setGeneratedAd('');
        setPublishedAdSummary('');
        setStatusMessage('AI skriver utkast til annonse...');

        try {
            const llm = new LLM(llmConfig[llmModel]);
            llm.system(
                'Du er en norsk rekrutteringsassistent som skriver tydelige og profesjonelle stillingsannonser basert pa strukturerte felter.'
            );

            const response = await llm.chat(buildPrompt(form), {
                stream: true,
                max_tokens: 4096,
            });

            let content = '';

            if (response?.stream) {
                for await (const chunk of response.stream) {
                    if (chunk.type !== 'content' || !chunk.content) {
                        continue;
                    }

                    content += chunk.content;
                    setGeneratedAd(content);
                }

                await response.complete();
            } else if (response && typeof response[Symbol.asyncIterator] === 'function') {
                for await (const chunk of response) {
                    if (!chunk) {
                        continue;
                    }

                    content += chunk;
                    setGeneratedAd(content);
                }
            } else {
                content = typeof response === 'string' ? response : response?.content ?? '';
                setGeneratedAd(content);
            }

            setStatusMessage('Annonsen er generert.');
        } catch (error) {
            console.error('Failed to generate recruitment ad', error);
            setStatusMessage('Kunne ikke generere annonse. Kontroller AI-oppsettet og prov igjen.');
        } finally {
            setLoading(false);
        }
    };

    const handlePublishWithoutAi = () => {
        const nextErrors = validateForm(form);
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setStatusMessage('Fyll ut alle obligatoriske felter for a publisere annonsen.');
            return;
        }

        const compensationLabel =
            form.salaryType === 'hourly'
                ? `Timelønn: ${form.compensationAmount} NOK per time`
                : `Fastpris: ${form.compensationAmount} NOK`;

        const summary = [
            `Hovedfokus: ${form.taskFocus}`,
            `Beskrivelse: ${form.description}`,
            `Sted: ${form.location}`,
            `Oppstartsdato: ${formatDate(form.startDate)}`,
            `Sluttdato: ${formatDate(form.endDate)}`,
            `Maks antall timer: ${form.maxHours}`,
            compensationLabel,
            `Ønskede ferdigheter: ${form.skills.join(', ')}`,
            form.internshipCredits
                ? 'Relevant for praksispoeng eller studiepoeng'
                : 'Ikke markert som relevant for praksispoeng eller studiepoeng',
        ].join('\n');

        setGeneratedAd('');
        setPublishedAdSummary(summary);
        setStatusMessage('Annonsen er klar til publisering uten AI.');
    };

    return (
        <div
            style={{
                maxWidth: '1100px',
                margin: '0 auto',
                padding: '32px 20px 56px',
            }}
        >
            {!isCompany ? (
                <div className="ad-card" style={{ padding: '24px', marginBottom: '24px', background: '#fff8e8', borderColor: '#f0d69a' }}>
                    <h2 style={{ marginBottom: '10px', color: '#7a5a10' }}>Bedriftsverktøy</h2>
                    <p style={{ color: '#7a5a10' }}>
                        Dette AI-verktøyet er laget for bedrifter som vil opprette eller publisere praksisannonser. Bytt mock-innlogging
                        på forsiden til bedrift for å teste hele flyten.
                    </p>
                </div>
            ) : null}
            <style>
                {`
          .ad-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
            gap: 24px;
            align-items: start;
          }

          .ad-card {
            background: #ffffff;
            border: 1px solid #d8e5e6;
            border-radius: 20px;
            box-shadow: 0 16px 40px rgba(28, 66, 70, 0.08);
          }

          .ad-field-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .ad-field-full {
            grid-column: 1 / -1;
          }

          .ad-input,
          .ad-select,
          .ad-textarea {
            width: 100%;
            border: 1px solid #bfd0d2;
            border-radius: 12px;
            padding: 12px 14px;
            font: inherit;
            background: #fbfdfd;
            color: #123033;
          }

          .ad-textarea {
            min-height: 120px;
            resize: vertical;
          }

          .ad-input:focus,
          .ad-select:focus,
          .ad-textarea:focus {
            outline: none;
            border-color: #347e84;
            box-shadow: 0 0 0 4px rgba(52, 126, 132, 0.14);
          }

          .ad-chip-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 14px;
          }

          .ad-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            background: #e7f3f4;
            color: #18484c;
            font-size: 0.95rem;
          }

          .ad-chip button {
            border: none;
            background: transparent;
            color: inherit;
            cursor: pointer;
            font-size: 1rem;
            line-height: 1;
          }

          .ad-button {
            border: none;
            border-radius: 12px;
            padding: 14px 18px;
            font: inherit;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
          }

          .ad-button-primary {
            background: linear-gradient(135deg, #347e84 0%, #275d61 100%);
            color: #ffffff;
            box-shadow: 0 12px 28px rgba(52, 126, 132, 0.28);
          }

          .ad-button-secondary {
            background: #eef5f5;
            color: #18484c;
          }

          .ad-button:hover:not(:disabled) {
            transform: translateY(-1px);
          }

          .ad-button:disabled {
            opacity: 0.65;
            cursor: not-allowed;
          }

          .ad-output {
            min-height: 100%;
            background:
              radial-gradient(circle at top right, rgba(52, 126, 132, 0.16), transparent 34%),
              linear-gradient(180deg, #ffffff 0%, #f4fbfb 100%);
          }

          @media (max-width: 920px) {
            .ad-grid,
            .ad-field-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
            </style>

            <div style={{ marginBottom: '28px' }}>
                <p style={{ color: '#347e84', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    AI for stillingsannonse
                </p>
                <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', margin: '10px 0 12px', color: '#123033' }}>
                    Opprett en rekrutteringsannonse med strukturert input
                </h1>
                <p style={{ maxWidth: '780px', color: '#527174', fontSize: '1.05rem' }}>
                    Fyll inn oppdragsinformasjonen under. Når AI er aktivert kan systemet generere et norsk
                    annonseutkast basert pa feltene dere har oppgitt.
                </p>
            </div>

            <div className="ad-grid">
                <div className="ad-card" style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }} htmlFor="llm-model">
                            AI-leverandor
                        </label>
                        <select
                            id="llm-model"
                            className="ad-select"
                            value={llmModel}
                            onChange={(event) => setLlmModel(event.target.value)}
                        >
                            <option value="google">Google Gemini</option>
                            <option value="openai">OpenAI</option>
                        </select>
                    </div>

                    <section style={{ marginBottom: '28px' }}>
                        <h2 style={{ marginBottom: '14px', color: '#123033' }}>Del 1: Grunninformasjon</h2>
                        <div className="ad-field-grid">
                            <label>
                                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Hovedfokus *</span>
                                <input
                                    className="ad-input"
                                    value={form.taskFocus}
                                    onChange={(event) => updateField('taskFocus', event.target.value)}
                                    placeholder="For eksempel Frontend-utvikler"
                                />
                                {errors.taskFocus ? <p style={{ color: '#b42318', marginTop: '6px' }}>{errors.taskFocus}</p> : null}
                            </label>

                            <label>
                                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Sted *</span>
                                <input
                                    className="ad-input"
                                    value={form.location}
                                    onChange={(event) => updateField('location', event.target.value)}
                                    placeholder="For eksempel Oslo"
                                />
                                {errors.location ? <p style={{ color: '#b42318', marginTop: '6px' }}>{errors.location}</p> : null}
                            </label>

                            <label>
                                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Nettside *</span>
                                <input
                                    className="ad-input"
                                    value={form.website}
                                    onChange={(event) => updateField('website', event.target.value)}
                                    placeholder="For eksempel https://www.hiof.no"
                                />
                                {errors.website ? <p style={{ color: '#b42318', marginTop: '6px' }}>{errors.website}</p> : null}
                            </label>

                            <label className="ad-field-full">
                                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Beskrivelse *</span>
                                <textarea
                                    className="ad-textarea"
                                    value={form.description}
                                    onChange={(event) => updateField('description', event.target.value)}
                                    placeholder="Beskriv oppdraget, teamet, malgruppen og hva dere trenger hjelp til."
                                />
                                {errors.description ? (
                                    <p style={{ color: '#b42318', marginTop: '6px' }}>{errors.description}</p>
                                ) : null}
                            </label>

                            <label>
                                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Oppstartsdato *</span>
                                <input
                                    className="ad-input"
                                    type="date"
                                    value={form.startDate}
                                    onChange={(event) => updateField('startDate', event.target.value)}
                                />
                                {errors.startDate ? <p style={{ color: '#b42318', marginTop: '6px' }}>{errors.startDate}</p> : null}
                            </label>

                            <label>
                                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Sluttdato *</span>
                                <input
                                    className="ad-input"
                                    type="date"
                                    value={form.endDate}
                                    onChange={(event) => updateField('endDate', event.target.value)}
                                />
                                {errors.endDate ? <p style={{ color: '#b42318', marginTop: '6px' }}>{errors.endDate}</p> : null}
                            </label>

                            <label>
                                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Maks antall timer *</span>
                                <input
                                    className="ad-input"
                                    type="number"
                                    min="1"
                                    value={form.maxHours}
                                    onChange={(event) => updateField('maxHours', event.target.value)}
                                    placeholder="For eksempel 240"
                                />
                                {errors.maxHours ? <p style={{ color: '#b42318', marginTop: '6px' }}>{errors.maxHours}</p> : null}
                            </label>
                        </div>
                    </section>

                    <section style={{ marginBottom: '28px' }}>
                        <h2 style={{ marginBottom: '14px', color: '#123033' }}>Del 2: Lønn</h2>
                        <div className="ad-field-grid">
                            <label>
                                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Lønnstype *</span>
                                <select
                                    className="ad-select"
                                    value={form.salaryType}
                                    onChange={(event) => updateField('salaryType', event.target.value)}
                                >
                                    <option value="">Velg lønnstype</option>
                                    <option value="hourly">Timelønn</option>
                                    <option value="fixed">Fastpris</option>
                                </select>
                                {errors.salaryType ? (
                                    <p style={{ color: '#b42318', marginTop: '6px' }}>{errors.salaryType}</p>
                                ) : null}
                            </label>

                            <label>
                                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                                    {form.salaryType === 'hourly'
                                        ? 'Timelønn *'
                                        : form.salaryType === 'fixed'
                                            ? 'Fastpris *'
                                            : 'Beløp'}
                                </span>
                                <input
                                    className="ad-input"
                                    type="number"
                                    min="0"
                                    value={form.compensationAmount}
                                    onChange={(event) => updateField('compensationAmount', event.target.value)}
                                    placeholder={
                                        form.salaryType === 'hourly'
                                            ? 'For eksempel 250'
                                            : form.salaryType === 'fixed'
                                                ? 'For eksempel 30000'
                                                : 'Velg lønnstype først'
                                    }
                                    disabled={!form.salaryType}
                                />
                                {errors.compensationAmount ? (
                                    <p style={{ color: '#b42318', marginTop: '6px' }}>{errors.compensationAmount}</p>
                                ) : null}
                            </label>
                        </div>
                    </section>

                    <section style={{ marginBottom: '28px' }}>
                        <h2 style={{ marginBottom: '14px', color: '#123033' }}>Del 3: Ønskede ferdigheter</h2>
                        <div className="ad-field-grid">
                            <label className="ad-field-full">
                                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Ferdigheter *</span>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <input
                                        className="ad-input"
                                        value={skillInput}
                                        onChange={(event) => setSkillInput(event.target.value)}
                                        onKeyDown={handleSkillKeyDown}
                                        placeholder="Skriv en ferdighet og trykk Enter"
                                        style={{ flex: '1 1 260px' }}
                                    />
                                    <button type="button" className="ad-button ad-button-secondary" onClick={addSkill}>
                                        Legg til ferdighet
                                    </button>
                                </div>
                                {errors.skills ? <p style={{ color: '#b42318', marginTop: '6px' }}>{errors.skills}</p> : null}
                            </label>
                        </div>

                        <div className="ad-chip-list">
                            {form.skills.map((skill) => (
                                <span key={skill} className="ad-chip">
                                    {skill}
                                    <button type="button" onClick={() => removeSkill(skill)} aria-label={`Fjern ${skill}`}>
                                        x
                                    </button>
                                </span>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 style={{ marginBottom: '14px', color: '#123033' }}>Del 4: Tilleggsvalg</h2>
                        <div style={{ display: 'grid', gap: '14px' }}>
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '14px',
                                    background: '#f7fbfb',
                                    borderRadius: '14px',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={form.internshipCredits}
                                    onChange={(event) => updateField('internshipCredits', event.target.checked)}
                                />
                                <span>Oppdraget er relevant for praksispoeng eller studiepoeng</span>
                            </label>

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '14px',
                                    background: '#f7fbfb',
                                    borderRadius: '14px',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={form.useAi}
                                    onChange={(event) => updateField('useAi', event.target.checked)}
                                />
                                <span>Bruk AI til a skrive rekrutteringsannonsen</span>
                            </label>
                        </div>
                    </section>

                    <div style={{ marginTop: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="ad-button ad-button-primary"
                            onClick={handleGenerateAd}
                            disabled={loading || !form.useAi}
                        >
                            {loading ? 'Genererer annonse...' : 'Generer annonse med AI'}
                        </button>
                        <button
                            type="button"
                            className="ad-button ad-button-secondary"
                            onClick={handlePublishWithoutAi}
                            disabled={loading}
                        >
                            Publiser uten AI
                        </button>
                        <button
                            type="button"
                            className="ad-button ad-button-secondary"
                            onClick={() => {
                                setForm(initialForm);
                                setSkillInput('');
                                setErrors({});
                                setGeneratedAd('');
                                setPublishedAdSummary('');
                                setStatusMessage('');
                            }}
                            disabled={loading}
                        >
                            Nullstill felter
                        </button>
                    </div>
                </div>

                <aside className="ad-card ad-output" style={{ padding: '24px' }}>
                    <h2 style={{ marginBottom: '12px', color: '#123033' }}>Generert stillingsannonse</h2>
                    <p style={{ color: '#527174', marginBottom: '18px' }}>
                        Her vises utkastet som AI lager basert pa feltene i skjemaet.
                    </p>

                    <div
                        style={{
                            padding: '18px',
                            borderRadius: '16px',
                            background: '#ffffff',
                            border: '1px solid #d8e5e6',
                            minHeight: '420px',
                        }}
                    >
                        {generatedAd ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ children }) => <p style={{ margin: '0 0 10px', color: '#123033' }}>{children}</p>,
                                    ul: ({ children }) => <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>{children}</ul>,
                                    ol: ({ children }) => <ol style={{ paddingLeft: '20px', margin: '0 0 10px' }}>{children}</ol>,
                                    li: ({ children }) => <li style={{ marginBottom: '6px', color: '#123033' }}>{children}</li>,
                                    h1: ({ children }) => <h1 style={{ margin: '0 0 12px', color: '#123033' }}>{children}</h1>,
                                    h2: ({ children }) => <h2 style={{ margin: '18px 0 10px', color: '#123033' }}>{children}</h2>,
                                    h3: ({ children }) => <h3 style={{ margin: '16px 0 8px', color: '#123033' }}>{children}</h3>,
                                    strong: ({ children }) => <strong style={{ color: '#0b2225' }}>{children}</strong>,
                                }}
                            >
                                {generatedAd}
                            </ReactMarkdown>
                        ) : publishedAdSummary ? (
                            <div style={{ whiteSpace: 'pre-wrap', color: '#123033' }}>{publishedAdSummary}</div>
                        ) : (
                            <p style={{ color: '#6b8588' }}>
                                Ingen annonse er generert ennå. Fyll ut skjemaet og trykk på knappen for a hente et AI-utkast.
                            </p>
                        )}
                    </div>

                    <p style={{ marginTop: '16px', color: statusMessage.includes('Kunne ikke') ? '#b42318' : '#527174' }}>
                        {statusMessage}
                    </p>
                </aside>
            </div>
        </div>
    );
}
