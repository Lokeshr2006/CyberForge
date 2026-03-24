# CyberForge Threat Model

## Document Information
- **Title**: CyberForge IIoT Platform Threat Model
- **Version**: 1.0
- **Date**: 2026-01-22
- **Scope**: Full-stack industrial data monitoring platform
- **Threat Level**: Medium-High (industrial systems handling operational data)

---

## 1. System Overview

### Components
- **Frontend**: Next.js SPA (browser)
- **API Gateway/Reverse Proxy**: nginx (optional, TLS termination)
- **Backend API**: NestJS application (port 3000)
- **Database**: PostgreSQL 16+ (port 5432, internal only)
- **Cache/Real-time**: Redis (port 6379, internal only)
- **Users**: 4 roles (ADMIN, SECURITY_ANALYST, OPERATOR, VIEWER)
- **Data Flow**: HTTP/HTTPS for APIs, WebSocket for real-time alerts

### Trust Boundaries
1. **External** → Frontend (public, HTTPS)
2. **Frontend** → Backend API (authenticated, HTTPS)
3. **Backend** → Database (internal, TLS)
4. **Backend** → Cache (internal, TCP)

---

## 2. Threat Modeling (STRIDE)

### 2.1 Spoofing (Identity)

**Threat**: Attacker impersonates a legitimate user

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Forge JWT Token | Low | High | Token signing with HS256; audience/issuer validation; short TTL |
| Credential Brute Force | Medium | High | Rate limiting (5 req/min); failure tracking; account lockout |
| Session Hijacking | Low | High | Refresh token rotation; jti tracking; secure cookie flags |
| MITM Token Capture | Low | High | TLS 1.3+; secure, httpOnly flags; token refresh |

**Mitigations Implemented**:
- ✅ JWT signed with `JWT_SECRET` (strong entropy, >256 bits)
- ✅ Token audience: `cyberforge-api`; issuer: `cyberforge-auth`
- ✅ Refresh token: hashed with SHA-256; stored in DB with jti
- ✅ Login endpoint rate-limited: 5 requests/minute per IP
- ✅ Failed login tracking: 6+ failures trigger alert

---

### 2.2 Tampering (Data Integrity)

**Threat**: Attacker modifies data in transit or at rest

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Modify API Requests | Low | Medium | TLS encryption; input validation; CSRF tokens |
| Inject SQL | Low | Critical | Prisma ORM (parameterized queries) |
| XSS Attack | Low | Medium | React escaping; CSP headers; no innerHTML |
| Database Corruption | Low | High | Foreign keys; NOT NULL constraints; backups |
| Malformed Sensor Data | Medium | Medium | Input validation (Zod); type checking; range validation |

**Mitigations Implemented**:
- ✅ All requests require TLS (nginx config included)
- ✅ Zod validation on all inputs; fail-fast approach
- ✅ Prisma ORM prevents SQL injection
- ✅ React framework: automatic XSS protection
- ✅ CSP header: `default-src 'self'`
- ✅ Database constraints: foreign keys, unique, NOT NULL
- ✅ Audit log: before/after snapshots for all changes

---

### 2.3 Repudiation (Non-Repudiation)

**Threat**: User denies performing an action

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Deny Data Modification | Low | High | Audit logging with user/timestamp; non-repudiation |
| Deny Privilege Change | Low | High | Audit logging; signed logs (future: blockchain) |
| Deny Ingestion | Low | Medium | Audit logging with IP/correlation ID |

**Mitigations Implemented**:
- ✅ Audit log for every action: create, update, delete, login
- ✅ Logs include: user ID, timestamp, IP address, correlation ID
- ✅ Immutable log storage (append-only DB design)
- ✅ Before/after snapshots for sensitive changes

---

### 2.4 Information Disclosure (Confidentiality)

**Threat**: Unauthorized access to sensitive information

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Credential Leak in Code | Low | Critical | Environment variables; .env not in git; secrets scanning |
| Sensitive Data in Logs | Medium | High | Log sanitization; CR/LF stripping; no passwords in logs |
| Database Breach | Low | High | Password hashing (Argon2); secret encryption (AES-256-GCM) |
| Unencrypted Secrets | Low | High | Application-level encryption for API keys, webhook secrets |
| API Response Leakage | Low | Medium | Response filtering; role-based visibility |
| Metadata Exposure | Low | Medium | No server headers; error message sanitization |

**Mitigations Implemented**:
- ✅ Secrets from environment: `JWT_SECRET`, `DATA_KEY_ENCRYPTION_KEY`, `REFRESH_TOKEN_SECRET`
- ✅ .gitignore: .env excluded
- ✅ Password hashing: Argon2id (not salted strings)
- ✅ Secret encryption: AES-256-GCM envelope encryption
- ✅ Log sanitization: no passwords, API keys, or user inputs directly in logs
- ✅ Error responses: generic messages; no stack traces in production
- ✅ Response serialization: exclude sensitive fields (passwords, secrets)
- ✅ Helmet.js: removes `Server` header

