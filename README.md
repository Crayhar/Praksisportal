# Praksisportal

A web application for managing student internship placements, built as a bachelor's thesis project. Students can browse internship listings, apply, and manage their profile — while companies can publish opportunities and review applicants.

---

## Tech Stack

| Layer          | Technology                     |
| -------------- | ------------------------------ |
| Frontend       | React 19, Vite, React Router   |
| Backend        | Node.js, Express               |
| Database       | MySQL                          |
| Auth           | JWT, bcryptjs                  |
| AI             | Gemini API and Ollama(chatbot) |
| PDF generation | jsPDF                          |
| Deployment     | Vercel (frontend)              |

---

## Project Structure

```
Praksisportal/
├── src/                  # Frontend (React)
│   ├── pages/            # Route-level components
│   ├── components/       # Shared UI components
│   ├── contexts/         # React context providers
│   ├── utils/            # Helper functions
│   └── data/             # Static data
├── backend/              # Backend (Express)
│   └── src/
│       ├── controllers/  # Route handlers
│       ├── routes/       # API route definitions
│       ├── middleware/    # Auth and other middleware
│       └── server.js     # Entry point
└── backup.sql            # Database schema/backup
```

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- MySQL

### 1. Clone the repository

```bash
git clone <repo-url>
cd Praksisportal
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

Create a `.env` file in `backend/`:

```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=praksisportal
JWT_SECRET=your_jwt_secret
```

### 3. Set up the database

```bash
mysql -u root -p < backup.sql
```

### 4. Install dependencies and run

**Frontend:**

```bash
npm install
npm run dev
```

**Backend:**

```bash
cd backend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:3000` by default.

But it is also currently hosted on Vercel. The webiste is: `https://praksisportalen.vercel.app/`

---

## Features

- User registration and login (JWT-based auth)
- Student profile management
- Browse and search internship listings
- Apply for internships
- Company public profile pages
- AI-powered chatbot assistant
- PDF export

---
