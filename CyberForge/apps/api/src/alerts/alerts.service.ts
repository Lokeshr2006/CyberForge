import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AlertsGateway } from './alerts.gateway';
import { AlertSeverity } from '@prisma/client';

interface AlertCondition {
  type: 'threshold' | 'anomaly' | 'rate';
  threshold?: number;
  operator?: '>' | '<' | '==' | '!=';
  windowSize?: number;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private alertsGateway: AlertsGateway,
  ) {}

  /**
   * Create alert rule
   */
  async createAlertRule(
    data: {
      name: string;
      description?: string;
      sensorId?: string;
      assetId?: string;
      siteId?: string;
      condition: AlertCondition;
      severity: AlertSeverity;
      enabled?: boolean;
    },
    userId: string,
  ) {
    const rule = await this.prisma.alertRule.create({
      data: {
        ...data,
        condition: JSON.stringify(data.condition),
        createdBy: userId,
      },
    });

    await this.auditService.logEvent({
      eventType: 'ALERT_RULE_CREATED',
      userId,
      resourceType: 'AlertRule',
      resourceId: rule.id,
      message: `Alert rule created: ${rule.name}`,
      severity: 'INFO',
    });

    return rule;
  }

  /**
   * Get all alert rules
   */
  async getAlertRules(filters?: { enabled?: boolean; severity?: AlertSeverity }) {
    return this.prisma.alertRule.findMany({
      where: {
        ...(filters?.enabled !== undefined && { enabled: filters.enabled }),
        ...(filters?.severity && { severity: filters.severity }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get alert rule by ID
   */
  async getAlertRuleById(ruleId: string) {
    const rule = await this.prisma.alertRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException(`Alert rule ${ruleId} not found`);
    }

    return rule;
  }

  /**
   * Get alert events
   */
  async getAlertEvents(filters?: {
    status?: string;
    severity?: AlertSeverity;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const { status, severity, from, to, limit = 100 } = filters || {};

    return this.prisma.alertEvent.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(severity && { severity }),
        ...(from && { detectedAt: { gte: from } }),
        ...(to && { detectedAt: { lte: to } }),
      },
      include: {
        rule: true,
      },
      orderBy: { detectedAt: 'desc' },
      take: Math.min(limit, 1000),
    });
  }

  /**
   * Trigger alert: evaluate conditions and create alert event if needed
   */
  async evaluateAndTriggerAlert(ruleId: string, sensorId: string, value: number) {
    const rule = await this.getAlertRuleById(ruleId);

    if (!rule.enabled) {
      return null;
    }

    const condition = JSON.parse(rule.condition) as AlertCondition;
    let shouldTrigger = false;

    // Evaluate condition based on type
    if (condition.type === 'threshold' && condition.threshold !== undefined) {
      const operator = condition.operator || '>';
      if (operator === '>') {
        shouldTrigger = value > condition.threshold;
      } else if (operator === '<') {
        shouldTrigger = value < condition.threshold;
      } else if (operator === '==') {
        shouldTrigger = value === condition.threshold;
      } else if (operator === '!=') {
        shouldTrigger = value !== condition.threshold;
      }
    }

    if (!shouldTrigger) {
      return null;
    }

    // Check for existing active alert for this rule
    const existingAlert = await this.prisma.alertEvent.findFirst({
      where: {
        ruleId,
        status: 'ACTIVE',
      },
    });

    if (existingAlert) {
      // Alert already active, don't duplicate
      return existingAlert;
    }

    // Create new alert event
    const message = `${rule.name}: sensor value ${value} triggers rule condition`;
    const alertEvent = await this.prisma.alertEvent.create({
      data: {
        ruleId,
        message,
        severity: rule.severity,
        status: 'ACTIVE',
      },
    });

    // Log alert event
    await this.auditService.logEvent({
      eventType: 'ALERT_EVENT_DETECTED',
      resourceType: 'AlertEvent',
      resourceId: alertEvent.id,
      message,
      severity: 'WARNING',
    });

    // Push to connected WebSocket clients
    this.alertsGateway.broadcastAlert({
      id: alertEvent.id,
      ruleId,
      message,
      severity: rule.severity,
      detectedAt: alertEvent.detectedAt,
    });

    return alertEvent;
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, userId: string) {
    const alert = await this.prisma.alertEvent.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    const updated = await this.prisma.alertEvent.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });

    await this.auditService.logEvent({
      eventType: 'ALERT_EVENT_ACKNOWLEDGED',
      userId,
      resourceType: 'AlertEvent',
      resourceId: alertId,
      message: `Alert acknowledged`,
      severity: 'INFO',
    });

    return updated;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, userId: string) {
    const alert = await this.prisma.alertEvent.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    const updated = await this.prisma.alertEvent.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });

    await this.auditService.logEvent({
      eventType: 'ALERT_EVENT_RESOLVED',
      userId,
      resourceType: 'AlertEvent',
      resourceId: alertId,
      message: `Alert resolved`,
      severity: 'INFO',
    });

    return updated;
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(from?: Date, to?: Date) {
    const where = {
      ...(from && { detectedAt: { gte: from } }),
      ...(to && { detectedAt: { lte: to } }),
    };

    const [total, critical, high, active, resolved] = await Promise.all([
      this.prisma.alertEvent.count({ where }),
      this.prisma.alertEvent.count({
        where: { ...where, severity: AlertSeverity.CRITICAL },
      }),
      this.prisma.alertEvent.count({
        where: { ...where, severity: AlertSeverity.HIGH },
      }),
      this.prisma.alertEvent.count({
        where: { ...where, status: 'ACTIVE' },
      }),
      this.prisma.alertEvent.count({
        where: { ...where, status: 'RESOLVED' },
      }),
    ]);

    return {
      total,
      critical,
      high,
      active,
      resolved,
    };
  }
}
