# CyberForge - File Index

Quick reference for all files in the project.

## Quick Links
- **Getting Started**: [README.md](README.md)
- **Quick Reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Security**: [docs/SECURITY.md](docs/SECURITY.md)
- **Deployment**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 📂 Root Level Files

| File | Purpose |
|------|---------|
| [README.md](README.md) | Main documentation, setup, architecture |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Quick start, API reference, common tasks |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development guidelines, workflow |
| [CHANGELOG.md](CHANGELOG.md) | Version history and changes |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | Complete implementation details |
| [LICENSE](LICENSE) | MIT License |
| [.env.example](.env.example) | Environment variables template |
| [docker-compose.yml](docker-compose.yml) | Default Docker configuration |
| [docker-compose.dev.yml](docker-compose.dev.yml) | Development Docker setup |
| [docker-compose.prod.yml](docker-compose.prod.yml) | Production Docker setup |
| [setup.sh](setup.sh) | Linux/Mac setup script |
| [setup.bat](setup.bat) | Windows setup script |
| [.gitignore](.gitignore) | Git ignore rules |

---

## 📂 Documentation (docs/)

| File | Purpose |
|------|---------|
| [SECURITY.md](docs/SECURITY.md) | OWASP ASVS compliance, CIA triad |
| [THREAT_MODEL.md](docs/THREAT_MODEL.md) | Risk analysis, STRIDE, attack scenarios |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment guides (all platforms) |

---

## 🔧 Infrastructure (infra/)

| File | Purpose |
|------|---------|
| [Dockerfile.api](infra/Dockerfile.api) | NestJS API container |
| [Dockerfile.web](infra/Dockerfile.web) | Next.js frontend container |
| [init.sql](infra/init.sql) | PostgreSQL initialization |
| [nginx.conf](infra/nginx.conf) | Nginx reverse proxy config |
| [NGINX.md](infra/NGINX.md) | Nginx documentation |
| [ssl/](infra/ssl/) | SSL certificates directory |

---

## 🔐 Backend API (apps/api/)

### Entry Point & Core
| File | Purpose | Lines |
|------|---------|-------|
| [src/main.ts](apps/api/src/main.ts) | NestJS bootstrap | 50 |
| [src/app.module.ts](apps/api/src/app.module.ts) | Root module | 40 |

### Configuration
| File | Purpose | Lines |
|------|---------|-------|
| [src/config/config.service.ts](apps/api/src/config/config.service.ts) | Environment config | 120 |
| [src/config/config.module.ts](apps/api/src/config/config.module.ts) | Config module | 15 |

### Database
| File | Purpose | Lines |
|------|---------|-------|
| [src/database/prisma.service.ts](apps/api/src/database/prisma.service.ts) | Prisma client | 30 |
| [src/database/prisma.module.ts](apps/api/src/database/prisma.module.ts) | DB module | 10 |
| [prisma/schema.prisma](apps/api/prisma/schema.prisma) | Database schema | 200 |
| [prisma/seed.ts](apps/api/prisma/seed.ts) | Seed script | 300 |

### Authentication
| File | Purpose | Lines |
|------|---------|-------|
| [src/auth/auth.service.ts](apps/api/src/auth/auth.service.ts) | Auth logic | 250 |
| [src/auth/auth.controller.ts](apps/api/src/auth/auth.controller.ts) | Auth endpoints | 60 |
| [src/auth/auth.module.ts](apps/api/src/auth/auth.module.ts) | Auth module | 25 |
| [src/auth/auth.dto.ts](apps/api/src/auth/auth.dto.ts) | DTOs | 40 |
| [src/auth/strategies/jwt.strategy.ts](apps/api/src/auth/strategies/jwt.strategy.ts) | JWT strategy | 20 |

### Users
| File | Purpose | Lines |
|------|---------|-------|
| [src/users/users.service.ts](apps/api/src/users/users.service.ts) | User management | 100 |
| [src/users/users.controller.ts](apps/api/src/users/users.controller.ts) | User endpoints | 50 |
| [src/users/users.module.ts](apps/api/src/users/users.module.ts) | Users module | 20 |

