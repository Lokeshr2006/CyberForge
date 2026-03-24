# CyberForge Architecture & Component Map

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USERS / CLIENTS                                │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │ HTTPS / TLS 1.3+
                      │
        ┌─────────────▼───────────────┐
        │  Browser / Web Client       │
        │  - Next.js Frontend         │
        │  - TailwindCSS UI           │
        │  - Zustand State            │
        │  - Axios HTTP Client        │
        └─────────────┬───────────────┘
                      │
                      │ HTTP/1.1 with upgrade to WebSocket
                      │
        ┌─────────────▼─────────────────────────────────────┐
        │      Nginx Reverse Proxy                          │
        │  - SSL/TLS Termination (443)                      │
        │  - Rate Limiting (100 req/min)                    │
        │  - Security Headers                               │
        │  - Gzip Compression                               │
        │  - Load Balancing (future)                        │
        └─────────────┬─────────────────────────────────────┘
                      │
      ┌───────────────┴──────────────────┐
      │                                  │
      │ HTTP 1.1 (internal)              │ WebSocket
      │                                  │
   ┌──▼──────────────────────┐   ┌──────▼──────────────┐
   │ NestJS API Server       │   │ socket.io Gateway   │
   │ Port: 3000              │   │ (part of API)       │
   │                         │   │                     │
   │ Core Modules:           │   │ Features:           │
   │ - Auth (JWT)            │   │ - Room-based        │
   │ - Users (RBAC)          │   │   broadcasting      │
   │ - Monitoring            │   │ - Real-time alerts  │
   │ - Alerts (rules/events) │   │ - Auto-reconnect    │
   │ - Audit (logging)       │   │ - Fallback to HTTP  │
   │                         │   │                     │
   │ Middleware:             │   └─────────────────────┘
   │ - JWT validation        │
   │ - Rate limiting         │
   │ - Correlation ID        │
   │ - Security headers      │
   │ - Error handling        │
   │ - Input validation      │
   └──┬──────────────────────┘
      │
      │ TCP/IP (internal network)
      │
   ┌──▼──────────────────────────┬──────────────────────────┐
   │                              │                         │
   │ PostgreSQL 16                │ Redis 7 (optional)      │
   │ Port: 5432                   │ Port: 6379              │
   │                              │                         │
   │ Data Storage:                │ Cache Layer:            │
   │ - Users                      │ - Session cache         │
   │ - RefreshTokens (JTI)        │ - Query cache           │
   │ - Sites                      │ - Rate limit counters   │
   │ - Assets                     │ - Temporary data        │
   │ - Sensors                    │                         │
   │ - Readings                   │                         │
   │ - AlertRules                 │                         │
   │ - AlertEvents                │                         │
   │ - AuditLogs                  │                         │
   │                              │                         │
   │ Security:                    │ Features:               │
   │ - Encrypted passwords        │ - AOF persistence       │
   │ - Encrypted secrets          │ - Key expiration        │
   │ - Audit trail                │ - Memory limits         │
   │ - Constraint enforcement     │ - LRU eviction          │
   └──────────────────────────────┴──────────────────────────┘
```

---

## Request Flow Diagram

```
┌────────────────┐
│  User Opens    │
│  Login Page    │
└────────┬───────┘
         │
         ▼
    ┌─────────────────────────────┐
    │  Browser sends              │
    │  POST /api/v1/auth/login    │
    │  {email, password}          │
    └─────────────┬───────────────┘
                  │
                  ▼
          ┌───────────────────────────┐
          │  Nginx                    │
          │  1. Rate limiting check   │
          │  2. Add correlation ID    │
          │  3. Forward to API        │
          └───────────┬───────────────┘
                      │
                      ▼
              ┌──────────────────────────┐
              │  NestJS Request Handler  │
              │                          │
              │  1. Input validation     │
              │     (Zod schema)         │
              │  2. Database lookup      │
              │  3. Password verification│
              │     (Argon2)             │
              │  4. Log event: LOGIN_    │
              │     SUCCESS              │
              │  5. Generate tokens:     │
              │     - Access (15 min)    │
              │     - Refresh (7 days)   │
              │  6. Store refresh token  │
              │     (hashed with JTI)    │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  Return Response         │
              │  {                       │
              │    accessToken,          │
              │    refreshToken,         │
              │    user: {...}           │
              │  }                       │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  Browser                 │
              │  1. Store tokens in      │
              │     httpOnly cookies     │
              │  2. Store user data      │
              │     in Zustand store     │
              │  3. Redirect to          │
              │     /dashboard           │
              └──────────────────────────┘
