# Praksiportal - School Internship Portal

A simple and professional internship portal template for schools, built with HTML, CSS, and vanilla JavaScript.

## 📁 Project Structure

```
Prakisportal/
├── index.html              # Main homepage
├── css/
│   └── styles.css         # All styling (color: #347e84)
├── js/
│   └── script.js          # JavaScript functionality
├── pages/
│   ├── internships.html   # All internships listing with search
│   └── apply.html         # Application form
├── assets/                # Empty folder for images/media
└── README.md             # This file
```

## 🎨 Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Navigation Bar**: Fixed sticky navbar with mobile hamburger menu (color: #347e84)
- **Hero Section**: Eye-catching welcome section with call-to-action
- **Features Section**: Highlights of the portal
- **Internship Listings**: Browse and search internship opportunities
- **Application Form**: Easy-to-use form for applying to internships
- **Contact Section**: Contact form for inquiries
- **Footer**: Professional footer with links
- **Mobile Menu**: Responsive hamburger menu for mobile devices
- **Search Functionality**: Real-time search for internships

## 🎯 Colors

- **Primary Color**: `#347e84` (Teal/Dark Cyan)
  - Used for: Navbar, buttons, borders, accents
- **Secondary Color**: `#f9f9f9` (Light Gray)
  - Used for: Background sections
- **Text Dark**: `#333`
- **Text Light**: `#666`

## 📝 How to Use

1. **Open the Portal**: Open `index.html` in your web browser
2. **Navigate**: Use the navigation menu to explore different sections
3. **Search Internships**: Go to the "Internships" page and use the search bar
4. **Apply**: Fill out the application form on the "Apply" page
5. **Contact**: Submit a message using the contact form on the homepage

## 🔧 Customization

### Change Color Scheme

Edit the root variables in `css/styles.css`:

```css
:root {
  --primary-color: #347e84; /* Change this color */
  --secondary-color: #f9f9f9;
  /* ... other colors ... */
}
```

### Add More Internships

Edit the internship data in:

- `pages/internships.html` (in the `<script>` section)
- `js/script.js` (in the `sampleInternships` array)

### Add Company Logo

Place images in the `assets/` folder and reference them:

```html
<img src="assets/logo.png" alt="Company Logo" />
```

## 📱 Features Breakdown

### index.html

- Welcome hero section
- Feature cards highlighting portal benefits
- Latest internships preview
- Call-to-action section
- Contact form
- Footer with links

### pages/internships.html

- Full list of all available internships
- Real-time search functionality
- Filter by title, company, or location
- Internship cards with details
- Apply buttons

### pages/apply.html

- Comprehensive application form
- Personal information section
- Application details section
- Additional information checkboxes
- Form validation
- Success message on submission

### css/styles.css

- Global styling with CSS variables
- Responsive grid layouts
- Smooth transitions and hover effects
- Mobile-first design approach
- Professional typography
- Accessibility considerations

### js/script.js

- Mobile menu toggle functionality
- Sample internship data
- Dynamic internship loading
- Contact form submission handling
- Smooth scrolling
- Form validation

## 🚀 Getting Started

1. Download or clone this folder to your local machine
2. Open `index.html` in any modern web browser
3. No additional dependencies or build tools required!
4. All code is vanilla HTML, CSS, and JavaScript

## 💡 Tips for Extension

- Add a database backend using Node.js/Express or Python/Flask
- Implement user authentication for login/registration
- Add image upload for CV/portfolio
- Integrate email notifications
- Add more detailed internship pages with company info
- Create user dashboard for tracking applications
- Add analytics and admin panel

## 📄 License

Free to use and modify for your school's needs.

## 🎓 Notes

- No external libraries or frameworks required
- Fast loading times
- SEO-friendly structure
- Fully responsive and mobile-friendly
- Clean, maintainable code
- Easy to customize and extend

---

Created for schools looking for a simple yet professional internship portal solution.
