import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  private readonly config: Map<string, string | number | boolean>;

  constructor() {
    this.config = new Map();
    this.loadEnv();
  }

  private loadEnv(): void {
    // Database
    this.set('DATABASE_URL', process.env.DATABASE_URL || '');
    this.set('DATABASE_POOL_SIZE', parseInt(process.env.DATABASE_POOL_SIZE || '10', 10));

    // API
    this.set('API_PORT', parseInt(process.env.API_PORT || '3000', 10));
    this.set('API_HOST', process.env.API_HOST || '0.0.0.0');
    this.set('NODE_ENV', process.env.NODE_ENV || 'development');
    this.set('API_LOG_LEVEL', process.env.API_LOG_LEVEL || 'info');

    // JWT Configuration
    this.set('JWT_SECRET', process.env.JWT_SECRET || 'dev-jwt-secret');
    this.set('JWT_EXPIRATION', parseInt(process.env.JWT_EXPIRATION || '900', 10)); // 15 min
    this.set('REFRESH_TOKEN_SECRET', process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret');
    this.set(
      'REFRESH_TOKEN_EXPIRATION',
      parseInt(process.env.REFRESH_TOKEN_EXPIRATION || '604800', 10),
    ); // 7 days

    // Data Encryption
    this.set('DATA_KEY_ENCRYPTION_KEY', process.env.DATA_KEY_ENCRYPTION_KEY || 'dev-encryption-key');

    // Rate Limiting
    this.set('RATE_LIMIT_WINDOW_MS', parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10));
    this.set('RATE_LIMIT_MAX_REQUESTS', parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10));
    this.set(
      'LOGIN_RATE_LIMIT_WINDOW_MS',
      parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '60000', 10),
    );
    this.set('LOGIN_RATE_LIMIT_MAX_REQUESTS', parseInt(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS || '5', 10));

    // CORS
    this.set('CORS_ORIGIN', process.env.CORS_ORIGIN || 'http://localhost:3001');
    this.set('CORS_CREDENTIALS', process.env.CORS_CREDENTIALS === 'true');

    // Session
    this.set('SESSION_SECRET', process.env.SESSION_SECRET || 'dev-session-secret');

    // Redis
    this.set('REDIS_ENABLED', process.env.REDIS_ENABLED === 'true');
    this.set('REDIS_URL', process.env.REDIS_URL || 'redis://localhost:6379');
    this.set('REDIS_PASSWORD', process.env.REDIS_PASSWORD || '');
    this.set('REDIS_DB', parseInt(process.env.REDIS_DB || '0', 10));

    // SMTP
    this.set('SMTP_ENABLED', process.env.SMTP_ENABLED === 'true');
    this.set('SMTP_HOST', process.env.SMTP_HOST || '');
    this.set('SMTP_PORT', parseInt(process.env.SMTP_PORT || '587', 10));
    this.set('SMTP_USER', process.env.SMTP_USER || '');
    this.set('SMTP_PASSWORD', process.env.SMTP_PASSWORD || '');
    this.set('SMTP_FROM', process.env.SMTP_FROM || '');

    // Logging
    this.set('LOG_FORMAT', process.env.LOG_FORMAT || 'json');
    this.set('SENTRY_DSN', process.env.SENTRY_DSN || '');

    // Security Headers
    this.set('ENABLE_HSTS', process.env.ENABLE_HSTS !== 'false');
    this.set('HSTS_MAX_AGE', parseInt(process.env.HSTS_MAX_AGE || '31536000', 10));
    this.set('ENABLE_CSP', process.env.ENABLE_CSP !== 'false');
    this.set('CSP_HEADER', process.env.CSP_HEADER || "default-src 'self'");

    // Ingestion
    this.set('INGESTION_API_KEY_HEADER', process.env.INGESTION_API_KEY_HEADER || 'X-API-Key');
    this.set('INGESTION_REQUIRE_MTLS', process.env.INGESTION_REQUIRE_MTLS === 'true');

    // Feature Flags
    this.set('ENABLE_WEBHOOK_NOTIFICATIONS', process.env.ENABLE_WEBHOOK_NOTIFICATIONS !== 'false');
    this.set('ENABLE_REAL_TIME_ALERTS', process.env.ENABLE_REAL_TIME_ALERTS !== 'false');
    this.set('ENABLE_AUDIT_LOG_EXPORT', process.env.ENABLE_AUDIT_LOG_EXPORT !== 'false');
  }

  private set(key: string, value: any): void {
    this.config.set(key, value);
  }

  get(key: string, defaultValue?: any): any {
    if (!this.config.has(key)) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Configuration key "${key}" not found`);
    }
    return this.config.get(key);
  }

  has(key: string): boolean {
    return this.config.has(key);
  }

  isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  isTesting(): boolean {
    return this.get('NODE_ENV') === 'test';
  }
}