```

---

## Authentication State Machine

```
┌──────────────┐
│  Not Logged  │
│   In State   │
└──────┬───────┘
       │
       │ POST /login
       │ (valid credentials)
       ▼
    ┌───────────────┐
    │  Logged In    │─────────────┐
    │  State        │             │
    │               │ Access      │
    │               │ Token       │
    │               │ Expires     │
    └───────────────┘ (15 min)    │
       ▲                          │
       │ POST /refresh            │
       │ (refresh token valid)     │
       │                          │
       │ Issue new               │
       │ access token            │
       │                          │
       │          ┌──────────────┘
       │          │
       │    ┌─────▼──────────┐
       │    │  Check JTI     │
       │    │  in DB         │
       │    └─────┬──────────┘
       │          │
       │    ┌─────▼──────────────┐
       │    │  JTI not found     │
       │    │  (already used?)   │
       │    │                    │
       │    │  Yes: Token Reuse  │
       │    │       Detected!    │
       │    │  → Revoke all      │
       │    │    tokens          │
       │    │  → Log event       │
       │    │  → Redirect login  │
       │    └────────┬───────────┘
       │             │
       │         ┌───▼───┐
       │         │ LOGOUT│
       │         │ State │
       │         └───────┘
       │
       │ POST /logout
       │ (from logged in)
       │
       └─────────────────────────────┘
```

---

## Data Flow: Sensor Reading to Alert

```
1. Reading Ingestion
   ┌──────────────────────────────────┐
   │ External IoT Device              │
   │ (e.g., Temperature Sensor)       │
   └────────────┬─────────────────────┘
                │
                ▼
   ┌──────────────────────────────────┐
   │ POST /api/v1/readings            │
   │ {                                │
   │   sensorId: UUID,                │
   │   value: 85.5,                   │
   │   timestamp: ISO8601             │
   │ }                                │
   └────────────┬─────────────────────┘
                │
   ┌────────────▼──────────────────────┐
   │ 1. Validate input (Zod)           │
   │ 2. Check sensor exists            │
   │ 3. Create reading record          │
   │ 4. Update sensor.lastReadingAt    │
   │ 5. Log audit event: READING_      │
   │    INGESTED                       │
   │ 6. Trigger alert evaluation       │
   └────────────┬──────────────────────┘
                │
2. Alert Evaluation
   ┌───────────▼───────────────────────┐
   │ For each AlertRule on sensor:     │
   │                                   │
   │ 1. Get rule condition             │
   │    (e.g., {                       │
   │      type: "threshold",           │
   │      threshold: 80,               │
   │      operator: ">"                │
   │    })                             │
   │ 2. Evaluate: value > threshold    │
   │    85.5 > 80 → TRUE               │
   │ 3. Check for active alert:        │
   │    - If exists: skip              │
   │    - If not: create               │
   │ 4. Create AlertEvent              │
   │ 5. Log audit event:               │
   │    ALERT_EVENT_DETECTED           │
   └───────────┬───────────────────────┘
                │
3. Real-time Broadcast
   ┌───────────▼──────────────────────┐
   │ Emit via WebSocket               │
   │ (socket.io)                      │
   │                                  │
   │ alert-triggered event:           │
   │ {                                │
   │   id: alertEventId,              │
   │   ruleId,                        │
   │   message: "...",                │
   │   severity: "HIGH",              │
   │   detectedAt: timestamp          │
   │ }                                │
   └───────────┬──────────────────────┘
                │
4. Frontend Update
   ┌───────────▼──────────────────────┐
   │ Browser receives alert           │
   │ via WebSocket                    │
   │                                  │
   │ 1. Update Zustand store          │
   │ 2. Add to alerts list            │
   │ 3. Increment unread count        │
   │ 4. Show notification             │
   │ 5. Update dashboard view         │
   └───────────┬──────────────────────┘
                │
5. User Action: Acknowledge Alert
   ┌───────────▼──────────────────────┐
   │ PATCH /api/v1/alerts/events/     │
   │ {alertId}/acknowledge            │
   │                                  │
   │ 1. Update status: ACKNOWLEDGED   │
   │ 2. Set acknowledgedBy: userId    │
   │ 3. Set acknowledgedAt: timestamp │
   │ 4. Log audit event:              │
   │    ALERT_ACKNOWLEDGED            │
   │ 5. Broadcast update via WS       │
   │ 6. Update frontend state         │
   └───────────────────────────────────┘
