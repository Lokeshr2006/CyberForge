# CyberForge Deployment Guide

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Docker Compose Deployment](#docker-compose-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Cloud Deployments (AWS, Azure, GCP)](#cloud-deployments)
5. [Production Hardening](#production-hardening)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Backup & Disaster Recovery](#backup--disaster-recovery)
8. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites
- Node.js 20 LTS or later
- PostgreSQL 14+ or use Docker
- Redis 7+ (optional, for caching)
- npm or yarn
- Docker & Docker Compose (recommended)

### Quick Start (with Docker)

```bash
# Clone the repository
git clone https://github.com/cyberforge/cyberforge.git
cd CyberForge

# Install dependencies
npm install
cd apps/api && npm install && cd ../..
cd apps/web && npm install && cd ../..

# Start services with Docker Compose
docker compose up --build

# In another terminal, run migrations & seed
docker compose exec api npx prisma migrate dev
docker compose exec api npm run seed

# Open browser
open http://localhost:3001
```

### Without Docker (Local Database)

```bash
# Prerequisites: PostgreSQL running on localhost:5432

# Create database
createdb cyberforge

# Install dependencies
npm install

# Backend setup
cd apps/api
npm install
npx prisma migrate dev
npm run seed
npm run dev

# In another terminal, frontend setup
cd apps/web
npm install
npm run dev
```

**Access**: 
- API: http://localhost:3000
- Web: http://localhost:3001
- Default user: admin@cyberforge.local / (check console output for password)

---

## Docker Compose Deployment

### Architecture

```
┌─────────────┐     ┌──────────────┐
│   Browser   │────│  Frontend     │
│ (localhost) │     │  (Next.js)    │
└─────────────┘     │  Port 3001    │
                     └──────────────┘
                            │ HTTPS
                            ▼
                     ┌──────────────┐
                     │  Reverse     │
                     │  Proxy       │
                     │  (nginx)     │
                     └──────────────┘
                            │ (internal)
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
    ▼                       ▼                       ▼
┌──────────────┐  ┌─────────────────┐  ┌───────────────┐
│  PostgreSQL  │  │   Backend API   │  │  Redis Cache  │
│  Port 5432   │  │  (NestJS)       │  │  (optional)   │
└──────────────┘  │  Port 3000      │  └───────────────┘
                  └─────────────────┘
```

### Environment Configuration

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

**Critical Variables** (must be updated for production):

```env
# Database
DATABASE_URL=postgresql://cyberforge:secure_password@db:5432/cyberforge

# JWT & Tokens
JWT_SECRET=your-random-secret-32-bytes-base64
REFRESH_TOKEN_SECRET=your-random-secret-32-bytes-base64
JWT_EXPIRY_SECONDS=900
REFRESH_TOKEN_EXPIRY_SECONDS=604800

# Encryption
DATA_KEY_ENCRYPTION_KEY=your-random-secret-32-bytes-base64

# CORS
CORS_ORIGIN=http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5

# Node
NODE_ENV=development
LOG_LEVEL=debug

# Security
SECURE_COOKIES=false  # Set to true in production with HTTPS
```

**Generate Secrets**:

```bash
# Generate 32-byte base64 strings
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # REFRESH_TOKEN_SECRET
openssl rand -base64 32  # DATA_KEY_ENCRYPTION_KEY
```

### Starting Services

```bash
# Start all services
docker compose up --build

# Detached mode (background)
docker compose up -d --build

# View logs
docker compose logs -f api   # API logs
docker compose logs -f web   # Frontend logs
docker compose logs -f db    # Database logs
docker compose logs -f       # All logs

# Stop services
docker compose down
```

### Database Initialization

```bash
# Run migrations
docker compose exec api npx prisma migrate dev

# Seed default data
docker compose exec api npm run seed

# Access PostgreSQL directly
docker compose exec db psql -U cyberforge -d cyberforge

# Backup database
docker compose exec db pg_dump -U cyberforge cyberforge > backup.sql

# Restore from backup
docker compose exec -T db psql -U cyberforge cyberforge < backup.sql
```

### Verification

```bash
# Check service health
curl http://localhost:3000/health        # API health
curl http://localhost:3001              # Web (should load login page)

# Test login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cyberforge.local","password":"YOUR_PASSWORD"}'

# Inspect database
docker compose exec db psql -U cyberforge cyberforge -c "SELECT COUNT(*) FROM \"User\";"
```

---

## Kubernetes Deployment

### Prerequisites
- Kubernetes 1.24+ cluster
- kubectl configured
- Helm 3+ (optional, for package management)
- Persistent volume provisioner (StorageClass)

### Helm Chart Installation (Recommended)

Create `helm/cyberforge/values.yaml`:

```yaml
# API Deployment
api:
  replicaCount: 3
  image:
    repository: your-registry/cyberforge-api
    tag: "1.0.0"
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  env:
    NODE_ENV: production
    LOG_LEVEL: info
  secrets:
    - name: JWT_SECRET
      value: # from external secret manager
    - name: DATABASE_URL
      value: # from external secret manager

# Frontend Deployment
web:
  replicaCount: 2
  image:
    repository: your-registry/cyberforge-web
    tag: "1.0.0"

# Database
postgresql:
  enabled: true
  auth:
    username: cyberforge
    password: # from external secret manager
    database: cyberforge
  persistence:
    size: 20Gi
    storageClassName: standard

# Redis Cache
redis:
  enabled: true
  replica:
    replicaCount: 2

# Ingress
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: cyberforge.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: cyberforge-tls
      hosts:
        - cyberforge.example.com
```

Deploy with Helm:

```bash
# Add Helm repository
helm repo add cyberforge https://charts.cyberforge.local
helm repo update

# Install release
helm install cyberforge cyberforge/cyberforge -f helm/cyberforge/values.yaml -n production

# Check deployment
kubectl get pods -n production
kubectl get svc -n production

# View logs
kubectl logs -n production -l app=cyberforge-api -f

# Upgrade
helm upgrade cyberforge cyberforge/cyberforge -f helm/cyberforge/values.yaml -n production
```

### Manual Kubernetes Manifests

Create `k8s/deployment.yaml`:

```yaml
---
# Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: cyberforge

---
# ConfigMap for non-sensitive config
apiVersion: v1
kind: ConfigMap
metadata:
  name: cyberforge-config
  namespace: cyberforge
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  RATE_LIMIT_MAX_REQUESTS: "100"

---
# Secrets from external source (e.g., Sealed Secrets, External Secrets Operator)
apiVersion: v1
kind: Secret
metadata:
  name: cyberforge-secrets
  namespace: cyberforge
type: Opaque
stringData:
  JWT_SECRET: "YOUR_SECRET_HERE"
  DATABASE_URL: "postgresql://cyberforge:password@postgres-service:5432/cyberforge"
  DATA_KEY_ENCRYPTION_KEY: "YOUR_SECRET_HERE"

---
# API Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cyberforge-api
  namespace: cyberforge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cyberforge-api
  template:
    metadata:
      labels:
        app: cyberforge-api
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: api
        image: your-registry/cyberforge-api:1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: cyberforge-config
        - secretRef:
            name: cyberforge-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5

---
# API Service
apiVersion: v1
kind: Service
metadata:
  name: cyberforge-api
  namespace: cyberforge
spec:
  type: ClusterIP
  selector:
    app: cyberforge-api
  ports:
  - port: 3000
    targetPort: 3000

---
# Frontend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cyberforge-web
  namespace: cyberforge
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cyberforge-web
  template:
    metadata:
      labels:
        app: cyberforge-web
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: web
        image: your-registry/cyberforge-web:1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3001
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10

---
# Frontend Service
apiVersion: v1
kind: Service
metadata:
  name: cyberforge-web
  namespace: cyberforge
spec:
  type: ClusterIP
  selector:
    app: cyberforge-web
  ports:
  - port: 80
    targetPort: 3001

---
# Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cyberforge-ingress
  namespace: cyberforge
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - cyberforge.example.com
    secretName: cyberforge-tls
  rules:
  - host: cyberforge.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: cyberforge-api
            port:
              number: 3000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: cyberforge-web
            port:
              number: 80
```

Deploy:

```bash
# Apply manifests
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get all -n cyberforge

# Port forward for testing
kubectl port-forward -n cyberforge svc/cyberforge-api 3000:3000
kubectl port-forward -n cyberforge svc/cyberforge-web 3001:80

# View logs
kubectl logs -n cyberforge deployment/cyberforge-api -f
```

---

## Cloud Deployments

### AWS Deployment (ECS/Fargate)

**Using ECR and Fargate**:

```bash
# Create ECR repositories
aws ecr create-repository --repository-name cyberforge-api
aws ecr create-repository --repository-name cyberforge-web

# Build and push images
docker build -f infra/Dockerfile.api -t cyberforge-api:1.0.0 .
docker build -f infra/Dockerfile.web -t cyberforge-web:1.0.0 .

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

docker tag cyberforge-api:1.0.0 YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/cyberforge-api:1.0.0
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/cyberforge-api:1.0.0

docker tag cyberforge-web:1.0.0 YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/cyberforge-web:1.0.0
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/cyberforge-web:1.0.0

# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier cyberforge-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 16.1 \
  --allocated-storage 100 \
  --master-username cyberforge \
  --master-user-password $(openssl rand -base64 32)

# Create ECS Cluster
aws ecs create-cluster --cluster-name cyberforge

# Create Task Definition (see template below)
# Deploy services with CloudFormation or AWS CDK
```

### Azure Deployment (App Service + Database)

```bash
# Create resource group
az group create --name cyberforge-rg --location eastus

# Create PostgreSQL server
az postgres server create \
  --resource-group cyberforge-rg \
  --name cyberforge-db \
  --location eastus \
  --admin-user dbadmin \
  --admin-password $(openssl rand -base64 32) \
  --sku-name B_Gen5_1 \
  --storage-size 51200

# Create App Service Plan
az appservice plan create \
  --name cyberforge-plan \
  --resource-group cyberforge-rg \
  --sku P1V2 \
  --is-linux

# Create API App Service
az webapp create \
  --resource-group cyberforge-rg \
  --plan cyberforge-plan \
  --name cyberforge-api \
  --runtime "node|20-lts"

# Deploy API
az webapp deployment source config-zip \
  --resource-group cyberforge-rg \
  --name cyberforge-api \
  --src dist-api.zip

# Create Web App Service
az webapp create \
  --resource-group cyberforge-rg \
  --plan cyberforge-plan \
  --name cyberforge-web \
  --runtime "node|20-lts"

# Deploy Web
az webapp deployment source config-zip \
  --resource-group cyberforge-rg \
  --name cyberforge-web \
  --src dist-web.zip
```

### GCP Deployment (Cloud Run + Cloud SQL)

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Create Cloud SQL PostgreSQL instance
gcloud sql instances create cyberforge-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --backup-start-time=03:00

# Deploy API to Cloud Run
gcloud run deploy cyberforge-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars DATABASE_URL=postgresql://... \
  --allow-unauthenticated

# Deploy Web to Cloud Run
gcloud run deploy cyberforge-web \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 256Mi \
  --cpu 1 \
  --allow-unauthenticated
```

---

## Production Hardening

### Security Configuration

**1. HTTPS/TLS Setup**

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name cyberforge.example.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/cyberforge.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cyberforge.example.com/privkey.pem;

    # TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Content-Security-Policy "default-src 'self'" always;

    # API reverse proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Web reverse proxy
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name cyberforge.example.com;
    return 301 https://$server_name$request_uri;
}
```

**2. Environment Secrets**

Use secrets management:
- **Kubernetes**: Sealed Secrets, External Secrets Operator
- **AWS**: AWS Secrets Manager, Parameter Store
- **Azure**: Azure Key Vault
- **GCP**: Secret Manager
- **Self-hosted**: HashiCorp Vault

```bash
# Example: Kubernetes Sealed Secrets
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

echo -n '{"JWT_SECRET":"YOUR_SECRET"}' | kubectl create secret generic cyberforge-secrets --dry-run=client --from-file=/dev/stdin | kubeseal -f -
```

**3. Database Security**

```sql
-- PostgreSQL hardening

-- Create restricted user (non-admin)
CREATE ROLE cyberforge_api WITH LOGIN PASSWORD 'secure_password';

-- Grant minimal permissions
GRANT CONNECT ON DATABASE cyberforge TO cyberforge_api;
GRANT USAGE ON SCHEMA public TO cyberforge_api;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO cyberforge_api;

-- Require SSL connections
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/etc/postgresql/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/postgresql/server.key';

-- Enable audit logging
CREATE EXTENSION IF NOT EXISTS pgaudit;
ALTER SYSTEM SET shared_preload_libraries = 'pgaudit';
ALTER SYSTEM SET pgaudit.log = 'ALL';

-- Apply changes
SELECT pg_reload_conf();
```

**4. Monitoring & Logging**

```yaml
# fluent-bit.conf (log aggregation)
[INPUT]
    Name              tail
    Path              /var/log/cyberforge/*.log
    Parser            json
    Tag               cyberforge.*

[OUTPUT]
    Name              es
    Match             cyberforge.*
    Host              elasticsearch.example.com
    Port              9200
    Retry_Limit       5
    Type              _doc
```

---

## Monitoring & Alerting

### Prometheus Metrics

Add to NestJS:

```typescript
// src/common/metrics/prometheus.module.ts
import { Counter, Histogram } from 'prom-client';

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
});
```

Prometheus scrape config:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'cyberforge-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Grafana Dashboards

Import dashboards from Grafana Cloud or create custom:

```json
{
  "dashboard": {
    "title": "CyberForge API Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{"expr": "rate(http_requests_total[5m])"}]
      },
      {
        "title": "Error Rate",
        "targets": [{"expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])"}]
      },
      {
        "title": "Database Connections",
        "targets": [{"expr": "pg_stat_activity_count"}]
      }
    ]
  }
}
```

### Alert Rules

```yaml
# alert-rules.yml
groups:
- name: cyberforge
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
    for: 5m
    annotations:
      summary: "High error rate detected"

  - alert: BruteForceDetected
    expr: increase(auth_failed_attempts[1m]) > 5
    for: 1m
    annotations:
      summary: "Brute force login attempt detected"

  - alert: HighLatency
    expr: histogram_quantile(0.95, http_request_duration_seconds) > 5
    for: 5m
    annotations:
      summary: "API latency above 5 seconds"
```

---

## Backup & Disaster Recovery

### Automated Backups

**PostgreSQL Backups**:

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/cyberforge"
DB_NAME="cyberforge"
DB_USER="cyberforge"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/cyberforge_$TIMESTAMP.sql.gz

# Encrypt backup
gpg --symmetric --cipher-algo AES256 $BACKUP_DIR/cyberforge_$TIMESTAMP.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/cyberforge_$TIMESTAMP.sql.gz.gpg s3://cyberforge-backups/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "cyberforge_*.sql.gz.gpg" -mtime +30 -delete
```

Schedule with cron:

```bash
# Run daily at 2 AM
0 2 * * * /scripts/backup.sh
```

### Disaster Recovery Plan

1. **RTO**: 4 hours (Recovery Time Objective)
2. **RPO**: 1 hour (Recovery Point Objective)

**Steps**:

```bash
# 1. Restore database from backup
aws s3 cp s3://cyberforge-backups/cyberforge_latest.sql.gz.gpg .
gpg --decrypt cyberforge_latest.sql.gz.gpg | gunzip | psql -U cyberforge cyberforge

# 2. Restore application code
git clone https://github.com/cyberforge/cyberforge.git
cd cyberforge
git checkout v1.0.0

# 3. Rebuild Docker images
docker build -f infra/Dockerfile.api -t cyberforge-api:1.0.0 .
docker build -f infra/Dockerfile.web -t cyberforge-web:1.0.0 .

# 4. Deploy with Docker Compose
docker compose up -d

# 5. Verify health
curl http://localhost:3000/health
curl http://localhost:3001
```

---

## Troubleshooting

### Common Issues

**Issue**: "Connection refused on localhost:3000"
```bash
# Check if container is running
docker ps | grep api

# Check logs
docker compose logs api

# Restart service
docker compose restart api
```

**Issue**: "Database connection error"
```bash
# Test connection
psql postgresql://cyberforge:password@localhost:5432/cyberforge

# Check migrations
docker compose exec api npx prisma migrate status

# Run migrations
docker compose exec api npx prisma migrate dev
```

**Issue**: "CORS error in browser"
```bash
# Verify CORS_ORIGIN in .env
grep CORS_ORIGIN .env

# Ensure it matches frontend URL
# http://localhost:3001 for dev
# https://cyberforge.example.com for prod
```

**Issue**: "Login fails with 'Invalid credentials'"
```bash
# Check seed script output for default password
docker compose logs api | grep -i password

# Reset user password
docker compose exec db psql -U cyberforge cyberforge
UPDATE "User" SET "passwordHash"='$argon2id$...' WHERE "email"='admin@cyberforge.local';
```

### Performance Tuning

**Database**:
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "SensorReading" WHERE "sensorId"='...' LIMIT 1000;

-- Create indexes
CREATE INDEX idx_sensor_reading_sensor_id ON "SensorReading"("sensorId");
CREATE INDEX idx_sensor_reading_timestamp ON "SensorReading"("timestamp" DESC);
CREATE INDEX idx_audit_log_user_id ON "AuditLog"("userId");
```

**API**:
```typescript
// Enable caching
@Cacheable({
  ttl: 300, // 5 minutes
})
async getSensorReadings(sensorId: string) {
  // ...
}

// Connection pooling (already configured in Prisma)
// Adjust in .env:
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
```

---

## Support

For deployment issues:
- GitHub Issues: https://github.com/cyberforge/cyberforge/issues
- Email: support@cyberforge.local
- Slack: #cyberforge-deployment
