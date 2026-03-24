# Nginx Configuration for CyberForge

## Development Configuration (localhost)

```nginx
# /etc/nginx/nginx.conf or infra/nginx.conf

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    '"$http_x_correlation_id"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml application/atom+xml image/svg+xml 
               text/x-js text/x-component text/x-cross-domain-policy;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=general:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Upstream servers
    upstream api_backend {
        server api:3000;
        keepalive 32;
    }

    upstream web_backend {
        server web:3001;
        keepalive 32;
    }

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2 default_server;
        server_name cyberforge.local localhost;

        # SSL certificates (development)
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_session_tickets off;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;" always;

        # Hide nginx version
        server_tokens off;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }

        # WebSocket upgrade headers
        map $http_upgrade $connection_upgrade {
            default upgrade;
            '' close;
        }

        # API reverse proxy
        location /api/ {
            # Rate limiting
            limit_req zone=general burst=10 nodelay;
            
            # Stricter rate limiting for login
            location /api/v1/auth/login {
                limit_req zone=login burst=2 nodelay;
                proxy_pass http://api_backend;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                proxy_set_header X-Correlation-ID $http_x_correlation_id;
                proxy_cache_bypass $http_pragma $http_authorization;
            }

            # Other API endpoints
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Correlation-ID $http_x_correlation_id;
            
            # Connection settings
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            proxy_buffering off;
        }

        # WebSocket endpoint
        location /socket.io/ {
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
            proxy_cache_bypass $http_upgrade;
        }

        # Static assets
        location ~^/(assets|fonts|images)/ {
            proxy_pass http://web_backend;
            proxy_set_header Host $host;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Next.js routes
        location / {
            proxy_pass http://web_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Correlation-ID $http_x_correlation_id;
            proxy_buffering off;
        }

        # Deny access to hidden files
        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }
    }
}
```

## Production Configuration (with Real SSL Certificates)

```nginx
# For production, use Let's Encrypt certificates:

server {
    listen 443 ssl http2;
    server_name cyberforge.example.com;

    # Let's Encrypt certificates
    ssl_certificate /etc/letsencrypt/live/cyberforge.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cyberforge.example.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/cyberforge.example.com/chain.pem;

    # Stronger SSL config for production
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # ... rest of configuration same as above ...
}

# Certbot renewal (cron job)
# 0 3 * * * certbot renew --quiet
```

## Generate Self-Signed Certificates (Development)

```bash
# Create self-signed certificate for testing (30 days)
openssl req -x509 -newkey rsa:4096 -keyout infra/ssl/key.pem -out infra/ssl/cert.pem -days 30 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=cyberforge.local"

# For longer validity (1 year)
openssl req -x509 -newkey rsa:4096 -keyout infra/ssl/key.pem -out infra/ssl/cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Verify certificate
openssl x509 -in infra/ssl/cert.pem -text -noout
```

## Docker Usage

In `docker-compose.yml`:

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./infra/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./infra/ssl:/etc/nginx/ssl:ro
  depends_on:
    - api
    - web
```

## Testing Nginx Configuration

```bash
# Validate syntax
nginx -t
docker run --rm -v $(pwd)/infra/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t

# Test endpoints
curl -k https://localhost/health
curl -k -X POST https://localhost/api/v1/auth/login

# Check headers
curl -k -I https://localhost/

# Test WebSocket
wscat -c wss://localhost/socket.io/?transport=websocket
```

## Performance Tuning

```nginx
# Increase buffer sizes for large payloads
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;

# Upstream keepalive
upstream api_backend {
    server api:3000;
    keepalive 32;
}

# Connection pooling
http {
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

## Monitoring

```bash
# Reload configuration without downtime
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx

# View logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Active connections
sudo ss -tlnp | grep nginx
```

---

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment instructions.
