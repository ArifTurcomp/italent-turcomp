# API Quick Reference

Base URL: `http://localhost:8000/api`

Most endpoints require `Authorization: Bearer <access_token>`.

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/social-login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`
- `POST /auth/email-verification/request`
- `POST /auth/email-verification/confirm`
- `PUT /auth/2fa`

Users / Profiles:

- `GET /users`
- `GET /users/me`
- `PUT /users/me`
- `GET /users/{id}/profile`
- `PUT /users/me/profile`
- `PUT /users/me/privacy`
- `POST /users/{id}/follow`
- `DELETE /users/{id}/follow`
- `POST /users/{id}/endorse`
- `GET /users/{id}/endorsements`
- `POST /users/{id}/recommendations`
- `GET /users/{id}/recommendations`

Departments / People:

- `GET /departments?page=1&per_page=20`
- `GET /departments/{id}`
- `POST /departments`
- `PUT /departments/{id}`
- `GET /departments/{id}/members`
- `GET /contacts?page=1&per_page=20&department_id=1&status=active&search=AWS`
- `GET /contacts/{id}`
- `POST /contacts`
- `PUT /contacts/{id}`
- `DELETE /contacts/{id}`

Communities / Membership:

- `GET /communities?category=Engineering&search=cloud`
- `GET /communities/categories`
- `POST /communities`
- `GET /communities/{id}`
- `PUT /communities/{id}`
- `POST /communities/{id}/join`
- `POST /communities/{id}/leave`
- `GET /communities/{id}/members?status=active`
- `POST /communities/{id}/members`
- `PUT /communities/{id}/members/{user_id}/role`
- `PUT /communities/{id}/members/{user_id}/status`
- `POST /communities/{id}/announcements`

Posts / Engagement:

- `GET /community?page=1&per_page=20&category=Mentorship`
- `GET /community/{id}`
- `POST /community`
- `PUT /community/{id}`
- `DELETE /community/{id}`
- `POST /community/{id}/like`
- `POST /community/{id}/react`
- `POST /community/{id}/bookmark`
- `POST /community/{id}/poll-vote`
- `POST /community/{id}/share`
- `PUT /community/{id}/schedule`
- `PUT /community/{id}/pin`
- `GET /community/{id}/comments`
- `POST /community/{id}/comments`
- `PUT /community/comments/{id}`
- `DELETE /community/comments/{id}`
- `GET /bookmarks`
- `POST /reports`

Networking / Discovery:

- `GET /connections?status=pending`
- `POST /connections/request`
- `PUT /connections/{id}/respond`
- `GET /connections/mutual/{user_id}`
- `GET /discovery/suggestions`
- `GET /discovery/match?industry=data&interest=python&alumni_department_id=1&nearby=Kuala%20Lumpur`

Forum / Knowledge:

- `GET /forum/topics?tag=python`
- `POST /forum/topics`
- `GET /forum/threads?topic_id=1&tag=qa`
- `POST /forum/threads`
- `GET /forum/threads/{id}/replies`
- `POST /forum/threads/{id}/replies`
- `PUT /forum/threads/{id}/best-answer/{reply_id}`
- `POST /forum/{thread|reply}/{id}/vote`
- `GET /knowledge?item_type=faq&tag=cloud`
- `POST /knowledge`

Messages / Chat:

- `GET /messages?page=1&per_page=20&with_user_id=2`
- `POST /messages`
- `GET /messages/search?q=meeting`
- `PUT /messages/{id}/read`
- `GET /chats`
- `POST /chats`
- `GET /chats/{id}/messages`
- `POST /chats/{id}/messages`

Events:

- `GET /events?page=1&per_page=20&event_type=Workshop&status=scheduled`
- `GET /events/{id}`
- `POST /events`
- `PUT /events/{id}`
- `DELETE /events/{id}`
- `GET /events/{id}/rsvps`
- `POST /events/{id}/rsvp`
- `GET /calendar/events?start=2026-07-01&end=2026-07-31`
- `POST /events/{id}/reminder`

Learning / Mentorship:

- `GET /learning?item_type=course&skill=Python`
- `POST /learning`
- `POST /mentorship/profiles`
- `GET /mentorship/matches?skill=AWS`
- `POST /mentorship/sessions`
- `PUT /mentorship/sessions/{id}/progress`

Jobs / Career:

- `GET /jobs?page=1&per_page=20&department_id=1&status=open`
- `GET /jobs/{id}`
- `POST /jobs`
- `PUT /jobs/{id}`
- `DELETE /jobs/{id}`
- `POST /jobs/{id}/apply`
- `GET /jobs/{id}/applications`
- `POST /jobs/{id}/save`
- `GET /career/saved-jobs`
- `GET /career/job-recommendations`
- `GET /career/job-alerts`
- `POST /career/job-alerts`
- `GET /career/tools`

Notifications:

- `GET /notifications?unread_only=true`
- `POST /notifications`
- `PUT /notifications/{id}/read`
- `PUT /notifications/read-all`
- `GET /notifications/settings`
- `PUT /notifications/settings`

Search / Analytics / Reputation:

- `GET /search?q=python`
- `GET /analytics/me`
- `GET /analytics/communities/{id}`
- `GET /reputation/{user_id}`
- `GET /reputation/leaderboard/top-contributors`
- `POST /reputation/events`
- `POST /reputation/badges`

Admin / Moderation:

- `GET /reports?status=open`
- `PUT /reports/{id}`
- `PUT /admin/users/{id}/status`
- `PUT /admin/users/{id}/role`
- `POST /admin/moderation/spam-check`
- `GET /admin/audit-logs`

AI Helpers:

- `GET /ai/connection-suggestions`
- `GET /ai/mentor-matches?skill=Python`
- `GET /ai/career-recommendations`
- `POST /ai/post-generation`
- `POST /ai/post-summarization`
- `GET /ai/discussion-insights`
- `GET /ai/knowledge-search?q=cloud`
