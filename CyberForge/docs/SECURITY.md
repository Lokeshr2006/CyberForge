# CyberForge Security Model

## Executive Summary

CyberForge implements a comprehensive security architecture aligned with OWASP ASVS (Application Security Verification Standard) Level 2/3 requirements and industry best practices for industrial IoT systems. This document maps security features to the CIA Triad (Confidentiality, Integrity, Availability) and outlines threat mitigations.

---

## 1. CIA Triad Alignment

### Confidentiality (C)
Protecting sensitive data from unauthorized access.

| Feature | Implementation |
|---------|----------------|
| **Data Encryption in Transit** | TLS 1.3+ for HTTPS, WebSocket Secure (WSS) |
| **Data Encryption at Rest** | Application-level AES-256-GCM envelope encryption for secrets |
| **Authentication** | JWT with short-lived tokens (15 min) + refresh token rotation |
| **Authorization** | Role-Based Access Control (RBAC) with deny-by-default policy |
| **Field-Level Encryption** | Webhook secrets, API keys, connector credentials encrypted |
| **Secrets Management** | Master key from environment variables; rotation strategy documented |
| **Access Logging** | Audit logs track all data access and privilege changes |

### Integrity (I)
Ensuring data has not been tampered with or modified unexpectedly.

| Feature | Implementation |
|---------|----------------|
| **Input Validation** | Strict Zod schemas for all inputs; fail-fast validation |
| **CSRF Protection** | Token-based validation; SameSite cookie flags |
| **Database Constraints** | Foreign keys, unique constraints, NOT NULL rules enforced |
| **Audit Logging** | Tamper-aware logs stored in append-only fashion with correlation IDs |
| **Change Tracking** | All modifications logged with before/after snapshots |
| **Hash Verification** | Refresh tokens hashed with SHA-256; password hashing with Argon2 |
| **Digital Signatures** | Webhook payloads signed with HMAC-SHA256 |

### Availability (A)
Ensuring authorized access is maintained under normal and adverse conditions.

| Feature | Implementation |
|---------|----------------|
| **Rate Limiting** | 100 req/min global; 5 req/min for login (brute-force protection) |
| **DDoS Mitigation** | CDN/WAF at edge; brute-force detection with IP tracking |
| **Health Checks** | Kubernetes-ready liveness/readiness probes |
| **Graceful Degradation** | Non-critical features fail safely; core APIs continue |
| **Monitoring & Alerting** | Real-time WebSocket alerts; anomaly detection engine |
| **Redundancy** | Stateless API design; database replication ready |
| **Incident Response** | Security event logging with automatic escalation |

---

## 2. OWASP ASVS Level 2/3 Compliance Mapping

### 2.1 Authentication (V2)
✅ **2.1.1** User registration input validation
✅ **2.1.5** Credentials stored securely with strong hashing (Argon2)
✅ **2.1.12** Session hijacking protected via token audience/issuer/jti validation
✅ **2.1.13** Insufficient password policy checks (minimum 8 chars enforced)

### 2.2 Session Management (V3)
✅ **3.2.1** JWT with short expiration (15 min); refresh token rotation
✅ **3.2.2** Refresh tokens hashed and stored in database with jti tracking
✅ **3.3.1** Cookie security: httpOnly, Secure, SameSite=Strict
✅ **3.4.1** Session logout invalidates refresh tokens immediately
✅ **3.4.5** Token reuse detection; automatic session termination on reuse

### 2.3 Access Control (V4)
✅ **4.1.1** RBAC enforced: ADMIN > SECURITY_ANALYST > OPERATOR > VIEWER
✅ **4.1.3** Deny-by-default: no access without explicit permission
✅ **4.1.5** Privilege separation: controllers → services → repositories
✅ **4.2.1** Resource-based access control (tenant isolation ready)
✅ **4.3.1** File upload validation (API key handling)

### 2.4 Validation, Sanitization, Encoding (V5)
✅ **5.1.1** All inputs validated against schema; whitelist approach
✅ **5.1.5** Structured validation errors; no system paths in messages
✅ **5.3.1** Output encoding: JSON content-type headers; no raw HTML
✅ **5.3.5** Log injection prevention: CR/LF stripping in audit logs
✅ **5.4.1** SSRF protection: webhook URL validation with safe-list

### 2.5 Cryptography (V6)
✅ **6.1.1** Strong algorithms: AES-256-GCM for secrets, SHA-256 for tokens, Argon2 for passwords
✅ **6.1.4** Cryptographic libraries: OpenSSL via Node.js crypto module
✅ **6.2.1** Secrets management: environment variables with rotation doc
✅ **6.2.2** Key derivation: Argon2id with memory cost 64MB, time cost 3
✅ **6.3.1** Random number generation: crypto.randomBytes() for tokens

