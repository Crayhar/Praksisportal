-- Migrate hardcoded internships to database as published cases
-- First, create a test user and company profile for the hardcoded cases

-- Create test user if it doesn't exist
INSERT IGNORE INTO
    users (
        id,
        email,
        password_hash,
        first_name,
        last_name,
        role
    )
VALUES (
        999,
        'hardcoded@test.local',
        'test',
        'Hardcoded',
        'Test Cases',
        'company'
    );

-- Create company profile for test user
INSERT IGNORE INTO
    company_profiles (user_id, name)
VALUES (999, 'Hardcoded Test Cases');

-- Now insert cases using the test company_id (retrieved via subquery)
INSERT INTO
    cases (
        company_id,
        title,
        task_focus,
        status,
        assignment_context,
        task_description,
        deliveries,
        expectations,
        location,
        start_date,
        end_date,
        max_hours,
        published_at,
        created_at,
        updated_at
    )
SELECT (
        SELECT id
        FROM company_profiles
        WHERE
            user_id = 999
        LIMIT 1
    ),
    'Frontend-praksis for studentportal',
    'Frontend-praksis for studentportal',
    'published',
    'Produktteamet trenger en student som kan jobbe tett med designer og utvikler for å forbedre eksisterende flater.',
    'Du skal videreutvikle komponenter og brukerflyt i en studentportal som brukes av studieadministrasjon og studenter.',
    'Nye React-komponenter, forbedret navigasjon, kort teknisk dokumentasjon.',
    'Du må kunne jobbe iterativt, be om tilbakemeldinger og forklare egne valg i sprintdemo.',
    'Halden, Norge',
    '2026-08-18',
    '2026-12-10',
    240,
    'hourly',
    '255',
    NOW(),
    NOW(),
    NOW()
UNION ALL
SELECT (
        SELECT id
        FROM company_profiles
        WHERE
            user_id = 999
        LIMIT 1
    ),
    'UX-praksis for kommuneapp',
    'UX-praksis for kommuneapp',
    'published',
    'Du blir del av et lite designteam som jobber med innsikt, skisser og iterasjon med kunde.',
    'Bedriften trenger hjelp til å kartlegge brukerreise og lage prototyper for en app som retter seg mot innbyggertjenester.',
    'Brukerreise, wireframes, Figma-prototype og presentasjon.',
    'Vi forventer at du kan ta notater i intervjuer, strukturere innsikt og presentere forslag tydelig.',
    'Oslo, Norge',
    '2026-09-01',
    '2026-11-28',
    180,
    'fixed',
    '30000',
    NOW(),
    NOW(),
    NOW()
UNION ALL
SELECT (
        SELECT id
        FROM company_profiles
        WHERE
            user_id = 999
        LIMIT 1
    ),
    'Dataanalyse-praksis for innsiktsdashboard',
    'Dataanalyse-praksis for innsiktsdashboard',
    'published',
    'Oppdraget passer for en student som vil koble datavask, analyse og enkel visualisering.',
    'Du skal analysere bruksmønstre og sette opp et dashboard som gir teamet bedre beslutningsgrunnlag.',
    'Datasettvask, SQL-spørringer, dashboard og oppsummeringsnotat.',
    'Vi forventer at du dokumenterer antakelser, viser tallgrunnlag og samarbeider med produktleder.',
    'Remote',
    '2026-08-25',
    '2026-12-18',
    220,
    'hourly',
    '270',
    NOW(),
    NOW(),
    NOW()
UNION ALL
SELECT (
        SELECT id
        FROM company_profiles
        WHERE
            user_id = 999
        LIMIT 1
    ),
    'Produktdesign-praksis for analyseverktøy',
    'Produktdesign-praksis for analyseverktøy',
    'published',
    'Teamet trenger designstøtte mellom innsikt, prioritering og prototyping av nye arbeidsflater.',
    'Du skal forbedre brukeropplevelsen i et analyseverktøy med komplekse datavisninger og mange roller.',
    'Designskisser, komponentforslag, brukerflyt og testnotater.',
    'Vi forventer at du kan jobbe tett med utviklere og begrunne designvalg med innsikt.',
    'Remote',
    '2026-09-05',
    '2026-12-05',
    190,
    'fixed',
    '28000',
    NOW(),
    NOW(),
    NOW()