---

### 2.5 Denial of Service (Availability)

**Threat**: Attacker prevents legitimate users from accessing the system

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Brute Force Login | Medium | Medium | Rate limiting; progressive delays; account lockout |
| Resource Exhaustion | Medium | Medium | Query limits; max result size; pagination |
| API Rate Limit Bypass | Low | Medium | Per-IP + per-user limiting; distributed cache |
| Slowloris Attack | Low | Medium | Request timeout; connection pooling |
| Database Overload | Low | High | Connection pooling; query optimization; read replicas |
| Sensor Reading Flood | Medium | Medium | Ingestion rate limiting; anomaly detection |

**Mitigations Implemented**:
- ✅ Global rate limiting: 100 req/min per IP
- ✅ Login rate limiting: 5 req/min per IP (stricter)
- ✅ Query result limits: max 1000 records; pagination
- ✅ Request body size limit: 10MB
- ✅ Database connection pooling: configured in Prisma
- ✅ Sensor reading validation: range/rate checks

---

### 2.6 Elevation of Privilege (Authorization)

**Threat**: Attacker gains higher privileges than intended

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Bypass RBAC | Low | Critical | Route-level guards; deny-by-default; @Roles decorator |
| Exploit Resource ID | Low | High | Ownership validation; resource-based access control |
| API Bypass | Low | High | No direct DB queries from controller; service layer checks |
| Admin Account Compromise | Low | Critical | MFA-ready; audit logging; session limits |

**Mitigations Implemented**:
- ✅ RoleGuard on all protected routes
- ✅ @Roles decorator: explicit permission required
- ✅ Deny-by-default: no implicit access
- ✅ RBAC hierarchy: ADMIN > SECURITY_ANALYST > OPERATOR > VIEWER
- ✅ Resource ownership validation: users can only access their resources
- ✅ Service layer: all business logic validates permissions
- ✅ Audit log: all privilege changes logged

---

## 3. Asset-Specific Threats

### 3.1 Frontend Assets

| Asset | Threat | Impact | Mitigation |
|--------|--------|--------|-----------|
| Browser Storage (localStorage) | Token theft via XSS | High | httpOnly cookies (not localStorage); CSP; no inline scripts |
| Session Cookie | CSRF attack | Medium | SameSite=Strict; CSRF token validation |
| User Input | Code injection | Medium | React auto-escaping; input validation |

### 3.2 API Assets

| Asset | Threat | Impact | Mitigation |
|--------|--------|--------|-----------|
| Auth Endpoint | Brute force; enumeration | High | Rate limiting; generic error messages |
| Sensor Readings | Unauthorized access | High | RBAC; sensor ownership validation |
| Alert Rules | Privilege escalation | High | @Roles(SECURITY_ANALYST) decorator |
| Audit Logs | Tampering; unauthorized access | Critical | DB constraints; role-based access |

### 3.3 Database Assets

| Asset | Threat | Impact | Mitigation |
|--------|--------|--------|-----------|
| User Passwords | Hash collision; brute force | Critical | Argon2id hashing (not MD5/SHA1) |
| Refresh Tokens | Token replay; reuse | High | JTI tracking; hashed storage; revocation list |
| API Keys/Secrets | Credential leak | High | AES-256-GCM encryption at rest |
| Audit Logs | Tampering; deletion | Critical | Append-only design; immutable after 90 days |

---

## 4. Attack Scenarios

### Scenario 1: Credential Compromise
**Attacker**: Insider or ex-employee with leaked password

**Attack Path**:
1. Attacker obtains user password (phishing, breach)
2. Attempts login from foreign IP
3. Rate limiting blocks after 5 attempts
4. Alert triggered: "Multiple login failures"

**Result**: BLOCKED by rate limiting
**Recovery**: Admin reviews audit log; resets password; investigates IP

---

### Scenario 2: Privilege Escalation via API
**Attacker**: Operator (low privilege) attempting to become Admin

**Attack Path**:
1. Attacker forges JWT token with ADMIN role
2. Sends request to `/api/v1/users/{id}/role` endpoint
3. RoleGuard checks actual role from database (not JWT)
4. Request denied: "Insufficient permissions"

**Result**: BLOCKED by role validation
**Prevention**: Roles validated from DB, not JWT claims

---

### Scenario 3: Token Reuse Attack
**Attacker**: Steals refresh token via MITM or XSS

**Attack Path**:
1. Attacker intercepts refresh token in transit
2. Attacker uses stolen token to get new access token
3. System checks JTI against DB
4. JTI not found or already used → token marked revoked
5. All of victim's tokens revoked immediately

**Result**: DETECTED and mitigated
**Alert**: "AUTH_REFRESH_TOKEN_REUSED" logged; user notified

---

