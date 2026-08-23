# Team-AURA
team ID HS2026-097
PS3

# ScamCheck Backend

Opportunity verification API. Java 21, Spring Boot 3.3, MySQL, JWT auth.

## Run locally with Docker
```
docker compose up --build
```
API available at http://localhost:8080
Swagger UI at http://localhost:8080/swagger-ui.html

## Run locally without Docker
1. Start a local MySQL instance, create a `scamcheck` database and user matching `application.yml`.
2. Set the `DB_PASSWORD` environment variable to your MySQL password.
3. `./mvnw spring-boot:run`

## Try it
```
POST /api/auth/register
POST /api/auth/login          -> returns JWT
POST /api/opportunities       -> submit + get analysis (Bearer token required)
GET  /api/opportunities/{id}
GET  /api/opportunities/{id}/analysis
GET  /api/opportunities
```

## Adding a new detector
1. Create a class in `analyzer/` implementing `RiskDetector`.
2. Annotate it `@Component`.
3. Add a seed row for its indicator code in `V2__seed_indicators.sql` (or a new migration) -- optional, it will auto-create on first match if missing.

No existing code needs to change.
