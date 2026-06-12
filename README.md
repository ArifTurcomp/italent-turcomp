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
- In production, set `APP_ENV=production` and keep `SEED_DATABASE=false` unless you intentionally need demo seed data.
- Use a strong `DEFAULT_ADMIN_PASSWORD` if you enable seeding outside local development.

## Deploy Frontend To Vercel

Vercel can host the Expo web frontend as a static app. The backend still needs a deployed API and an external database; Vercel does not provide the database service used by this project.

1. Deploy the backend on a service that supports FastAPI plus MySQL access, and set its production environment variables from `backend/.env.example`.
2. In Vercel, create/import a project with `frontend` as the root directory.
3. Add this Vercel environment variable:

```text
EXPO_PUBLIC_API_BASE_URL=https://your-backend-domain.example/api
```

4. Vercel will use `frontend/vercel.json`, run `npm run build`, and publish `dist`.

## Deploy Backend For Free

For a personal prototype, use Render Free for the FastAPI web service and Aiven Free PostgreSQL or MySQL for the database.

1. Create a free Aiven database service.
2. Copy its service URI into Render as `DATABASE_URL`. PostgreSQL URIs that start with `postgres://` and MySQL URIs that start with `mysql://` are supported.

```text
postgres://USER:PASSWORD@HOST:PORT/defaultdb?sslmode=require
mysql://USER:PASSWORD@HOST:PORT/defaultdb?ssl-mode=REQUIRED
```

3. In Render, create a new Blueprint from this GitHub repository. Render will read `render.yaml` and create the `italent-backend` web service from the `backend` folder.
4. Set the required Render secret values when prompted:

```text
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/defaultdb?sslmode=require
# or
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/defaultdb?ssl-mode=REQUIRED
CORS_ORIGINS=https://your-vercel-app.vercel.app
DEFAULT_ADMIN_PASSWORD=use-a-strong-password-here
```

Optional SMTP variables can stay empty for the prototype; password reset tokens will be logged by the backend instead of emailed.

If Render logs `psycopg.OperationalError [Errno -2] Name or service not known`, the backend cannot resolve the hostname inside `DATABASE_URL`. Re-copy the database provider's full service URI into the Render `DATABASE_URL` secret, including the real host, port, database name, and any required SSL query string such as `?sslmode=require`. Do not use placeholder values like `HOST`, `localhost`, Docker service names such as `mysql`, or a private/internal hostname that Render cannot reach.

Render Free services sleep after inactivity, so the first request after a quiet period can be slow.
