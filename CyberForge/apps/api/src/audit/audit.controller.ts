import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole, AuditEventType } from '@prisma/client';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Audit')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
@Controller('api/v1/audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles(UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Query audit logs (SECURITY_ANALYST+)' })
  async queryLogs(
    @Query('eventType') eventType?: AuditEventType,
    @Query('userId') userId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('severity') severity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Request() req?: any,
  ) {
    return this.auditService.queryLogs({
      eventType,
      userId,
      resourceType,
      severity,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('summary')
  @Roles(UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit log summary by event type' })
  async getSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditService.countByEventType(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('suspicious-activity')
  @Roles(UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Detect suspicious activity for a user' })
  async checkSuspiciousActivity(
    @Query('userId') userId: string,
    @Query('timeWindowMinutes') timeWindowMinutes?: string,
  ) {
    return this.auditService.detectSuspiciousActivity(
      userId,
      timeWindowMinutes ? parseInt(timeWindowMinutes, 10) : 60,
    );
  }
}
