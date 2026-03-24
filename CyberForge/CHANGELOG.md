# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- WebSocket support for real-time alerts
- Role-Based Access Control (RBAC) with 4 roles
- Audit logging with security event tracking
- Encryption service for secrets management
- API rate limiting configuration
- Health check endpoints
- Seed script for demo data

### Changed
- Updated NestJS to 10.3
- Improved error handling with global exception filter
- Enhanced security headers via Helmet

### Fixed
- JWT token validation
- CORS configuration for development

---

## [1.0.0] - 2026-01-22

### Added - Backend
- ✅ NestJS 10.3 API with TypeScript strict mode
- ✅ PostgreSQL 16+ database with Prisma ORM
- ✅ JWT authentication with refresh token rotation
- ✅ Token reuse detection via JTI tracking
- ✅ Argon2id password hashing (2^16 memory, 3 time cost)
- ✅ RBAC guards: ADMIN, SECURITY_ANALYST, OPERATOR, VIEWER
- ✅ Input validation with Zod schemas (fail-fast)
- ✅ Global exception filter with sanitized error messages
- ✅ Correlation ID middleware for request tracing
- ✅ Security headers middleware (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- ✅ Rate limiting (100 req/min global, 5 req/min login)
- ✅ AES-256-GCM envelope encryption for secrets
- ✅ Audit logging with CRLF-injection prevention
- ✅ Brute-force detection (>5 failed logins)
- ✅ Token expiry configuration (15 min access, 7-day refresh)
- ✅ Monitoring APIs: Sites, Assets, Sensors, Readings (CRUD)
- ✅ Alert rules & events with threshold evaluation
- ✅ WebSocket gateway for real-time alert streaming
- ✅ Users API with role management
- ✅ Audit log queries with filtering & pagination
- ✅ Seed script with 4 default users + 96 sample readings

### Added - Frontend
- ✅ Next.js 14.1 with App Router and TypeScript
- ✅ TailwindCSS 3.4 with custom theme
- ✅ Zustand state management (auth & alerts stores)
- ✅ Axios HTTP client with token refresh interceptor
- ✅ socket.io-client with WebSocket subscription pattern
- ✅ Login page with form validation & error handling
- ✅ Dashboard with cascading selectors (Site → Asset → Sensor)
- ✅ Real-time alert subscription & acknowledgement
- ✅ Readings display with timestamp & statistics
- ✅ User logout & session management
- ✅ Responsive layout (header, sidebar, main content)

### Added - Infrastructure
- ✅ Docker Compose (dev & prod configurations)
- ✅ Multi-stage Docker builds for API & Web
- ✅ PostgreSQL 16 Alpine with health checks
- ✅ Redis 7 Alpine (optional caching)
- ✅ Nginx reverse proxy (optional, with SSL ready)
- ✅ Database initialization script with extensions
- ✅ Prisma migrations setup

### Added - DevOps
- ✅ GitHub Actions CI/CD pipeline
  - Linting (ESLint)
  - Type checking (TypeScript)
  - Unit tests (Jest)
  - Security scanning (npm audit, Snyk)
  - Docker image building & pushing
  - Staging deployment
  - Production deployment with health checks
  - Slack notifications
- ✅ Configuration management (.env.example with 30+ variables)
- ✅ Database backup script with encryption
- ✅ Health endpoints for Kubernetes readiness/liveness probes

### Added - Documentation
- ✅ Comprehensive README.md with setup, architecture, troubleshooting
- ✅ SECURITY.md: OWASP ASVS Level 2/3 compliance mapping
- ✅ THREAT_MODEL.md: CIA triad, STRIDE analysis, attack scenarios
- ✅ DEPLOYMENT.md: Local, Docker, Kubernetes, AWS, Azure, GCP guides
- ✅ CONTRIBUTING.md: Development workflow, code style, testing
- ✅ Swagger API documentation (auto-generated)

### Added - Configuration
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier for code formatting
- ✅ Jest test framework with Supertest
- ✅ Environment-based configuration via ConfigService
- ✅ Logging with correlation IDs and request tracing

### Security Features
- ✅ TLS 1.3+ ready (nginx config included)
- ✅ HSTS headers (31536000 seconds)
- ✅ CSP headers (default-src 'self')
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Secure, httpOnly, SameSite cookies
- ✅ CORS tightly configured per environment
- ✅ Rate limiting with per-IP tracking
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection (React escaping + CSP)
- ✅ Log injection prevention (CRLF stripping)
- ✅ CSRF protection ready (token validation)
- ✅ Secrets encryption (AES-256-GCM)
- ✅ Password hashing (Argon2id)
- ✅ Token rotation (JTI tracking)
- ✅ Non-root Docker containers
- ✅ Security event logging & auditing

### Database Schema
- ✅ User (with role, password hash, MFA ready)
- ✅ RefreshToken (with JTI for reuse detection)
- ✅ Site (industrial facility)
- ✅ Asset (machinery/equipment)
- ✅ Sensor (data source)
- ✅ SensorReading (time-series data)
- ✅ AlertRule (threshold-based triggers)
- ✅ AlertEvent (fired alerts)
- ✅ AuditLog (security events)
- ✅ Enums: UserRole, AlertSeverity, AlertStatus, AuditEventType

### API Endpoints (45+)
- **Auth** (5): login, refresh, logout, me, changePassword
- **Users** (4): list, get, changeRole, disable
- **Sites** (5): list, create, get, update, delete
- **Assets** (5): list, create, get, update, delete
- **Sensors** (5): list, create, get, update, delete
- **Readings** (5): list, create, getStats, export
- **Alerts** (8): listRules, createRule, listEvents, acknowledge, resolve, stats
- **Audit** (4): queryLogs, summary, suspiciousActivity
- **Health** (1): health check

### Testing
- ✅ Jest configuration with coverage reports
- ✅ Unit test structure for services
- ✅ Integration test structure for APIs
- ✅ Supertest for HTTP testing
- ✅ Database test fixtures

### Performance Optimizations
- ✅ Database connection pooling (5-20 connections)
- ✅ Query caching (5 minutes default)
- ✅ Pagination (max 1000 records per request)
- ✅ Database indexes on frequently queried columns
- ✅ Gzip compression (API & web)
- ✅ Redis caching (optional)

### Monitoring & Logging
- ✅ Request/response logging with correlation IDs
- ✅ Error logging with stack traces (dev only)
- ✅ Security event logging (all audit events)
- ✅ Database query logging (dev only)
- ✅ Health check endpoints
- ✅ Prometheus metrics ready (framework installed)
- ✅ JSON structured logging (for SIEM integration)

### Known Limitations
- ⚠️ MFA not yet implemented (ready for TOTP integration)
- ⚠️ WebSocket authentication not yet enforced
- ⚠️ API key validation not yet implemented
- ⚠️ mTLS not yet implemented (design ready)
- ⚠️ Database encryption at rest not yet enabled (pg_tde compatible)
- ⚠️ Webhook system not yet implemented
- ⚠️ Data export (CSV/JSON) not yet implemented

### Compatibility
- Node.js: 20+ LTS
- PostgreSQL: 14+
- Docker: 20.10+
- Kubernetes: 1.24+
- Browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## Migration Guide

### From v0.x to v1.0.0

1. **Database**: Run migrations
   ```bash
   npx prisma migrate deploy
   ```

2. **Environment**: Update `.env` with new variables from `.env.example`
   ```bash
   cp .env.example .env
   # Edit with your values
   ```

3. **Secrets**: Generate new JWT secrets
   ```bash
   openssl rand -base64 32  # JWT_SECRET
   openssl rand -base64 32  # REFRESH_TOKEN_SECRET
   openssl rand -base64 32  # DATA_KEY_ENCRYPTION_KEY
   ```

4. **Docker**: Update docker-compose.yml to v1.0.0 images
   ```yaml
   image: cyberforge-api:1.0.0
   image: cyberforge-web:1.0.0
   ```

5. **Seed**: Populate demo data (optional)
   ```bash
   npm run seed
   ```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

## Security

For security issues, see [SECURITY.md](docs/SECURITY.md). Do **NOT** open public issues.

---

## License

MIT License - See LICENSE file for details.
