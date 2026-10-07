# Risk & Compliance Innovation Pipeline

React + FastAPI + PostgreSQL application for managing Risk & Compliance innovation initiatives across idea → prototype → MVP → capability demonstrator → solution.

## Stack

- **Frontend:** React (Vite) in `/frontend`
- **Backend:** Python FastAPI in `/backend`
- **Database:** PostgreSQL via Docker Compose
- **AI:** Azure OpenAI (wired in later iterations for Copilot / document intelligence)

## Prerequisites

- Docker Desktop running
- Python 3.11+
- Node.js 20+

## Start database

```bash
docker compose up -d
```

PostgreSQL connection (local default):

- Host: `127.0.0.1:5432`
- Database: `prototype_pipeline`
- User: `postgres`
- Password: `12345`

If using Docker Compose instead, Postgres is published on host port **5434**. Update `DATABASE_URL` accordingly.

## Azure OpenAI (agentic features)

Set these in `backend/.env`:

```
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=YOUR_DEPLOYMENT_NAME
AZURE_OPENAI_API_VERSION=2024-08-01-preview
```

Used by Innovation Pipeline Copilot, document intelligence, and executive summary generation. If unset, the app falls back to portfolio heuristics so demos still work.


1. Create the database (once):

```bash
psql -U postgres -c "CREATE DATABASE prototype_pipeline;"
```

2. Create tables and load seed data:

```bash
cd backend
.\.venv\Scripts\activate
python init_db.py
```

Tables are created automatically; seed loads 30 initiatives plus value streams, teams, and users. Re-running is safe — seed is skipped if data already exists.


```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 9065
```

## Start frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:7065

## API docs

http://localhost:9065/docs
