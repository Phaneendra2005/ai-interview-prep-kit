# AI Interview Prep Kit

Full-Stack Engineering Assessment Project

## 1. Prerequisites
- Node.js (v22.x recommended)
- npm (v10.x+)
- MongoDB (Local instance or MongoDB Atlas)
- Google Gemini API Key

## 2. Install
```bash
npm install
```

## 3. Environment Setup
Create a `.env` file in the root directory based on `.env.example`:
```bash
cp .env.example .env
```
Ensure the variables match your setup (see sections below).

## 4. MongoDB Setup
You can use a local MongoDB daemon or MongoDB Atlas:
1. Create a cluster on MongoDB Atlas or start your local daemon.
2. Update the `MONGO_URI` in `.env`:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?appName=Cluster0
# OR
MONGO_URI=mongodb://localhost:27017/ai_interview_prep_kit
```

## 5. Gemini Setup
1. Obtain an API key from Google AI Studio.
2. Update the `GEMINI_API_KEY` in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## 6. Frontend Startup
To start the Next.js development server:
```bash
npm run dev --workspace=frontend
```
The frontend will be available at `http://localhost:3000`.

## 7. Backend Startup
To start the Express/TypeScript backend server:
```bash
npm run dev --workspace=backend
```
The backend will be available at `http://localhost:8080`.

## 8. Test Command
To run the automated test suite (schema validation, SSRF, auth isolation, etc.):
```bash
npm test
```

## 9. Build Command
To build both frontend and backend for production:
```bash
npm run build
```

## 10. Evaluator Command
To run the batch evaluator against the provided JSON cases:
```bash
npm run evaluate -- --input cases.json --output kits.json
```

## 11. Deployment Instructions
1. **Frontend**: Deploy to Vercel. Provide `NEXT_PUBLIC_API_URL` pointing to your deployed backend.
2. **Backend**: Deploy to Render or Heroku. Provide `MONGO_URI`, `GEMINI_API_KEY`, `SESSION_SECRET`, and set `NODE_ENV=production` to enforce secure cookies. Set `FRONTEND_URL` to the deployed Vercel domain for CORS.

## 12. Architecture
This project is a monorepo consisting of:
- **Backend**: Express API, MongoDB (Mongoose), strict `zod` schema validation, sequential generation engine.
- **Frontend**: Next.js (React), Tailwind CSS, Centralized API client.
- **AI Model**: Google Gemini 3.1 Pro Preview via the official SDK (`@google/genai`).
- **Research Engine**: Dynamic HTML scraping via `axios` and `cheerio` with DuckDuckGo for public discussions.
- **Pipeline**: Extraction -> Research -> Discussions -> Generation -> Coverage -> Scheduling.

## 13. Known Limitations
- **SSRF Protection**: Prevents crawler from hitting `127.0.0.1`, `10.x.x.x`, and loopback via DNS resolution before fetch. Cloud metadata endpoints are blocked.
- **Crawler Tradeoff**: Uses `axios` + `cheerio`. JS-heavy SPAs might return an empty body. Puppeteer was deliberately omitted to maximize speed and minimize memory overhead. A bounded browser fallback could be added later.
- **Session Security**: `HttpOnly`, `secure: true` (in production), and `maxAge` are configured. Memory session store is used in testing, MongoDB store in production/dev.
- **Rate Limits**: Free-tier Gemini keys might quickly hit the `429 Resource Exhausted` error during the batch evaluator. The system handles this via exponential backoff (up to 3 retries) but will gracefully fail if limits are permanently exceeded.
