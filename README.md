# Sales Intelligence AI

A lightweight sales analytics demo with a React dashboard and a FastAPI backend. All sales records are synthetic demo data, not real business data.

## Project structure

- `frontend/` — React, TypeScript, Vite, Tailwind CSS, Recharts
- `backend/` — FastAPI, Pandas, scikit-learn, optional Gemini integration

## Run locally

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`. API docs: `http://127.0.0.1:8000/docs`.

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Copy `.env.example` to `.env.local` if needed. For local development, the default API URL is `http://127.0.0.1:8000`.

```bash
npm run dev
```

## Gemini (optional)

Copy `backend/.env.example` to `backend/.env` and set `GEMINI_API_KEY`. The key must stay on the backend and must never be added to frontend variables or committed to GitHub. If Gemini is unavailable, the app displays rule-based insights instead.

## Deploy

### Render (backend)
- Create a new **Web Service** from this repository.
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Add `GEMINI_API_KEY` only in Render environment variables if you want Gemini analysis.
- Add `FRONTEND_ORIGIN` with your Vercel URL, e.g. `https://your-app.vercel.app`.

### Vercel (frontend)
- Import the same repository.
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Add environment variable `VITE_API_URL` with your Render backend URL, without a trailing slash.

## Notes

- Metrics are calculated by Python/Pandas, not by Gemini.
- Isolation Forest flags unusual transactions as potential anomalies, not confirmed fraud.
- The browser stores the latest successful dashboard response in `localStorage` as a fallback.
- All records are synthetic and intended for demonstration only.
