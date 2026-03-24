import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole, AlertSeverity } from '@prisma/client';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Alerts')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
@Controller('api/v1')
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  // =========================================================================
  // ALERT RULES
  // =========================================================================

  @Post('alert-rules')
  @Roles(UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create alert rule (SECURITY_ANALYST+)' })
  async createAlertRule(@Body() body: any, @Request() req) {
    return this.alertsService.createAlertRule(body, req.user.id);
  }

  @Get('alert-rules')
  @Roles(UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'List alert rules' })
  async getAlertRules(
    @Query('enabled') enabled?: string,
    @Query('severity') severity?: AlertSeverity,
  ) {
    return this.alertsService.getAlertRules({
      enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
      severity,
    });
  }

  @Get('alert-rules/:id')
  @Roles(UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get alert rule by ID' })
  async getAlertRuleById(@Param('id') ruleId: string) {
    return this.alertsService.getAlertRuleById(ruleId);
  }

  // =========================================================================
  // ALERT EVENTS
  // =========================================================================

  @Get('alert-events')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'List alert events with real-time WebSocket support' })
  async getAlertEvents(
    @Query('status') status?: string,
    @Query('severity') severity?: AlertSeverity,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alertsService.getAlertEvents({
      status,
      severity,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  @Patch('alert-events/:id/acknowledge')
  @Roles(UserRole.OPERATOR, UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge alert' })
  async acknowledgeAlert(@Param('id') alertId: string, @Request() req) {
    return this.alertsService.acknowledgeAlert(alertId, req.user.id);
  }

  @Patch('alert-events/:id/resolve')
  @Roles(UserRole.OPERATOR, UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve alert' })
  async resolveAlert(@Param('id') alertId: string, @Request() req) {
    return this.alertsService.resolveAlert(alertId, req.user.id);
  }

  // =========================================================================
  // STATISTICS
  // =========================================================================

  @Get('alert-stats')
  @Roles(UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get alert statistics' })
  async getAlertStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.alertsService.getAlertStats(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
