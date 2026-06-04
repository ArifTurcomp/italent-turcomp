# Turcomp iTalent

Turcomp iTalent is a talent management app scaffold with a React Native / Expo frontend, a FastAPI backend, and a MySQL database for local development.

## Stack

- React Native / Expo
- Redux Toolkit
- FastAPI
- SQLAlchemy
- MySQL
- Docker Compose

## Project Structure

```text
backend/    FastAPI app, API routes, database models, and seed data
frontend/   Expo app, screens, components, state, and API client
docs/       API documentation and project notes
```

## Environment

This project uses separate environment examples for frontend and backend configuration:

- `frontend/.env.example` contains public Expo variables only.
- `backend/.env.example` contains backend/server variables.

Create local `.env` files from those examples when needed. Do not commit real `.env` files or production credentials.

## Run With Docker

```bash
docker compose up --build -d
```

Useful local URLs:

- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Frontend API target: `http://localhost:8000/api`
- MySQL host port: `localhost:3307`

## Run Backend Without Docker

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

If you run the backend outside Docker, configure `DATABASE_URL` in your local backend environment first.

## Run Frontend

```bash
cd frontend
npm install
npm start
```

The frontend reads `EXPO_PUBLIC_API_BASE_URL`. For an Android emulator, point it to `http://10.0.2.2:8000/api`.

## Security Notes

- Keep real credentials in local `.env` files or deployment secrets.
- Never commit production database passwords, SMTP passwords, API keys, or private keys.
- The committed `.env.example` files are templates only.
