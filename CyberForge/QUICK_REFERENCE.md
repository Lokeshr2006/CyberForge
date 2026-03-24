# CyberForge Quick Reference

## 🚀 Quick Start

### Local Development (Docker)
```bash
# Clone and setup
git clone https://github.com/cyberforge/cyberforge.git
cd cyberforge

# Start services
docker compose up --build

# In another terminal: migrations & seed
docker compose exec api npx prisma migrate dev
docker compose exec api npm run seed

# Open browser
open http://localhost:3001
```

### Without Docker (Local DB)
```bash
# Prerequisites: PostgreSQL on localhost:5432
createdb cyberforge

npm install
cd apps/api && npm install && npm run dev &
cd apps/web && npm install && npm run dev
```

**Login**: `admin@cyberforge.local` (password from seed output)

---

## 📊 Architecture Overview

```
Browser → Next.js (3001) → NestJS API (3000) → PostgreSQL (5432)
          ↓                    ↓                
      Zustand State      Prisma ORM
      socket.io-client   Redis Cache
```

---

## 🔐 Security Checklist

- ✅ JWT with short expiry (15 min) + refresh rotation (7 days)
- ✅ Token reuse detection (JTI tracking)
- ✅ Argon2id password hashing
- ✅ RBAC: 4 roles (ADMIN > SECURITY_ANALYST > OPERATOR > VIEWER)
- ✅ Input validation (Zod schemas)
- ✅ Rate limiting (5 req/min login, 100 req/min global)
- ✅ AES-256-GCM encryption for secrets
- ✅ Audit logging with security events
- ✅ HSTS, CSP, X-Frame-Options headers
- ✅ Secure cookies (httpOnly, Secure, SameSite)

---

## 📝 API Reference

### Authentication
```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cyberforge.local","password":"PASSWORD"}'
# Response: {accessToken, refreshToken, user}

# Refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Authorization: Bearer REFRESH_TOKEN"

# Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Current user
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### Sites (Industrial Facilities)
```bash
# List sites
curl http://localhost:3000/api/v1/sites \
  -H "Authorization: Bearer TOKEN"

# Create site
curl -X POST http://localhost:3000/api/v1/sites \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Factory A","location":"NYC","latitude":40.7128,"longitude":-74.0060}'

# Get site details
curl http://localhost:3000/api/v1/sites/{siteId} \
  -H "Authorization: Bearer TOKEN"
```

### Assets (Machinery)
```bash
# List assets for site
curl http://localhost:3000/api/v1/sites/{siteId}/assets \
  -H "Authorization: Bearer TOKEN"

# Create asset
curl -X POST http://localhost:3000/api/v1/sites/{siteId}/assets \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Pump-01","assetType":"pump","status":"operational"}'
```

### Sensors (Data Sources)
```bash
# List sensors for asset
curl http://localhost:3000/api/v1/assets/{assetId}/sensors \
  -H "Authorization: Bearer TOKEN"

# Create sensor
curl -X POST http://localhost:3000/api/v1/assets/{assetId}/sensors \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Temperature","sensorType":"temperature","unit":"celsius"}'
```

### Readings (Time-series Data)
```bash
# Ingest reading
curl -X POST http://localhost:3000/api/v1/readings \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sensorId":"UUID","value":42.5}'

# Query readings
curl 'http://localhost:3000/api/v1/sensors/{sensorId}/readings?limit=100&offset=0' \
  -H "Authorization: Bearer TOKEN"

# Get statistics
curl 'http://localhost:3000/api/v1/sensors/{sensorId}/stats?from=2026-01-01&to=2026-01-31' \
  -H "Authorization: Bearer TOKEN"
```

### Alerts
```bash
# Create alert rule
curl -X POST http://localhost:3000/api/v1/alert-rules \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"High Temp Alert",
    "sensorId":"UUID",
    "condition":{"type":"threshold","threshold":80,"operator":">"},
    "severity":"HIGH"
  }'

# List alert events
curl http://localhost:3000/api/v1/alerts/events \
  -H "Authorization: Bearer TOKEN"

# Acknowledge alert
curl -X PATCH http://localhost:3000/api/v1/alerts/events/{alertId}/acknowledge \
  -H "Authorization: Bearer TOKEN"

# WebSocket (real-time alerts)
# Connect to ws://localhost:3000/socket.io/?transport=websocket
# Listen for 'alert-triggered' events
```

### Users (Admin)
```bash
# List users
curl http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Change user role
curl -X PATCH http://localhost:3000/api/v1/users/{userId}/role \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"OPERATOR"}'

# Disable user
curl -X PATCH http://localhost:3000/api/v1/users/{userId}/disable \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Audit Logs (Security)
```bash
# Query logs
curl 'http://localhost:3000/api/v1/audit-logs?eventType=AUTH_LOGIN_FAILURE' \
  -H "Authorization: Bearer SECURITY_ANALYST_TOKEN"

# Get summary
curl http://localhost:3000/api/v1/audit/summary \
  -H "Authorization: Bearer TOKEN"

# Suspicious activity
curl http://localhost:3000/api/v1/audit/suspicious-activity \
  -H "Authorization: Bearer TOKEN"
```

