// ===== Mobile Menu Toggle =====
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu when a link is clicked
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// ===== Sample Internship Data =====
const sampleInternships = [
    {
        id: 1,
        title: 'Webutvikler - praksisplass',
        company: 'TechCorp AS',
        location: 'Oslo, Norge',
        description: 'Jobb med spennende webprosjekter ved bruk av moderne teknologier som React og Node.js.'
    },
    {
        id: 2,
        title: 'UX/UI Design - praksisplass',
        company: 'DesignStudio',
        location: 'Bergen, Norge',
        description: 'Lag vakre brukergrensesnitt og forbedre brukeropplevelser for mobil og web.'
    },
    {
        id: 3,
        title: 'Data Science - praksisplass',
        company: 'DataInsights',
        location: 'Trondheim, Norge',
        description: 'Analyser data og utvikle maskinlæringsmodeller for å løse reelle forretningsproblemer.'
    }
    ,
    {
        id: 4,
        title: 'DevOps - praksisplass',
        company: 'InfraFlow',
        location: 'Oslo, Norge',
        description: 'Lær automatisering, CI/CD og containerisering med Docker og Kubernetes.'
    },
    {
        id: 5,
        title: 'QA / Test - praksisplass',
        company: 'QualityWorks',
        location: 'Bergen, Norge',
        description: 'Skriv automatiserte tester og bidra til høy kvalitet i leveransene.'
    },
    {
        id: 6,
        title: 'IT-support - praksisplass',
        company: 'HelpDesk AS',
        location: 'Trondheim, Norge',
        description: 'Gi brukerstøtte, feilsøk og lær kundebehandling i praksis.'
    }
];

// ===== Load Latest Internships =====
function loadLatestInternships() {
    const container = document.getElementById('latest-internships');
    if (!container) return;

    // Show only first 3 internships
    const latest = sampleInternships.slice(0, 3);

    container.innerHTML = latest.map(internship => `
        <div class="internship-card">
            <h3>${internship.title}</h3>
            <p class="company">🏢 ${internship.company}</p>
            <p class="location">📍 ${internship.location}</p>
            <p>${internship.description}</p>
            <a href="pages/apply.html" class="btn btn-primary" style="font-size: 0.9rem; padding: 8px 20px;">Søk nå</a>
        </div>
    `).join('');
}

// ===== Contact Form Submission =====
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get form values
        const name = contactForm.querySelector('input[type="text"]').value;
        const email = contactForm.querySelector('input[type="email"]').value;
        const message = contactForm.querySelector('textarea').value;

        // Simple validation
        if (name && email && message) {
            // Simulate form submission
            alert(`Takk ${name}! Meldingen din er sendt. Vi tar kontakt på ${email} snart.`);

            // Reset form
            contactForm.reset();
        } else {
            alert('Vennligst fyll ut alle feltene.');
        }
    });
}

// ===== Initialize on Page Load =====
document.addEventListener('DOMContentLoaded', () => {
    loadLatestInternships();
});

// ===== Smooth Scrolling =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