### Monitoring (Sites, Assets, Sensors, Readings)
| File | Purpose | Lines |
|------|---------|-------|
| [src/monitoring/monitoring.service.ts](apps/api/src/monitoring/monitoring.service.ts) | Monitoring logic | 300 |
| [src/monitoring/monitoring.controller.ts](apps/api/src/monitoring/monitoring.controller.ts) | Monitoring endpoints | 150 |
| [src/monitoring/monitoring.module.ts](apps/api/src/monitoring/monitoring.module.ts) | Monitoring module | 20 |

### Alerts
| File | Purpose | Lines |
|------|---------|-------|
| [src/alerts/alerts.service.ts](apps/api/src/alerts/alerts.service.ts) | Alert logic | 200 |
| [src/alerts/alerts.controller.ts](apps/api/src/alerts/alerts.controller.ts) | Alert endpoints | 80 |
| [src/alerts/alerts.gateway.ts](apps/api/src/alerts/alerts.gateway.ts) | WebSocket gateway | 50 |
| [src/alerts/alerts.module.ts](apps/api/src/alerts/alerts.module.ts) | Alerts module | 25 |

### Audit Logging
| File | Purpose | Lines |
|------|---------|-------|
| [src/audit/audit.service.ts](apps/api/src/audit/audit.service.ts) | Audit logging | 150 |
| [src/audit/audit.controller.ts](apps/api/src/audit/audit.controller.ts) | Audit endpoints | 50 |
| [src/audit/audit.module.ts](apps/api/src/audit/audit.module.ts) | Audit module | 20 |

### Common (Middleware, Guards, Filters)
| File | Purpose | Lines |
|------|---------|-------|
| [src/common/middleware/correlation-id.middleware.ts](apps/api/src/common/middleware/correlation-id.middleware.ts) | Request tracing | 20 |
| [src/common/middleware/security-headers.middleware.ts](apps/api/src/common/middleware/security-headers.middleware.ts) | Security headers | 30 |
| [src/common/filters/global-exception.filter.ts](apps/api/src/common/filters/global-exception.filter.ts) | Error handling | 60 |
| [src/common/guards/jwt-auth.guard.ts](apps/api/src/common/guards/jwt-auth.guard.ts) | JWT validation | 20 |
| [src/common/guards/role.guard.ts](apps/api/src/common/guards/role.guard.ts) | RBAC enforcement | 30 |
| [src/common/decorators/roles.decorator.ts](apps/api/src/common/decorators/roles.decorator.ts) | Role decorator | 10 |
| [src/common/utils/encryption.service.ts](apps/api/src/common/utils/encryption.service.ts) | Encryption | 50 |
| [src/common/health/health.controller.ts](apps/api/src/common/health/health.controller.ts) | Health endpoint | 20 |

### Configuration Files
| File | Purpose |
|------|---------|
| [package.json](apps/api/package.json) | Dependencies & scripts |
| [tsconfig.json](apps/api/tsconfig.json) | TypeScript config |
| [tsconfig.build.json](apps/api/tsconfig.build.json) | Build config |
| [.eslintrc.js](apps/api/.eslintrc.js) | ESLint rules |
| [.prettierrc](apps/api/.prettierrc) | Prettier config |
| [jest.config.js](apps/api/jest.config.js) | Jest config |
| [README.md](apps/api/README.md) | API documentation |

---

## 🎨 Frontend (apps/web/)

### Pages
| File | Purpose | Lines |
|------|---------|-------|
| [src/app/layout.tsx](apps/web/src/app/layout.tsx) | Root layout | 50 |
| [src/app/page.tsx](apps/web/src/app/page.tsx) | Home/redirect | 20 |
| [src/app/login/page.tsx](apps/web/src/app/login/page.tsx) | Login page | 150 |
| [src/app/dashboard/page.tsx](apps/web/src/app/dashboard/page.tsx) | Dashboard | 300 |

### Libraries & Utilities
| File | Purpose | Lines |
|------|---------|-------|
| [src/lib/api.ts](apps/web/src/lib/api.ts) | API client | 150 |
| [src/lib/socket.ts](apps/web/src/lib/socket.ts) | WebSocket client | 50 |
| [src/lib/store.ts](apps/web/src/lib/store.ts) | Zustand stores | 60 |
| [src/lib/utils.ts](apps/web/src/lib/utils.ts) | Utilities | 80 |