UNION ALL
SELECT (
        SELECT id
        FROM company_profiles
        WHERE
            user_id = 999
        LIMIT 1
    ),
    'Backend-praksis for integrasjoner',
    'Backend-praksis for integrasjoner',
    'published',
    'Du blir del av backendmiljøet og arbeider med datamodell, feilhåndtering og testbarhet.',
    'Oppgaven handler om å utvikle og dokumentere integrasjoner mellom interne tjenester og eksterne API-er.',
    'API-endepunkter, SQL-endringer, testdekning og teknisk dokumentasjon.',
    'Du må kunne stille tekniske spørsmål, lese logger og dokumentere integrasjonsflyt.',
    'Trondheim, Norge',
    '2026-08-19',
    '2026-12-12',
    230,
    'hourly',
    '260',
    NOW(),
    NOW(),
    NOW()
UNION ALL
SELECT (
        SELECT id
        FROM company_profiles
        WHERE
            user_id = 999
        LIMIT 1
    ),
    'Interaksjonsdesign i helseteknologi',
    'Interaksjonsdesign i helseteknologi',
    'published',
    'Oppdraget kombinerer innsiktsarbeid, grensesnittsskisser og validering med brukere og fagpersoner.',
    'Vi leter etter en student som vil forenkle arbeidsflyt og informasjonspresentasjon i et helseteknologisk grensesnitt.',
    'Flytkart, prototype, notater fra validering og anbefalte tiltak.',
    'Du må kunne lytte, oppsummere funn og justere forslag basert på tilbakemeldinger.',
    'Oslo, Norge',
    '2026-09-08',
    '2026-12-03',
    175,
    'fixed',
    '26500',
    NOW(),
    NOW(),
    NOW()
UNION ALL
SELECT (
        SELECT id
        FROM company_profiles
        WHERE
            user_id = 999
        LIMIT 1
    ),
    'Junior produktutvikler for læringsplattform',
    'Junior produktutvikler for læringsplattform',
    'published',
    'Du skal jobbe med forbedringer i plattformen som brukes av studenter og fagansatte.',
    'Bedriften søker en bred studentprofil som kan bidra i krysningspunktet mellom frontend, analyse og brukerinnsikt.',
    'Små produktforbedringer, analyse av bruk, presentasjon til teamet.',
    'Vi forventer at du tar ansvar for egne oppgaver, samarbeider godt og dokumenterer progresjon.',
    'Halden, Norge',
    '2026-08-22',
    '2026-12-15',
    210,
    'hourly',
    '250',
    NOW(),
    NOW(),
    NOW();

-- Now insert the qualifications for each case

-- Frontend-praksis qualifications
INSERT INTO
    case_qualifications (
        case_id,
        qualification_type,
        value
    )
VALUES (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Frontend-praksis for studentportal'
            LIMIT 1
        ),
        'professional',
        'React'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Frontend-praksis for studentportal'
            LIMIT 1
        ),
        'professional',
        'JavaScript'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Frontend-praksis for studentportal'
            LIMIT 1
        ),
        'professional',
        'TypeScript'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Frontend-praksis for studentportal'
            LIMIT 1
        ),
        'professional',
        'CSS'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Frontend-praksis for studentportal'
            LIMIT 1
        ),
        'personal',
        'Samarbeid'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Frontend-praksis for studentportal'
            LIMIT 1
        ),
        'personal',
        'Nysgjerrighet'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Frontend-praksis for studentportal'
            LIMIT 1
        ),
        'personal',
        'Struktur'
    );

-- UX-praksis qualifications
INSERT INTO
    case_qualifications (
        case_id,
        qualification_type,
        value
    )
VALUES (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'UX-praksis for kommuneapp'
            LIMIT 1
        ),
        'professional',
        'Figma'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'UX-praksis for kommuneapp'
            LIMIT 1
        ),
        'professional',
        'Interaksjonsdesign'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'UX-praksis for kommuneapp'
            LIMIT 1
        ),
        'professional',
        'Prototyping'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'UX-praksis for kommuneapp'
            LIMIT 1
        ),
        'professional',
        'Brukerforståelse'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'UX-praksis for kommuneapp'
            LIMIT 1
        ),
        'personal',
        'Kommunikasjon'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'UX-praksis for kommuneapp'
            LIMIT 1
        ),
        'personal',
        'Empati'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'UX-praksis for kommuneapp'
            LIMIT 1
        ),
        'personal',
        'Struktur'
    );

-- Dataanalyse-praksis qualifications
INSERT INTO
    case_qualifications (
        case_id,
        qualification_type,
        value
    )
