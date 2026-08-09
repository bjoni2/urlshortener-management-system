# URL Shortening and Management System

## Task requirements covered

- User registration and login
- Roles: User and Administrator
- URL shortening with optional custom alias
- Public redirect from short URL to original URL
- User URL list with search, filter, sort, pagination
- Edit expiration and activate/deactivate links
- Delete links
- Expired links stop redirecting and are marked by scheduled expiration logic
- Click count and last accessed timestamp tracking
- User dashboard stats (total, active, expired, total clicks)
- Admin users list and activate/deactivate accounts
- Admin list of all short URLs
- Angular form validation and error messages
- Protected pages for authenticated users
- REST API + Swagger documentation

## Run project

### Backend (H2 profile)

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=h2
```

Backend URL: `http://localhost:8080`

Swagger: `http://localhost:8080/swagger-ui.html`

### Frontend

```bash
cd frontend
npm install
ng serve
```

Frontend URL: `http://localhost:4200`

## Admin account (default)

- Email: `admin@urlshortener.local`
- Password: `Admin123!`
