# API Quick Reference

Base URL: `http://localhost:8000/api`

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Departments / Groups:

- `GET /departments?page=1&per_page=20`
- `GET /departments/{id}`
- `POST /departments`
- `PUT /departments/{id}`
- `GET /departments/{id}/members`

Contacts / People:

- `GET /contacts?page=1&per_page=20&department_id=1&status=active&search=AWS`
- `GET /contacts/{id}`
- `POST /contacts`
- `PUT /contacts/{id}`
- `DELETE /contacts/{id}`

Mentorship / Coaching Offers:

- `GET /jobs?page=1&per_page=20&department_id=1&status=open`
- `GET /jobs/{id}`
- `POST /jobs`
- `PUT /jobs/{id}`
- `DELETE /jobs/{id}`

Community:

- `GET /community?page=1&per_page=20&category=Mentorship`
- `GET /community/{id}`
- `POST /community`
- `PUT /community/{id}`
- `DELETE /community/{id}`
- `POST /community/{id}/like`

Community reads and likes are public to authenticated users. Updates and deletes remain limited to the post author.