---

## 🐳 Docker Commands

```bash
# Start services
docker compose up --build

# Stop services
docker compose down

# View logs
docker compose logs -f api
docker compose logs -f web
docker compose logs -f db

# Execute command in container
docker compose exec api npm run test
docker compose exec db psql -U cyberforge cyberforge

# Rebuild without cache
docker compose build --no-cache api

# Access PostgreSQL
docker compose exec db psql -U cyberforge cyberforge

# Backup database
docker compose exec db pg_dump -U cyberforge cyberforge > backup.sql

# Restore database
docker compose exec -T db psql -U cyberforge cyberforge < backup.sql
```

---

## 📚 File Structure

```
CyberForge/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/          # Authentication
│   │   │   ├── users/         # User management
│   │   │   ├── monitoring/    # Sites, assets, sensors, readings
│   │   │   ├── alerts/        # Alert rules & events
│   │   │   ├── audit/         # Audit logging
│   │   │   ├── common/        # Middleware, guards, filters
│   │   │   ├── config/        # Configuration
│   │   │   └── database/      # Prisma ORM
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # Database schema
│   │   │   └── seed.ts        # Seed script
│   │   ├── test/              # Tests
│   │   └── package.json
│   │
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/           # Pages & layouts
│       │   ├── components/    # React components
│       │   └── lib/           # API client, stores, utils
│       ├── public/            # Static assets
│       └── package.json
│
├── infra/                      # Infrastructure
│   ├── Dockerfile.api         # API container
│   ├── Dockerfile.web         # Web container
│   ├── init.sql               # Database init
│   ├── nginx.conf             # Nginx config
│   └── ssl/                   # SSL certificates
│
├── docs/                       # Documentation
│   ├── SECURITY.md            # OWASP compliance
│   ├── THREAT_MODEL.md        # Risk analysis
│   └── DEPLOYMENT.md          # Deployment guides
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # GitHub Actions
│
├── docker-compose.yml         # Default (dev) config
├── docker-compose.dev.yml     # Development
├── docker-compose.prod.yml    # Production
├── .env.example               # Environment template
├── README.md                  # Getting started
├── CONTRIBUTING.md            # Development guide
└── CHANGELOG.md               # Version history
```

---

## 🔧 Environment Variables

### Essential
```env
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@db:5432/cyberforge
JWT_SECRET=your-secret-32-bytes
REFRESH_TOKEN_SECRET=your-secret-32-bytes
DATA_KEY_ENCRYPTION_KEY=your-secret-32-bytes-base64
CORS_ORIGIN=http://localhost:3001
```

### Optional
```env
LOG_LEVEL=debug
SECURE_COOKIES=false
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5
REDIS_URL=redis://redis:6379
```

See `.env.example` for complete list (30+ variables).

---

## ✅ Development Tasks

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check

# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Build for production
npm run build

# Start in production mode
npm start
```

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "Connection refused on 3000" | Check `docker ps`; restart: `docker compose restart api` |
| "Database connection error" | Verify `DATABASE_URL` in `.env`; check `docker compose logs db` |
| "CORS error in browser" | Ensure `CORS_ORIGIN` matches frontend URL in `.env` |
| "Login fails" | Check seed output for default password; verify user exists |
| "WebSocket not connecting" | Verify API running on port 3000; check network tab |
| "Port already in use" | Change port in `.env` or kill process: `lsof -i :3000` |

---

## 🔍 Debugging

### Backend
```bash
# View API logs
docker compose logs -f api

# Enable verbose logging
LOG_LEVEL=debug docker compose up api

# Debug with Node inspector
node --inspect-brk dist/main.js

# Access database
docker compose exec db psql -U cyberforge cyberforge
```

### Frontend
```bash
# View web logs
docker compose logs -f web

# Browser DevTools
F12 → Console, Network, Application tabs

# React DevTools
# Install Chrome extension: react-devtools

# API calls
Network tab → filter by Fetch/XHR
```

---

## 📞 Support

- **Documentation**: https://docs.cyberforge.local
- **Issues**: https://github.com/cyberforge/cyberforge/issues
- **Discussions**: https://github.com/cyberforge/cyberforge/discussions
- **Email**: support@cyberforge.local
- **Slack**: https://cyberforge.slack.com

---

## 📋 Role Permissions

| Action | VIEWER | OPERATOR | SECURITY_ANALYST | ADMIN |
|--------|--------|----------|------------------|-------|
| View sites/assets/sensors | ✅ | ✅ | ✅ | ✅ |
| Ingest readings | ❌ | ✅ | ✅ | ✅ |
| Create alert rules | ❌ | ❌ | ✅ | ✅ |
| View audit logs | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| Delete data | ❌ | ❌ | ❌ | ✅ |

---

## 🎯 Default Users (After Seed)

| Email | Role | Password |
|-------|------|----------|
| admin@cyberforge.local | ADMIN | (check console output) |
| analyst@cyberforge.local | SECURITY_ANALYST | (check console output) |
| operator@cyberforge.local | OPERATOR | (check console output) |
| viewer@cyberforge.local | VIEWER | (check console output) |

---

Last Updated: 2026-01-22
