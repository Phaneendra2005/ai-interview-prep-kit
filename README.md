# 🚀 AI Interview Prep Kit

### Full-Stack AI-Powered Interview Preparation Platform

**AI Interview Prep Kit** transforms a job description and company URL into a personalized interview preparation workspace containing:

* 🎯 Extracted job requirements
* 🏢 Company research and brief
* 💼 Role breakdown
* 🧠 Requirement-linked interview questions
* 📚 Technical flashcards
* 📅 Personalized preparation schedule
* 🔄 Coverage analysis and missing-question regeneration
* ✏️ Editable and reorderable interview content
* 🎴 Practice mode with confidence tracking
* 📦 Batch evaluation support

> **Live Demo:**
> https://ai-interview-prep-kit-frontend-zeta.vercel.app/

> **Source Code:**
> https://github.com/Phaneendra2005/ai-interview-prep-kit

---

## 🌐 Live Deployment

| Component    | Deployment                                              |
| ------------ | ------------------------------------------------------- |
| Frontend     | Vercel                                                  |
| Backend      | Render                                                  |
| Database     | MongoDB                                                 |
| AI           | Google Gemini                                           |
| Frontend URL | https://ai-interview-prep-kit-frontend-zeta.vercel.app/ |
| Backend URL  | https://ai-interview-prep-backend-8qt3.onrender.com     |

The production frontend is deployed on Vercel and communicates with the Express backend deployed on Render. Authentication uses secure cross-origin HTTP-only session cookies in production.

---

# ✨ What This Project Does

Preparing for technical interviews often requires manually reading a job description, researching the company, identifying important skills, finding relevant interview questions, and creating a study plan.

**AI Interview Prep Kit automates that workflow.**

The user provides:

1. A job description
2. A company URL
3. The number of preparation days

The system then processes the information through a deterministic pipeline:

```text
Job Description
       ↓
Requirement Extraction
       ↓
Company Research
       ↓
Public Interview Discussion Research
       ↓
Question Generation
       ↓
Coverage Validation
       ↓
Missing Requirement Generation
       ↓
Deterministic Scheduling
       ↓
Personalized Interview Kit
```

The resulting kit can be edited, reordered, regenerated, and practiced directly inside the application.

---

# 🎯 Core Features

## 1. Requirement Extraction

The system analyzes the supplied job description and extracts individual requirements.

Each requirement contains a stable identifier and classification such as:

* Must-have
* Nice-to-have

Requirements are used throughout the pipeline so generated questions can be traced back to the skills they test.

---

## 2. Company Research

The research engine dynamically analyzes the supplied company website.

It can:

* Fetch the provided company URL
* Discover relevant pages dynamically
* Rank useful links
* Extract readable page content
* Build a company brief
* Handle failed or unavailable sources gracefully

The crawler also applies URL safety validation to prevent requests to private or loopback destinations.

---

## 3. Public Interview Research

The system also searches publicly available discussion sources to identify useful interview-related information.

Research failures do not automatically invalidate an otherwise usable kit.

The application is designed to remain honest when research sources are unavailable rather than fabricating company information.

---

## 4. Requirement-Linked Questions

Generated questions are linked to extracted requirements.

This enables the application to determine whether important requirements have actually been covered.

Questions can include:

* Technical questions
* Conceptual questions
* Practical/problem-solving questions
* Role-specific questions

Each question has a stable identifier and requirement mapping.

---

# 🔍 Coverage Validation

One of the core design decisions is that **coverage and scheduling are deterministic application logic rather than decisions made by the LLM.**

The generation pipeline performs a coverage check after generating questions.

If important requirements remain uncovered:

```text
Generated Questions
        ↓
Coverage Check
        ↓
Missing Requirements?
    ↙          ↘
  No            Yes
  ↓              ↓
Continue     Generate Missing Questions
                 ↓
             Coverage Check
                 ↓
              Continue
```

The final kit cannot successfully complete when essential must-have requirements remain uncovered.

This helps prevent an AI-generated kit from appearing complete while silently missing critical job requirements.