### Styling
| File | Purpose |
|------|---------|
| [src/styles/globals.css](apps/web/src/styles/globals.css) | Global CSS |
| [tailwind.config.js](apps/web/tailwind.config.js) | TailwindCSS config |
| [postcss.config.js](apps/web/postcss.config.js) | PostCSS config |

### Configuration Files
| File | Purpose |
|------|---------|
| [package.json](apps/web/package.json) | Dependencies & scripts |
| [tsconfig.json](apps/web/tsconfig.json) | TypeScript config |
| [tsconfig.node.json](apps/web/tsconfig.node.json) | Build config |
| [next.config.js](apps/web/next.config.js) | Next.js config |
| [.eslintrc.js](apps/web/.eslintrc.js) | ESLint rules |
| [.prettierrc](apps/web/.prettierrc) | Prettier config |
| [README.md](apps/web/README.md) | Frontend docs |

---

## 🔄 CI/CD (.github/)

### Workflows
| File | Purpose | Lines |
|------|---------|-------|
| [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml) | CI/CD pipeline | 400 |

### Issue Templates
| File | Purpose |
|------|---------|
| [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md) | Bug report form |
| [.github/ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md) | Feature request form |
| [.github/ISSUE_TEMPLATE/security.md](.github/ISSUE_TEMPLATE/security.md) | Security report form |

---

## 📊 Statistics

| Metric | Count |
|--------|-------|
| Total Files | 95+ |
| Total Lines of Code | 10,000+ |
| Backend Files | 25+ |
| Frontend Files | 15+ |
| Documentation Files | 10+ |
| Configuration Files | 20+ |
| Test Files | (Ready for tests) |
| Docker Files | 4 |
| CI/CD Files | 1 |

---

## 🔍 Finding Things

### By Technology
- **NestJS**: `apps/api/src/`
- **Next.js**: `apps/web/src/`
- **PostgreSQL**: `apps/api/prisma/schema.prisma`
- **Docker**: `infra/` and `docker-compose*.yml`
- **Testing**: `apps/api/jest.config.js`

### By Feature
- **Authentication**: `apps/api/src/auth/`
- **Authorization**: `apps/api/src/common/guards/`
- **Monitoring**: `apps/api/src/monitoring/`
- **Alerts**: `apps/api/src/alerts/`
- **Audit Logging**: `apps/api/src/audit/`
- **Encryption**: `apps/api/src/common/utils/encryption.service.ts`
- **API Documentation**: `apps/api/src/main.ts` (Swagger config)
- **Frontend UI**: `apps/web/src/app/` (pages)
- **API Client**: `apps/web/src/lib/api.ts`
- **State Management**: `apps/web/src/lib/store.ts`

### By Security Feature
- **JWT**: `apps/api/src/auth/strategies/jwt.strategy.ts`
- **Encryption**: `apps/api/src/common/utils/encryption.service.ts`
- **RBAC**: `apps/api/src/common/guards/role.guard.ts`
- **Audit**: `apps/api/src/audit/`
- **Security Headers**: `apps/api/src/common/middleware/security-headers.middleware.ts`
- **Rate Limiting**: `apps/api/src/main.ts` (configured in bootstrap)
- **Input Validation**: `apps/api/src/auth/auth.dto.ts` (examples)
- **Error Handling**: `apps/api/src/common/filters/global-exception.filter.ts`

---

## 🚀 Getting Started

1. **Read**: [README.md](README.md)
2. **Quick Start**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
3. **Run**: `setup.sh` (Linux/Mac) or `setup.bat` (Windows)
4. **Open**: http://localhost:3001
5. **Code**: Open `apps/api/` or `apps/web/`
6. **Deploy**: See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 📚 Documentation Map

```
README.md                  → Overview & architecture
├── QUICK_REFERENCE.md    → API endpoints & tasks
├── CONTRIBUTING.md       → Development workflow
├── docs/
│   ├── SECURITY.md       → OWASP compliance
│   ├── THREAT_MODEL.md   → Risk analysis
│   └── DEPLOYMENT.md     → All deployment guides
└── apps/
    ├── api/README.md     → Backend specifics
    └── web/README.md     → Frontend specifics
```

---

Last Updated: 2026-01-22