### Scenario 4: SQL Injection via Sensor Data
**Attacker**: Inserts malicious SQL in sensor reading value

**Attack Path**:
1. Attacker sends: `POST /api/v1/readings { sensorId: "x'; DROP TABLE users; --", value: 999 }`
2. Zod validation fails: sensorId is not UUID format
3. Request rejected before reaching database

**Result**: BLOCKED by input validation
**Prevention**: Strict schema validation; Prisma ORM

---

## 5. Risk Matrix

### Risk Scoring: (Likelihood × Impact) / 10

| Threat | Likelihood | Impact | Risk Score | Status |
|--------|-----------|--------|-----------|--------|
| Brute Force Login | 7 | 8 | 5.6 | ✅ Mitigated |
| Token Theft (TLS) | 3 | 10 | 3.0 | ✅ Mitigated |
| SQL Injection | 2 | 10 | 2.0 | ✅ Mitigated |
| Privilege Escalation | 3 | 10 | 3.0 | ✅ Mitigated |
| Credential Leak | 5 | 10 | 5.0 | ✅ Mitigated |
| DDoS Attack | 6 | 7 | 4.2 | ✅ Partially |
| Insider Threat | 4 | 10 | 4.0 | ⚠️ Monitored |
| Zero-Day Exploit | 2 | 9 | 1.8 | ⚠️ Residual |

**Overall Risk Level**: **MEDIUM** (with implemented controls)
**Acceptable Risk Level**: **MEDIUM** (industrial IoT context)

---

## 6. Defense in Depth Layers

```
┌─────────────────────────────────────────────┐
│ Layer 1: Network (WAF, firewall, DDoS)      │  External threats
├─────────────────────────────────────────────┤
│ Layer 2: Transport (TLS 1.3, HTTPS)         │  Eavesdropping
├─────────────────────────────────────────────┤
│ Layer 3: API (Rate limit, validation)       │  Abuse, injection
├─────────────────────────────────────────────┤
│ Layer 4: Application (Auth, RBAC)           │  Unauthorized access
├─────────────────────────────────────────────┤
│ Layer 5: Data (Encryption, hashing)         │  Confidentiality
├─────────────────────────────────────────────┤
│ Layer 6: Audit (Logging, monitoring)        │  Accountability
└─────────────────────────────────────────────┘
```

---

## 7. Assumptions & Limitations

### Assumptions
- TLS certificates are valid and renewed automatically
- Environment variables are protected (K8s secrets, Vault, AWS Secrets Manager)
- Database is in private network; no direct internet access
- Regular backups are maintained offsite
- Admin accounts are protected with MFA (future enhancement)

### Known Limitations
- Optional components (WAF, CDN) require external service provider
- MFA not yet implemented (ready for integration)
- No FIPS 140-2 certification (can be added for federal use)
- Backup encryption relies on external storage encryption
- Intrusion detection system (IDS) not included (SIEM integration ready)

---

## 8. Recommendations

### Immediate (Next Sprint)
- [ ] Add API key rotation mechanism
- [ ] Implement API rate limiting headers (X-RateLimit-*)
- [ ] Add database backup encryption
- [ ] Set up log aggregation (ELK, Datadog, Splunk)

### Short-term (Next Quarter)
- [ ] Implement MFA (TOTP) for users
- [ ] Add webhook HMAC signature validation
- [ ] Set up WAF rules (ModSecurity, AWS WAF)
- [ ] Conduct penetration testing

### Medium-term (Next 6 Months)
- [ ] Database encryption at rest (pg_tde)
- [ ] Kubernetes Pod Security Policies
- [ ] Implement OAuth2/OIDC federation
- [ ] Add intrusion detection system (IDS)

### Long-term (1+ Year)
- [ ] Zero-trust architecture
- [ ] Hardware security module (HSM) integration
- [ ] Blockchain audit log (immutability)
- [ ] FIPS 140-2 certification

---

## 9. Review & Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Lead | [TBD] | 2026-01-22 | _________ |
| CTO | [TBD] | 2026-01-22 | _________ |
| Compliance | [TBD] | 2026-01-22 | _________ |

**Next Review Date**: 2026-04-22 (Quarterly)

---

## 10. Appendix: Security Testing Checklist

- [ ] Authentication: Test expired token handling
- [ ] Authorization: Test role boundaries with curl
- [ ] Input Validation: Fuzz endpoints with invalid JSON
- [ ] Rate Limiting: Verify 5 req/min login limit
- [ ] Encryption: Verify TLS 1.2+ on all endpoints
- [ ] Secrets: Verify no credentials in logs
- [ ] CSRF: Test cross-origin requests
- [ ] XSS: Attempt script injection in user inputs
- [ ] SQL Injection: Test parameterized queries
- [ ] Audit Logging: Verify all actions logged
- [ ] Error Handling: Verify no stack traces in prod
- [ ] Dependency Scanning: Run `npm audit`

---

**End of Threat Model**