---

# ✏️ Builder

Every generated kit can be customized.

Users can:

* Edit questions
* Edit expected answers
* Add questions
* Delete questions
* Pin questions
* Reorder questions
* Edit flashcards
* Modify the company brief
* Modify role information
* Regenerate selected sections
* Regenerate missing coverage

### Preservation During Regeneration

A key implementation requirement is that regeneration should **not destroy user work**.

User-created or edited content is preserved when appropriate, while missing or newly generated content receives stable unique identifiers.

This allows users to treat the generated kit as an editable workspace rather than a disposable AI response.

---

# 🎴 Practice Mode

Practice Mode turns the generated flashcards into an interactive study session.

Users can:

1. View one flashcard at a time
2. Reveal the answer
3. Record confidence
4. Mark cards as covered or uncovered
5. Move through the session
6. Continue practicing weaker areas

Future practice sessions prioritize cards based on previous confidence.

The active session ordering is kept stable while the user is working through it.

---

# 📅 Personalized Schedule

The application creates a day-by-day interview preparation schedule based on the requested number of days.

The schedule contains:

* Preparation day
* Focus areas
* Questions/topics
* Estimated minutes

Schedule allocation is deterministic application logic rather than an LLM-generated arithmetic decision.

The schedule also considers requirement priority so important material can be introduced earlier.

---

# 📦 Batch Evaluator

The application supports batch processing through the required command:

```bash
npm run evaluate -- --input cases.json --output kits.json
```

Input:

```json
[
  {
    "id": "case-1",
    "job_description": "...",
    "company_url": "https://example.com",
    "days": 5
  }
]
```

The evaluator processes multiple cases using the same generation pipeline and continues processing when an individual case fails.

The resulting output is written to the specified JSON file.

---

# 🏗️ Architecture

The project is structured as a monorepo.

```text
ai-interview-prep-kit/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.ts
│   │
│   └── package.json
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
│
├── cases.json
├── kits.json
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Backend

* Node.js
* Express
* TypeScript
* MongoDB
* Mongoose
* Zod
* Google GenAI SDK
* Axios
* Cheerio

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Centralized API client

### AI

* Google Gemini
* Current configured production model: **Gemini 3.5 Flash Lite**

---

# 🔄 Generation Pipeline

The backend intentionally separates the major stages of generation:

```text
1. Extract Requirements
          ↓
2. Research Company
          ↓
3. Retrieve / Clean Pages
          ↓
4. Research Public Discussions
          ↓
5. Generate Questions
          ↓
6. Generate Flashcards
          ↓
7. Validate Coverage
          ↓
8. Generate Missing Questions
          ↓
9. Validate Coverage Again
          ↓
10. Generate Deterministic Schedule
          ↓
11. Validate Final Kit
          ↓
12. Persist Kit
```

This separation makes the generation process easier to reason about, debug, and validate.

---

# 🔐 Security

Security considerations are built into the application.

### Authentication

Users must authenticate before accessing their interview kits.

Kits are associated with their owner so users cannot access another user's data through normal application requests.

### Session Security

Production sessions use:

* HTTP-only cookies
* Secure cookies
* Cross-origin `SameSite=None` configuration where required
* Session expiration

### SSRF Protection

External URLs are validated before crawling.

The application blocks requests targeting private/loopback destinations such as:

```text
127.0.0.1
localhost
10.x.x.x
```

Cloud metadata endpoints are also blocked.

### Generated Content Validation

Generated kit data is validated against the application's expected schema before persistence.

This prevents malformed AI output from being blindly stored.

---

# 🧪 Testing & Validation

The project includes automated validation for important backend behavior, including:

* Schema validation
* SSRF protection
* Authentication isolation
* Schedule allocation
* Coverage checking
* Kit structure validation

Run the test suite with:

```bash
npm test
```

Build the complete application with:

```bash
npm run build
```

---

# 💻 Local Development

## Prerequisites

Install:

* Node.js v22.x
* npm v10+
* MongoDB or MongoDB Atlas
* Google Gemini API key

---

## 1. Clone

```bash
git clone https://github.com/Phaneendra2005/ai-interview-prep-kit.git

