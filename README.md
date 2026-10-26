# Sales Intelligence AI

AI-powered sales analytics demo. All data is **synthetic, AI-generated demo data**.
Currently at **Phase 1: project setup** (health endpoint + frontend connection check).

## Run the backend (from `backend/`)
```bash
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env              # Windows: copy ..\.env.example .env
uvicorn app.main:app --reload --port 8000
```
Open http://localhost:8000/health and http://localhost:8000/docs

## Run the frontend (from `frontend/`)
```bash
cp .env.example .env                 # Windows: copy .env.example .env
npm install
npm run dev
```
Open http://localhost:5173

## Run backend tests (from `backend/`)
```bash
pytest
```

## Deploy
**Backend (Render Web Service):** Root Directory `backend`; Build `pip install -r requirements.txt`;
Start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; env vars `ALLOWED_ORIGINS` (frontend URL), `GEMINI_API_KEY`, `GEMINI_MODEL`.

**Frontend (Vercel):** Root Directory `frontend`; env var `VITE_API_BASE_URL` = Render backend URL.
Then set `ALLOWED_ORIGINS` on Render to the Vercel URL.
