# Turcomp iTalent

Talent management app scaffold with:

- React Native / Expo frontend
- Redux Toolkit state management
- FastAPI backend with auth, contacts, departments, jobs, and community endpoints
- MySQL database through Docker Compose
- Seed data for local development

## Environment Files

There are two `.env.example` files on purpose:

- `frontend/.env.example` is for Expo public app variables only.
- `backend/.env.example` is for backend/server variables, including `DATABASE_URL`.

## Run With Docker

```bash
docker compose up --build -d
```

Services:

- Frontend API target: `http://localhost:8000/api`
- Backend API docs: `http://localhost:8000/docs`
- MySQL host port: `localhost:3307`
- MySQL database: `italent_db`
- MySQL user: `italent`
- MySQL password: `italent_password`

## Run Backend Without Docker

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Set `DATABASE_URL` first if you run outside Docker:

```text
mysql+pymysql://italent:italent_password@localhost:3307/italent_db
```

API docs are available at `http://localhost:8000/docs`.

Default login:

```text
admin@turcomp.com
password123
```

## Run Frontend

```bash
cd frontend
npm install
npm start
```

The frontend reads `EXPO_PUBLIC_API_BASE_URL`; by default it uses:

```text
http://localhost:8000/api
```

For Android emulator, set it to `http://10.0.2.2:8000/api`.

## Implemented Frontend Files

- `frontend/src/screens/MainTabsScreen.js`
- `frontend/src/screens/DashboardScreen.js`
- `frontend/src/screens/DepartmentsScreen.js`
- `frontend/src/screens/LoginScreen.js`
- `frontend/src/screens/RegisterScreen.js`
- `frontend/src/screens/ContactsScreen.js`
- `frontend/src/screens/ContactDetailsScreen.js`
- `frontend/src/screens/AddContactScreen.js`
- `frontend/src/screens/JobsScreen.js`
- `frontend/src/screens/CommunityScreen.js`
- `frontend/src/components/ContactCard.js`
- `frontend/src/components/JobCard.js`
- `frontend/src/components/CommunityPostCard.js`
- `frontend/src/components/FormInput.js`
- `frontend/src/components/LoadingSpinner.js`
- `frontend/src/store/store.js`
- `frontend/src/services/api.js`