### 2.6 Sensitive Data Exposure (V8)
✅ **8.1.1** Data classification: secrets encrypted, PII masked in logs
✅ **8.2.1** TLS enforced for all connections (nginx reverse proxy)
✅ **8.2.3** Certificate pinning guidance in deployment docs
✅ **8.3.1** Sensitive data not in logs; sanitization on log entries
✅ **8.3.4** No credentials in error messages; generic responses

### 2.7 Logging & Monitoring (V7)
✅ **7.1.1** Security events logged: auth, privilege changes, anomalies
✅ **7.1.2** Sensitive data excluded; user inputs sanitized
✅ **7.1.3** Logs include: timestamp, user, action, resource, result, IP
✅ **7.2.1** Event logging for critical functions
✅ **7.3.1** Response headers: X-Correlation-ID for tracing
✅ **7.4.1** Alerting on suspicious activity: brute-force, token reuse

---

## 3. Threat Model & Mitigations

### 3.1 Authentication Threats

| Threat | Risk | Mitigation |
|--------|------|-----------|
| **Brute Force Login** | HIGH | Rate limiting: 5 req/min/IP; login failure tracking; account lockout (admin action) |
| **Password Compromise** | HIGH | Argon2id hashing; password reset flow logs audit events |
| **Session Hijacking** | HIGH | JWT with short expiration; token audience/issuer validation; refresh token jti tracking |
| **Token Theft** | MEDIUM | Secure, httpOnly cookies; short token TTL; refresh token rotation |
| **Credential Leakage** | MEDIUM | No credentials in logs; environment-based config; no console output in prod |

**Mitigations:**
- ✅ Login endpoint rate-limited to 5 requests/minute per IP
- ✅ Failed login attempts tracked; after 5 failures, admin notification
- ✅ Access tokens expire after 15 minutes
- ✅ Refresh tokens are rotated on use; old tokens invalidated
- ✅ Token reuse detected and triggers full session revocation

---

### 3.2 Authorization Threats

| Threat | Risk | Mitigation |
|--------|------|-----------|
| **Privilege Escalation** | HIGH | RBAC enforced at route level; deny-by-default; audit log privilege changes |
| **Horizontal Escalation** | MEDIUM | Resource ownership validation; user can only access own resources |
| **Vertical Escalation** | HIGH | Role-based guards; ADMIN role required for sensitive operations |
| **API Key Exposure** | MEDIUM | API keys encrypted at rest; rotation guidance in docs |

**Mitigations:**
- ✅ All endpoints protected by RoleGuard; permissions checked before execution
- ✅ @Roles decorator defines required roles; ADMIN bypasses most checks
- ✅ Resource access validated: users can view sites/assets they have permissions for
- ✅ Privilege changes logged as security events

---

### 3.3 Input Validation Threats

| Threat | Risk | Mitigation |
|--------|------|-----------|
| **SQL Injection** | CRITICAL | ORM (Prisma) with parameterized queries; no raw SQL |
| **XSS (Cross-Site Scripting)** | HIGH | Frontend React escaping; no innerHTML; CSP headers |
| **Command Injection** | MEDIUM | No shell execution; safe APIs only |
| **Path Traversal** | MEDIUM | No file path user inputs; resource access via IDs |
| **XXE (XML External Entity)** | LOW | JSON only; no XML parsing |

**Mitigations:**
- ✅ Zod validation on all request bodies/queries/params
- ✅ Whitelist approach: only known fields accepted
- ✅ Prisma ORM prevents SQL injection
- ✅ React components escape by default
- ✅ CSP headers restrict script execution

---

### 3.4 Data Protection Threats

| Threat | Risk | Mitigation |
|--------|------|-----------|
| **Unencrypted Secrets** | CRITICAL | AES-256-GCM envelope encryption for API keys, webhook secrets |
| **Database Breach** | CRITICAL | Password hashing (Argon2); secret encryption; at-rest encryption (optional TDE) |
| **Backup Exposure** | HIGH | Encrypted backups; secure storage; rotation strategy doc |
| **Sensitive Data in Logs** | MEDIUM | Log sanitization; CR/LF stripping; structured JSON logging |

**Mitigations:**
- ✅ Webhook secrets encrypted with DATA_KEY_ENCRYPTION_KEY
- ✅ Master encryption key from environment; rotation documented
- ✅ Database backups encrypted
- ✅ Audit logs stored in append-only fashion
- ✅ Optional TDE (Transparent Data Encryption) via pg_tde patch

---

### 3.5 API Security Threats

| Threat | Risk | Mitigation |
|--------|------|-----------|
| **Excessive Data Exposure** | MEDIUM | Query parameter validation (limit, offset); field-level access control |
| **Mass Assignment** | MEDIUM | Whitelist fields in Prisma; no dynamic queries |
| **Rate Limiting Bypass** | MEDIUM | Rate limiting per IP + per user; distributed cache ready |
| **API Versioning Issues** | LOW | Routes versioned at /api/v1/; backward compatibility maintained |

