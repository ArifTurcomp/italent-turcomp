# API Quick Reference

Base URL: `http://localhost:8000/api`

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Departments:

- `GET /departments?page=1&per_page=20`
- `GET /departments/{id}`
- `POST /departments`
- `PUT /departments/{id}`
- `GET /departments/{id}/members`

Contacts:

- `GET /contacts?page=1&per_page=20&department_id=1&status=active&search=Ahmed`
- `GET /contacts/{id}`
- `POST /contacts`
- `PUT /contacts/{id}`
- `DELETE /contacts/{id}`

Jobs:

- `GET /jobs?page=1&per_page=20&department_id=1&status=open`
- `GET /jobs/{id}`
- `POST /jobs`
- `PUT /jobs/{id}`
- `DELETE /jobs/{id}`

Community:

- `GET /community?page=1&per_page=20&category=Announcement`
- `GET /community/{id}`
- `POST /community`
- `PUT /community/{id}`
- `DELETE /community/{id}`
- `POST /community/{id}/like`