```

---

## Security Layers (Defense in Depth)

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                                   │
│ - TLS 1.3+ encryption                                       │
│ - Certificate validation                                    │
│ - Firewall rules (network policies)                         │
│ - DDoS mitigation at CDN/WAF                               │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Layer 2: Reverse Proxy (Nginx)                              │
│ - Rate limiting (100 req/min global, 5 for login)          │
│ - Security headers (HSTS, CSP, etc.)                       │
│ - Request validation                                        │
│ - SSL/TLS termination                                       │
└──────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Layer 3: API Gateway / Input Validation                     │
│ - Zod schema validation (fail-fast)                         │
│ - Content-type validation                                   │
│ - Payload size limits                                       │
│ - Correlation ID tracking                                   │
└──────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Layer 4: Authentication & Authorization                     │
│ - JWT validation (HS256)                                    │
│ - Token expiration checks                                   │
│ - Audience/Issuer validation                                │
│ - RBAC enforcement (RoleGuard)                              │
│ - Deny-by-default access model                              │
└──────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Layer 5: Business Logic                                     │
│ - Resource ownership validation                             │
│ - Data constraints (FK, unique, NOT NULL)                   │
│ - Sensitive operation logging                               │
│ - Audit event creation                                      │
└──────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Layer 6: Data Protection                                    │
│ - Password hashing (Argon2id)                               │
│ - Secret encryption (AES-256-GCM)                           │
│ - Database constraints                                      │
│ - Audit logging (immutable)                                 │
│ - Data backup & encryption                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Module Dependency Graph

```
┌──────────────────────────────────────────────────────────────┐
│                     AppModule (Root)                         │
└──────────┬──────────────────────────────────────────────────┘
           │
    ┌──────┴─────────────────────────────────────┐
    │                                            │
    ▼                                            ▼
┌──────────────────┐             ┌────────────────────┐
│  ConfigModule    │             │  DatabaseModule    │
│  - Env vars      │             │  - Prisma client   │
│  - Validation    │             │  - Connection pool │
└──────────────────┘             └────────────────────┘
                                          △
    ┌───────────────────────────────────┘
    │
    ├──────────────────────────────────────────┬─────────────┐
    │                                          │             │
    ▼                                          ▼             ▼
┌──────────────────┐  ┌────────────────┐  ┌──────────────┐
│  AuthModule      │  │  UsersModule   │  │AuditModule   │
│  - JWT tokens    │  │  - CRUD users  │  │  - Logging   │
│  - Refresh logic │  │  - Role mgmt   │  │  - Analysis  │
│  - Password hash │  │  - Validation  │  │  - Queries   │
└────────┬─────────┘  └────────────────┘  └──────────────┘
         │
         │ Uses
         ▼
   ┌─────────────────────────────────────────┐
   │       MonitoringModule                  │
   │  - Sites CRUD                           │
   │  - Assets CRUD                          │
   │  - Sensors CRUD                         │
   │  - Readings ingestion                   │
   │  - Statistics calculation               │
   └─────────────┬───────────────────────────┘
                 │
                 │ Triggers
                 ▼
          ┌──────────────────┐
          │  AlertsModule    │
          │  - Rule mgmt     │
          │  - Evaluation    │
          │  - WebSocket GW  │
          │  - Broadcasting  │
          └──────────────────┘
```

---

## Database Relationships

```
User (1) ──────────────────────── (N) RefreshToken
 │
 ├─ (1) ──────────────────────── (N) Site
 │   │
 │   └─ (1) ──────────────────── (N) Asset
 │       │
 │       └─ (1) ────────────────── (N) Sensor
 │           │
 │           ├─ (1) ──────────────── (N) SensorReading
 │           │
 │           └─ (1) ────────────────── (N) AlertRule
 │               │
 │               └─ (1) ──────────── (N) AlertEvent
 │
 └─ (1) ──────────────────────── (N) AuditLog
     │                              │
     └─ Created by / Performed by ──┘