**Mitigations:**
- ✅ Global rate limiting: 100 req/min; login-specific: 5 req/min
- ✅ Query results paginated; max 1000 items per request
- ✅ Response serialization excludes sensitive fields
- ✅ API versioning in URL; deprecation policy in headers

---

### 3.6 Infrastructure Threats

| Threat | Risk | Mitigation |
|--------|------|-----------|
| **Exposed Credentials** | CRITICAL | .env not in version control; secrets manager integration ready |
| **Unpatched Dependencies** | HIGH | Dependabot enabled; regular npm audit; SCA in CI/CD |
| **Container Escape** | MEDIUM | Non-root user in Docker; security context enforced |
| **Network Exposure** | HIGH | Private network by default; TLS at edge; firewall rules |

**Mitigations:**
- ✅ Docker images: non-root user (nodejs:1001)
- ✅ .gitignore: .env excluded; .env.example provided
- ✅ GitHub Actions: eslint, type-check, tests on PR
- ✅ Dependabot: weekly dependency scanning
- ✅ Dockerfile: multi-stage build; minimal final image

---

## 4. Real-time Alert & Detection

### Detection Rules
1. **Brute Force**: >5 failed logins in 1 minute from same IP → Alert + block
2. **Token Reuse**: Refresh token JTI mismatch → Revoke all user tokens
3. **Excessive Ingestion**: >100 readings/min from single sensor → Alert
4. **Privilege Escalation Attempt**: Unauthorized role change attempt → Log + deny

### Alerting Mechanisms
- **WebSocket Push**: Real-time alerts to connected dashboards
- **Database Logging**: Audit trail for forensics
- **Console JSON Logging**: Integration with SIEM (Datadog, Splunk, etc.)

---

## 5. Compliance & Standards

| Standard | Compliance Level | Notes |
|----------|------------------|-------|
| **OWASP ASVS** | Level 2/3 | Most L3 requirements met |
| **OWASP Top 10** | 2021 A01-A10 | All mitigated |
| **ISO 27001** | Ready | Audit trail, access control, encryption |
| **GDPR/CCPA** | Data Protection Ready | Audit logs enable user data requests |
| **NIST CSF** | Aligned | Identify, Protect, Detect, Respond |

---

## 6. Operational Security

### Recommended Hardening Steps

```bash
# 1. Rotate secrets in production
export JWT_SECRET=$(openssl rand -base64 32)
export DATA_KEY_ENCRYPTION_KEY=$(openssl rand -base64 32)
export REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)

# 2. Enable database encryption at rest
# Deploy pg_tde extension (future enhancement)

# 3. Set up TLS certificates
# Use Let's Encrypt + certbot (nginx config included)

# 4. Enable audit log export
# Export to centralized SIEM (Datadog, Splunk, etc.)

# 5. Monitor and alert
# Set up rate limit alerts
# Set up token reuse alerts
# Set up privilege change alerts
```

### Deployment Checklist
- [ ] Rotate all default secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure database backups
- [ ] Set up log aggregation
- [ ] Configure alert webhooks
- [ ] Enable network firewall
- [ ] Set resource limits (CPU, memory)
- [ ] Enable network policies
- [ ] Configure pod security policies
- [ ] Run vulnerability scans (Trivy, Snyk)

---

## 7. Incident Response

### Security Event Response Workflow
1. **Detect**: Log aggregation system detects anomaly
2. **Alert**: WebSocket alert sent to security dashboard
3. **Triage**: Security analyst reviews audit log
4. **Respond**: 
   - Block IP if DDoS
   - Revoke tokens if compromise
   - Disable account if credential breach
5. **Investigate**: Query audit logs with filters
6. **Document**: Post-incident review & playbook update

### Key Audit Log Queries
```javascript
// Find all failed login attempts for user
GET /api/v1/audit-logs?userId={id}&eventType=AUTH_LOGIN_FAILURE&limit=100

// Find token reuse attempts (security breach indicator)
GET /api/v1/audit-logs?eventType=AUTH_REFRESH_TOKEN_REUSED&severity=ERROR

// Find privilege escalation attempts
GET /api/v1/audit-logs?eventType=USER_ROLE_CHANGED&from={timestamp}

// Find validation failures (attack reconnaissance)
GET /api/v1/audit-logs?eventType=VALIDATION_FAILED&severity=WARNING
```

---

## 8. Security Review Schedule

- **Monthly**: Dependency updates & vulnerability scans
- **Quarterly**: Audit log review & trend analysis
- **Semi-Annually**: Penetration testing (external firm)
- **Annually**: Security architecture review & threat model update

---

## Contact

For security issues, contact: security@cyberforge.local

Do **NOT** open public GitHub issues for security vulnerabilities.
