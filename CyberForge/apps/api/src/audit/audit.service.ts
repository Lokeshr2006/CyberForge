import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditEventType } from '@prisma/client';

interface LogEventInput {
  eventType: AuditEventType;
  userId?: string | null;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  changes?: string;
  ipAddress?: string;
  userAgent?: string;
  message: string;
  correlationId?: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
}

/**
 * Audit logging service
 * 
 * Features:
 * - Log all security-relevant events
 * - Sanitize user inputs to prevent log injection
 * - Store in database for tamper-aware auditing
 * - Output to console (JSON format for log aggregation)
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log a security event
   * Sanitizes inputs to prevent log injection (CRLF attack)
   */
  async logEvent(input: LogEventInput): Promise<void> {
    // Sanitize strings to prevent log injection
    const sanitized: LogEventInput = {
      ...input,
      message: this.sanitize(input.message),
      userAgent: input.userAgent ? this.sanitize(input.userAgent) : undefined,
      ipAddress: input.ipAddress ? this.validateIpAddress(input.ipAddress) : undefined,
      changes: input.changes ? this.sanitize(input.changes) : undefined,
    };

    try {
      // Store in database
      const auditLog = await this.prisma.auditLog.create({
        data: {
          eventType: sanitized.eventType,
          userId: sanitized.userId,
          resourceType: sanitized.resourceType,
          resourceId: sanitized.resourceId,
          action: sanitized.action,
          changes: sanitized.changes,
          ipAddress: sanitized.ipAddress,
          userAgent: sanitized.userAgent,
          message: sanitized.message,
          correlationId: sanitized.correlationId,
          severity: sanitized.severity,
        },
      });

      // Log to console (JSON format for aggregation)
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: sanitized.severity,
        event: sanitized.eventType,
        message: sanitized.message,
        userId: sanitized.userId,
        resourceType: sanitized.resourceType,
        ipAddress: sanitized.ipAddress,
        correlationId: sanitized.correlationId,
      };

      if (sanitized.severity === 'ERROR') {
        this.logger.error(JSON.stringify(logEntry));
      } else if (sanitized.severity === 'WARNING') {
        this.logger.warn(JSON.stringify(logEntry));
      } else {
        this.logger.log(JSON.stringify(logEntry));
      }
    } catch (error) {
      this.logger.error(`Failed to log audit event: ${error.message}`);
    }
  }

  /**
   * Query audit logs (SECURITY_ANALYST+ only)
   */
  async queryLogs(
    filters: {
      eventType?: AuditEventType;
      userId?: string;
      resourceType?: string;
      severity?: string;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const {
      eventType,
      userId,
      resourceType,
      severity,
      from,
      to,
      limit = 100,
      offset = 0,
    } = filters;

    return this.prisma.auditLog.findMany({
      where: {
        ...(eventType && { eventType }),
        ...(userId && { userId }),
        ...(resourceType && { resourceType }),
        ...(severity && { severity }),
        ...(from && { createdAt: { gte: from } }),
        ...(to && { createdAt: { lte: to } }),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 1000), // Cap at 1000
      skip: offset,
      select: {
        id: true,
        eventType: true,
        userId: true,
        resourceType: true,
        resourceId: true,
        message: true,
        severity: true,
        ipAddress: true,
        correlationId: true,
        createdAt: true,
      },
    });
  }

  /**
   * Count audit logs by event type
   */
  async countByEventType(from?: Date, to?: Date) {
    const logs = await this.prisma.auditLog.groupBy({
      by: ['eventType'],
      where: {
        ...(from && { createdAt: { gte: from } }),
        ...(to && { createdAt: { lte: to } }),
      },
      _count: true,
    });

    return logs.map((log) => ({
      eventType: log.eventType,
      count: log._count,
    }));
  }

  /**
   * Detect suspicious patterns
   */
  async detectSuspiciousActivity(userId: string, timeWindowMinutes: number = 60) {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    const failedLogins = await this.prisma.auditLog.count({
      where: {
        userId,
        eventType: 'AUTH_LOGIN_FAILURE',
        createdAt: { gte: since },
      },
    });

    const tokenReuses = await this.prisma.auditLog.count({
      where: {
        userId,
        eventType: 'AUTH_REFRESH_TOKEN_REUSED',
        createdAt: { gte: since },
      },
    });

    return {
      suspiciousLoginAttempts: failedLogins,
      tokenReuseAttempts: tokenReuses,
      riskLevel: failedLogins > 5 || tokenReuses > 0 ? 'HIGH' : 'NORMAL',
    };
  }

  /**
   * Sanitize string to prevent log injection (CRLF attack)
   */
  private sanitize(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    return input.replace(/[\r\n]/g, ' ').slice(0, 500); // Also cap length
  }

  /**
   * Validate IP address format
   */
  private validateIpAddress(ip: string): string {
    // Basic validation: ensure it looks like an IP
    const ipRegex =
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    if (!ipRegex.test(ip)) {
      return 'unknown';
    }
    return ip.slice(0, 45); // Cap IPv6 length
  }
}