```

---

## CI/CD Pipeline Flow

```
                    ┌──────────────┐
                    │  Git Push    │
                    │  to Main/Dev │
                    └──────┬───────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
        ┌───▼──────┐           ┌─────────▼──┐
        │ PR/Merge │           │ Auto-Deploy │
        │ Trigger  │           │  Trigger    │
        └───┬──────┘           └─────────┬──┘
            │                           │
    ┌───────▼────────────┐      ┌──────▼──────────┐
    │ CI Pipeline        │      │ CD Pipeline     │
    │                    │      │                 │
    │ 1. Lint (ESLint)   │      │ 1. Build images │
    │ 2. Type check      │      │ 2. Deploy to    │
    │    (TypeScript)    │      │    staging/prod │
    │ 3. Security scan   │      │ 3. Health check │
    │    (npm audit)     │      │ 4. Smoke tests  │
    │ 4. Run tests       │      │ 5. Notify Slack │
    │    (Jest)          │      │                 │
    └────────┬───────────┘      └─────────────────┘
             │
    ┌────────▼────────┐
    │ Pass ✓          │
    │ All checks      │
    └────────┬────────┘
             │
    ┌────────▼────────────────┐
    │ Build Docker images     │
    │ - API image             │
    │ - Web image             │
    │ Push to registry        │
    └────────┬────────────────┘
             │
    ┌────────▼────────────────┐
    │ Deploy (if main/dev)    │
    │ - K8s or Docker Compose │
    │ - Run migrations        │
    │ - Health check          │
    │ - Smoke tests           │
    └────────────────────────┘
```

---

## Frontend Component Hierarchy

```
RootLayout
 ├─ Theme Initialization
 ├─ Global CSS
 └─ children
     │
     ├─ LoginPage
     │   ├─ LoginForm
     │   │   ├─ Email Input
     │   │   ├─ Password Input
     │   │   ├─ Submit Button
     │   │   └─ Error Display
     │   └─ Login Logic
     │
     ├─ DashboardLayout
     │   ├─ Header
     │   │   ├─ Logo
     │   │   ├─ User Info
     │   │   └─ Logout Button
     │   ├─ Sidebar
     │   │   ├─ Site Selector
     │   │   ├─ Asset Selector
     │   │   └─ Sensor Selector
     │   └─ MainContent
     │       ├─ Readings Display
     │       │   ├─ Chart (Recharts)
     │       │   └─ Stats
     │       └─ Alerts Panel
     │           ├─ Alert List
     │           ├─ Acknowledge Btn
     │           └─ Resolve Btn
     │
     └─ RedirectLogic
         ├─ Check auth
         ├─ Redirect if needed
         └─ Loading state
```

---

## State Management (Zustand Stores)

```
useAuthStore
├─ State
│  ├─ user: User | null
│  ├─ accessToken: string | null
│  ├─ refreshToken: string | null
│  ├─ isLoading: boolean
│  └─ error: string | null
│
└─ Actions
   ├─ setUser(user)
   ├─ setTokens(access, refresh)
   ├─ clearAuth()
   ├─ setLoading(bool)
   └─ setError(error)

useAlertStore
├─ State
│  ├─ alerts: AlertEvent[]
│  └─ unreadCount: number
│
└─ Actions
   ├─ addAlert(alert)
   ├─ acknowledgeAlert(id)
   ├─ resolveAlert(id)
   └─ clearAlerts()
```

---

## Key Performance Indicators (KPIs)

```
┌─────────────────────────────────────────┐
│ API Performance                         │
├─────────────────────────────────────────┤
│ Response Time (p95):       < 100ms      │
│ Throughput:                10,000 req/s │
│ Concurrent Users:          100+         │
│ Database Queries (avg):     < 50ms      │
│ Cache Hit Rate (Redis):     80-90%      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Security Metrics                        │
├─────────────────────────────────────────┤
│ Failed Login Attempts:     Tracked      │
│ Brute Force Detection:     < 1 min      │
│ Token Reuse Detection:     Immediate    │
│ Audit Log Entries:         All events  │
│ OWASP Coverage:            L2/3 ✓      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Availability Metrics                    │
├─────────────────────────────────────────┤
│ Uptime Target:             99.9%        │
│ Health Check Interval:     10s          │
│ Graceful Shutdown:         Yes          │
│ Connection Pool Size:      5-20         │
│ Database Failover:         Ready        │
└─────────────────────────────────────────┘
```

---

**Last Updated**: 2026-01-22  
**Architecture Version**: 1.0.0
