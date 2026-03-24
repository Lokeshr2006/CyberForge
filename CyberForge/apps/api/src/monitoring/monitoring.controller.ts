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
import { UserRole } from '@prisma/client';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Monitoring')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
@Controller('api/v1')
export class MonitoringController {
  constructor(private monitoringService: MonitoringService) {}

  // =========================================================================
  // SITES
  // =========================================================================

  @Get('sites')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all sites (VIEWER+)' })
  async getSites() {
    return this.monitoringService.getSites();
  }

  @Get('sites/:id')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get site by ID with assets (VIEWER+)' })
  async getSiteById(@Param('id') siteId: string) {
    return this.monitoringService.getSiteById(siteId);
  }

  @Post('sites')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create site (ADMIN)' })
  async createSite(
    @Body() body: any,
    @Request() req,
  ) {
    return this.monitoringService.createSite(body, req.user.id);
  }

  @Patch('sites/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update site (ADMIN)' })
  async updateSite(
    @Param('id') siteId: string,
    @Body() body: any,
    @Request() req,
  ) {
    return this.monitoringService.updateSite(siteId, body, req.user.id);
  }

  // =========================================================================
  // ASSETS
  // =========================================================================

  @Get('assets')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'List assets (optionally filtered by siteId)' })
  async getAssets(@Query('siteId') siteId?: string) {
    return this.monitoringService.getAssets(siteId);
  }

  @Get('assets/:id')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get asset by ID with sensors' })
  async getAssetById(@Param('id') assetId: string) {
    return this.monitoringService.getAssetById(assetId);
  }

  @Post('assets')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create asset (OPERATOR+)' })
  async createAsset(
    @Body() body: any,
    @Request() req,
  ) {
    return this.monitoringService.createAsset(body, req.user.id);
  }

  // =========================================================================
  // SENSORS
  // =========================================================================

  @Get('sensors')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'List sensors (optionally filtered by assetId)' })
  async getSensors(@Query('assetId') assetId?: string) {
    return this.monitoringService.getSensors(assetId);
  }

  @Get('sensors/:id')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get sensor by ID' })
  async getSensorById(@Param('id') sensorId: string) {
    return this.monitoringService.getSensorById(sensorId);
  }

  @Post('sensors')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create sensor (OPERATOR+)' })
  async createSensor(
    @Body() body: any,
    @Request() req,
  ) {
    return this.monitoringService.createSensor(body, req.user.id);
  }

  // =========================================================================
  // READINGS
  // =========================================================================

  @Post('readings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ingest sensor reading (protected with API key or JWT)' })
  async ingestReading(
    @Body() body: { sensorId: string; value: number; timestamp?: string },
    @Request() req,
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    return this.monitoringService.ingestReading(
      body.sensorId,
      body.value,
      body.timestamp ? new Date(body.timestamp) : undefined,
      ipAddress,
    );
  }

  @Get('readings')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get readings for a sensor (query params: sensorId, from, to, limit)' })
  async getReadings(
    @Query('sensorId') sensorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.monitoringService.getReadings(
      sensorId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      limit ? parseInt(limit, 10) : 1000,
    );
  }

  @Get('readings/:sensorId/latest')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get latest reading for sensor' })
  async getLatestReading(@Param('sensorId') sensorId: string) {
    return this.monitoringService.getLatestReading(sensorId);
  }

  @Get('readings/:sensorId/stats')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.SECURITY_ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get reading statistics (min, max, avg)' })
  async getReadingStats(
    @Param('sensorId') sensorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.monitoringService.getSensorStats(
      sensorId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