cd ai-interview-prep-kit
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment

Create `.env` from the provided example:

```bash
cp .env.example .env
```

Configure the required environment variables.

Example:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ai_interview_prep_kit

GEMINI_API_KEY=your_gemini_api_key_here
```

For production, configure the frontend origin and other required deployment variables according to the environment.

> **Never commit real API keys, database credentials, session secrets, or other sensitive environment variables.**

---

# ▶️ Run Locally

## Start Frontend

```bash
npm run dev --workspace=frontend
```

Frontend:

```text
http://localhost:3000
```

## Start Backend

```bash
npm run dev --workspace=backend
```

Backend:

```text
http://localhost:8080
```

---

# 🏭 Production Build

Build the frontend and backend:

```bash
npm run build
```

The production architecture is:

```text
                 ┌─────────────────────┐
                 │       Vercel        │
                 │   Next.js Frontend  │
                 └──────────┬──────────┘
                            │
                            │ HTTPS API
                            ↓
                 ┌─────────────────────┐
                 │       Render        │
                 │  Express Backend    │
                 └──────────┬──────────┘
                            │
                    ┌───────┴───────┐
                    ↓               ↓
              ┌──────────┐   ┌────────────┐
              │ MongoDB  │   │ Gemini API │
              └──────────┘   └────────────┘
```

---

# ☁️ Deployment

## Frontend

The Next.js application is deployed using Vercel.

Production URL:

**https://ai-interview-prep-kit-frontend-zeta.vercel.app/**

The frontend uses:

```env
NEXT_PUBLIC_API_URL=https://ai-interview-prep-backend-8qt3.onrender.com/api
```

## Backend

The Express backend is deployed using Render.

Production backend:

**https://ai-interview-prep-backend-8qt3.onrender.com**

Production environment configuration includes:

```env
NODE_ENV=production
MONGO_URI=...
GEMINI_API_KEY=...
FRONTEND_URL=...
```

---

# ⚙️ Important Engineering Decisions

## Deterministic Coverage

The LLM generates content, but the application determines whether requirements are covered.

This avoids relying on an LLM to make the final coverage decision.

## Deterministic Scheduling

The LLM does not perform the final schedule arithmetic.

The application allocates preparation content across the requested number of days.

## Stable IDs

Questions and flashcards use stable unique identifiers.

This is particularly important for:

* Editing
* Reordering
* Pinning
* Deleting
* Regeneration
* React rendering
* Persistence

## User-Controlled Content Preservation

Regeneration is designed around the principle:

> **AI can generate new content without destroying content the user already created or edited.**

---

# 🚧 Known Limitations

### JavaScript-Heavy Websites

The research crawler currently uses HTTP retrieval and HTML parsing.

Some JavaScript-heavy websites may return limited content because the application does not launch a full browser for every crawl.

This was a deliberate trade-off to keep research fast and resource-efficient.

### Gemini Rate Limits

Free-tier Gemini API keys may encounter:

```text
429 Resource Exhausted
```

during large batch runs.

The application uses retry/backoff behavior and gracefully reports failures when the API limit cannot be recovered.

### Research Availability

Some companies may have:

* No accessible hiring page
* Very limited public information
* Restricted robots policies
* Temporarily unavailable pages

The application is designed to report these limitations rather than fabricate research.

---

# 🎥 Project Walkthrough

The application can be demonstrated through the production deployment:

**Live Application:**
https://ai-interview-prep-kit-frontend-zeta.vercel.app/

The walkthrough demonstrates:

1. Creating an interview kit
2. Requirement extraction
3. Company research
4. AI question generation
5. Coverage validation
6. Editing and reordering
7. Regeneration while preserving user changes
8. Flashcard practice
9. Confidence tracking
10. Personalized preparation schedule

---

# 📌 Assessment Highlights

This project focuses on the engineering problem of building a reliable AI-powered workflow rather than simply displaying an