VALUES (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Dataanalyse-praksis for innsiktsdashboard'
            LIMIT 1
        ),
        'professional',
        'SQL'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Dataanalyse-praksis for innsiktsdashboard'
            LIMIT 1
        ),
        'professional',
        'Dataanalyse'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Dataanalyse-praksis for innsiktsdashboard'
            LIMIT 1
        ),
        'professional',
        'Python'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Dataanalyse-praksis for innsiktsdashboard'
            LIMIT 1
        ),
        'professional',
        'Dashboard'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Dataanalyse-praksis for innsiktsdashboard'
            LIMIT 1
        ),
        'personal',
        'Analytisk tenkning'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Dataanalyse-praksis for innsiktsdashboard'
            LIMIT 1
        ),
        'personal',
        'Struktur'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Dataanalyse-praksis for innsiktsdashboard'
            LIMIT 1
        ),
        'personal',
        'Samarbeidsvilje'
    );

-- Produktdesign-praksis qualifications
INSERT INTO
    case_qualifications (
        case_id,
        qualification_type,
        value
    )
VALUES (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Produktdesign-praksis for analyseverktøy'
            LIMIT 1
        ),
        'professional',
        'Figma'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Produktdesign-praksis for analyseverktøy'
            LIMIT 1
        ),
        'professional',
        'Designsystem'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Produktdesign-praksis for analyseverktøy'
            LIMIT 1
        ),
        'professional',
        'Interaksjonsdesign'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Produktdesign-praksis for analyseverktøy'
            LIMIT 1
        ),
        'professional',
        'Brukertesting'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Produktdesign-praksis for analyseverktøy'
            LIMIT 1
        ),
        'personal',
        'Samarbeid'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Produktdesign-praksis for analyseverktøy'
            LIMIT 1
        ),
        'personal',
        'Nysgjerrighet'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Produktdesign-praksis for analyseverktøy'
            LIMIT 1
        ),
        'personal',
        'Kommunikasjon'
    );

-- Backend-praksis qualifications
INSERT INTO
    case_qualifications (
        case_id,
        qualification_type,
        value
    )
VALUES (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Backend-praksis for integrasjoner'
            LIMIT 1
        ),
        'professional',
        'Node.js'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Backend-praksis for integrasjoner'
            LIMIT 1
        ),
        'professional',
        'SQL'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Backend-praksis for integrasjoner'
            LIMIT 1
        ),
        'professional',
        'API'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Backend-praksis for integrasjoner'
            LIMIT 1
        ),
        'professional',
        'Systemutvikling'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Backend-praksis for integrasjoner'
            LIMIT 1
        ),
        'personal',
        'Nøyaktighet'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Backend-praksis for integrasjoner'
            LIMIT 1
        ),
        'personal',
        'Lærevilje'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Backend-praksis for integrasjoner'
            LIMIT 1
        ),
        'personal',
        'Struktur'
    );

-- Interaksjonsdesign qualifications
INSERT INTO
    case_qualifications (
        case_id,
        qualification_type,
        value
    )
VALUES (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Interaksjonsdesign i helseteknologi'
            LIMIT 1
        ),
        'professional',
        'Interaksjonsdesign'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Interaksjonsdesign i helseteknologi'
            LIMIT 1
        ),
        'professional',
        'Figma'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Interaksjonsdesign i helseteknologi'
            LIMIT 1
        ),
        'professional',
        'Brukerreise'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Interaksjonsdesign i helseteknologi'
            LIMIT 1
        ),
        'professional',
        'Tjenestedesign'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Interaksjonsdesign i helseteknologi'
            LIMIT 1
        ),
        'personal',
        'Empati'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Interaksjonsdesign i helseteknologi'
            LIMIT 1
        ),
        'personal',
        'Kommunikasjon'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Interaksjonsdesign i helseteknologi'
            LIMIT 1
        ),
        'personal',
        'Struktur'
    );

-- Junior produktutvikler qualifications
INSERT INTO
    case_qualifications (
        case_id,
        qualification_type,
        value
    )
VALUES (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Junior produktutvikler for læringsplattform'
            LIMIT 1
        ),
        'professional',
        'React'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Junior produktutvikler for læringsplattform'
            LIMIT 1
        ),
        'professional',
        'SQL'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Junior produktutvikler for læringsplattform'
            LIMIT 1
        ),
        'professional',
        'Interaksjonsdesign'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Junior produktutvikler for læringsplattform'
            LIMIT 1
        ),
        'professional',
        'Prosjektarbeid'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Junior produktutvikler for læringsplattform'
            LIMIT 1
        ),
        'personal',
        'Initiativ'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Junior produktutvikler for læringsplattform'
            LIMIT 1
        ),
        'personal',
        'Samarbeid'
    ),
    (
        (
            SELECT id
            FROM cases
            WHERE
                title = 'Junior produktutvikler for læringsplattform'
            LIMIT 1
        ),
        'personal',
        'Nysgjerrighet'
    );