# CyberForge – Secure Industrial Data Platform

A production-grade, security-hardened industrial IoT monitoring platform demonstrating OWASP security best practices, clean architecture, and real-time threat detection.

## Prerequisites

- **Docker & Docker Compose** 20.10+ (includes compose v2)
- **Node.js** 20+ (for local development without Docker)
- **PostgreSQL** 16+ (included in Docker Compose)
- **Git**

## Quick Start

### 1. Clone & Prepare

```bash
git clone <repo>
cd cyberforge
cp .env.example .env
```

### 2. Run Full Stack

```bash
docker compose up --build
```

This starts:
- **PostgreSQL** (port 5432, `postgres:postgres`)
- **API** (port 3000, with Swagger at http://localhost:3000/api/docs)
- **Web UI** (port 3001, http://localhost:3001)

### 3. Seed Data

Once services are healthy:

```bash
docker compose exec api npm run seed
```

This creates:
- **Default users** (passwords printed to console; save immediately)
  - admin@cyberforge.local / ADMIN role
  - analyst@cyberforge.local / SECURITY_ANALYST role
  - operator@cyberforge.local / OPERATOR role
  - viewer@cyberforge.local / VIEWER role
- **Sample industrial sites, assets, sensors** with simulated readings

### 4. Access

- **Web UI**: http://localhost:3001
  - Login with any seeded user (see step 3 for passwords)
- **API Swagger**: http://localhost:3000/api/docs
- **Database**: `psql postgres://postgres:postgres@localhost:5432/cyberforge_db`

## Architecture

```
cyberforge/
├── apps/
│   ├── api/               # NestJS backend + security controls
│   │   ├── src/
│   │   │   ├── auth/      # JWT, RBAC, session management
│   │   │   ├── monitoring/ # Sites, Assets, Sensors, Readings
│   │   │   ├── alerts/    # Alert rules, events, real-time
│   │   │   ├── audit/     # Audit logging, security events
│   │   │   ├── common/    # Guards, pipes, interceptors
│   │   │   └── config/    # Environment, app settings
│   │   ├── test/          # Integration & unit tests
│   │   ├── prisma/        # DB migrations & schema
│   │   └── package.json
│   │
│   └── web/               # Next.js frontend
│       ├── src/
│       │   ├── app/       # App Router pages
│       │   ├── components/
│       │   ├── lib/       # API client, security utils
│       │   └── hooks/
│       └── package.json
│
├── infra/
│   ├── docker-compose.yml
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   ├── nginx.conf         # Reverse proxy (optional)
│   ├── init.sql           # DB initialization
│   └── .env.example
│
└── docs/
    ├── THREAT_MODEL.md    # CIA triad alignment
    ├── SECURITY.md        # OWASP ASVS mapping
    └── DEPLOYMENT.md      # Production setup
```

## Security Features

✅ **Authentication & Authorization**
- JWT with short-lived access tokens (15 min) + refresh token rotation
- Refresh tokens: hashed (Argon2), stored in DB with jti/revocation tracking
- RBAC: ADMIN, SECURITY_ANALYST, OPERATOR, VIEWER (deny-by-default)
- Token audience/issuer validation, jti deduplication

✅ **Input Validation**
- Strict Zod schemas for all request bodies, query, and route parameters
- Fail-fast validation with sanitized error responses
- SSRF protections on webhook URL fields

✅ **Secure Communication**
- HTTPS enforced in production (via Docker nginx reverse proxy)
- Secure headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- CORS tightly configured per environment
- Rate limiting on all public endpoints (esp. login: 5 req/min per IP)

✅ **Encrypted Storage**
- Application-level envelope encryption for secrets (AES-256-GCM)
- Master key from `DATA_KEY_ENCRYPTION_KEY` env var
- Sensitive fields: webhook secrets, connector credentials, API keys

✅ **Audit Logging**
- Security event logging: auth success/failure, privilege changes, token reuse
- Log sanitization (CR/LF stripping, no sensitive data in fields)
- Tamper-aware storage in PostgreSQL
- JSON console logging for centralized log aggregation

✅ **Attack Detection**
- Brute-force detection: track login failures by IP + username
- Token anomaly detection: refresh token reuse = revocation + alert
- Excessive ingestion rate anomalies
- Real-time WebSocket push to UI for alerts

✅ **Error Handling**
- Generic error messages in responses; stack traces only in development
- Correlation ID middleware (X-Correlation-ID header)
- No sensitive info in error payloads

## Environment Variables

### Root `.env`

```env
# Docker
COMPOSE_PROJECT_NAME=cyberforge

# Postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@db:5432/cyberforge_db

# API
API_PORT=3000
API_LOG_LEVEL=info
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000

# Secrets (generate via: openssl rand -base64 32)
JWT_SECRET=<generate-and-set>
DATA_KEY_ENCRYPTION_KEY=<generate-and-set>
REFRESH_TOKEN_SECRET=<generate-and-set>

# Optional: Redis
REDIS_URL=redis://redis:6379
```

See `.env.example` in each app for detailed options.

## Default Users (After Seed)

**WARNING:** These passwords are one-time. Change immediately in production.

| Email | Role | Initial Password |
|-------|------|------------------|
| admin@cyberforge.local | ADMIN | `<printed during seed>` |
| analyst@cyberforge.local | SECURITY_ANALYST | `<printed during seed>` |
| operator@cyberforge.local | OPERATOR | `<printed during seed>` |
| viewer@cyberforge.local | VIEWER | `<printed during seed>` |

After login, navigate to **Admin > Security Settings** to change password.

## API Overview

### Authentication
- `POST /api/v1/auth/login` – JWT + refresh token
- `POST /api/v1/auth/refresh` – Rotate refresh token
- `POST /api/v1/auth/logout` – Revoke tokens

### Monitoring (RBAC enforced)
- `GET /api/v1/sites` – List sites (VIEWER+)
- `POST /api/v1/sites` – Create site (ADMIN)
- `GET /api/v1/assets?siteId=` – List assets (VIEWER+)
- `POST /api/v1/assets` – Create asset (OPERATOR+)
- `GET /api/v1/sensors?assetId=` – List sensors (VIEWER+)
- `POST /api/v1/readings` – Ingest readings (API key or OAuth)
- `GET /api/v1/readings?sensorId=&from=&to=` – Query readings (VIEWER+)

### Alerts
- `POST /api/v1/alert-rules` – Create rule (SECURITY_ANALYST+)
- `GET /api/v1/alert-events` – List alerts with real-time WebSocket

### Admin
- `GET /api/v1/users` – List users (ADMIN)
- `PATCH /api/v1/users/:id/role` – Change role (ADMIN)

### Audit
- `GET /api/v1/audit-logs` – Query audit events (SECURITY_ANALYST+)

Full OpenAPI spec: http://localhost:3000/api/docs

## Development

### Local Development (without Docker)

```bash
# Backend
cd apps/api
npm install
npm run migrate:dev    # Prisma migrations
npm run seed           # Seed data
npm run dev            # Watch mode (port 3000)

# Frontend (new terminal)
cd apps/web
npm install
npm run dev            # Next.js dev server (port 3001)
```

### Testing

```bash
cd apps/api
npm run test           # Unit tests (Jest)
npm run test:e2e       # Integration tests (Supertest)
npm run test:cov       # Coverage report
```

### Linting & Formatting

```bash
npm run lint           # ESLint
npm run format         # Prettier
npm run type-check     # TypeScript strict
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):
- Lint + type-check on every PR
- Run unit & integration tests
- Build Docker images
- Push to registry (optional)

Trigger: `push` to `main` or `develop`, or `pull_request`

## Troubleshooting

### "Connection refused" on startup
- Check Docker daemon is running: `docker ps`
- Ensure ports 3000, 3001, 5432 are free
- View logs: `docker compose logs -f`

### Migration errors
- Reset DB: `docker compose down -v` then `docker compose up --build`
- Or manually: `docker compose exec api npm run migrate:reset`

### WebSocket connection fails
- Ensure API is accessible at `NEXT_PUBLIC_API_URL`
- Check browser console for CORS errors
- Verify firewall allows WebSocket upgrades

### Seed script errors
- Ensure API is healthy: `docker compose exec api curl http://localhost:3000/health`
- Check DB is ready: `docker compose logs db | grep "ready to accept"`

## Production Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for:
- TLS/HTTPS setup
- Secret rotation strategy
- Database encryption at rest
- Multi-region replication
- Monitoring & alerting integration
- API key rotation
- Backup & disaster recovery

## Security Notes

⚠️ **This is a reference implementation**. For production use:
- [ ] Conduct security audit & penetration testing
- [ ] Implement secrets management (Vault, AWS Secrets Manager)
- [ ] Enable database encryption at rest (pg_tde patch or external encryption)
- [ ] Deploy with TLS certificates
- [ ] Configure DDoS protection (WAF, rate limiting at edge)
- [ ] Set up centralized logging & SIEM integration
- [ ] Implement MFA/OAuth2 for federation
- [ ] Run regular security updates and dependency scanning

See [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) and [docs/SECURITY.md](docs/SECURITY.md) for detailed security controls.

## License

MIT – See LICENSE file.

## Support

Issues? Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) or open a GitHub issue.
