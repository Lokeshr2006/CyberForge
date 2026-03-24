import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // =========================================================================
  // SITES
  // =========================================================================

  async createSite(
    data: { name: string; location: string; description?: string; latitude?: number; longitude?: number },
    userId: string,
  ) {
    const site = await this.prisma.site.create({
      data: {
        ...data,
        createdBy: userId,
      },
    });

    await this.auditService.logEvent({
      eventType: 'SITE_CREATED',
      userId,
      resourceType: 'Site',
      resourceId: site.id,
      message: `Site created: ${site.name}`,
      severity: 'INFO',
    });

    return site;
  }

  async getSites() {
    return this.prisma.site.findMany({
      include: {
        assets: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSiteById(siteId: string) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      include: {
        assets: {
          include: {
            sensors: true,
          },
        },
      },
    });

    if (!site) {
      throw new NotFoundException(`Site ${siteId} not found`);
    }

    return site;
  }

  async updateSite(
    siteId: string,
    data: { name?: string; location?: string; description?: string; latitude?: number; longitude?: number },
    userId: string,
  ) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      throw new NotFoundException(`Site ${siteId} not found`);
    }

    const updated = await this.prisma.site.update({
      where: { id: siteId },
      data,
    });

    await this.auditService.logEvent({
      eventType: 'SITE_UPDATED',
      userId,
      resourceType: 'Site',
      resourceId: siteId,
      message: `Site updated: ${site.name}`,
      changes: JSON.stringify({ before: site, after: updated }),
      severity: 'INFO',
    });

    return updated;
  }

  // =========================================================================
  // ASSETS
  // =========================================================================

  async createAsset(
    data: {
      siteId: string;
      name: string;
      assetType: string;
      serialNumber?: string;
      description?: string;
      status?: string;
    },
    userId: string,
  ) {
    // Verify site exists
    const site = await this.prisma.site.findUnique({
      where: { id: data.siteId },
    });

    if (!site) {
      throw new NotFoundException(`Site ${data.siteId} not found`);
    }

    const asset = await this.prisma.asset.create({
      data: {
        ...data,
        createdBy: userId,
      },
    });

    await this.auditService.logEvent({
      eventType: 'ASSET_CREATED',
      userId,
      resourceType: 'Asset',
      resourceId: asset.id,
      message: `Asset created: ${asset.name} in site ${site.name}`,
      severity: 'INFO',
    });

    return asset;
  }

  async getAssets(siteId?: string) {
    return this.prisma.asset.findMany({
      where: {
        ...(siteId && { siteId }),
      },
      include: {
        sensors: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAssetById(assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        sensors: true,
        site: true,
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset ${assetId} not found`);
    }

    return asset;
  }

  // =========================================================================
  // SENSORS
  // =========================================================================

  async createSensor(
    data: {
      assetId: string;
      name: string;
      sensorType: string;
      unit: string;
      active?: boolean;
    },
    userId: string,
  ) {
    // Verify asset exists
    const asset = await this.prisma.asset.findUnique({
      where: { id: data.assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset ${data.assetId} not found`);
    }

    const sensor = await this.prisma.sensor.create({
      data: {
        ...data,
      },
    });

    await this.auditService.logEvent({
      eventType: 'SENSOR_CREATED',
      userId,
      resourceType: 'Sensor',
      resourceId: sensor.id,
      message: `Sensor created: ${sensor.name} (${sensor.sensorType}) on asset ${asset.name}`,
      severity: 'INFO',
    });

    return sensor;
  }

  async getSensors(assetId?: string) {
    return this.prisma.sensor.findMany({
      where: {
        ...(assetId && { assetId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSensorById(sensorId: string) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id: sensorId },
      include: {
        asset: {
          include: { site: true },
        },
      },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor ${sensorId} not found`);
    }

    return sensor;
  }

  // =========================================================================
  // READINGS
  // =========================================================================

  async ingestReading(
    sensorId: string,
    value: number,
    timestamp?: Date,
    ipAddress?: string,
  ) {
    // Verify sensor exists
    const sensor = await this.prisma.sensor.findUnique({
      where: { id: sensorId },
    });

    if (!sensor) {
      await this.auditService.logEvent({
        eventType: 'INGESTION_AUTH_FAILED',
        message: `Ingestion failed: sensor ${sensorId} not found`,
        ipAddress,
        severity: 'WARNING',
      });
      throw new NotFoundException(`Sensor ${sensorId} not found`);
    }

    const reading = await this.prisma.sensorReading.create({
      data: {
        sensorId,
        value,
        timestamp: timestamp || new Date(),
      },
    });

    // Update sensor's last reading timestamp
    await this.prisma.sensor.update({
      where: { id: sensorId },
      data: { lastReadingAt: new Date() },
    });

    await this.auditService.logEvent({
      eventType: 'READING_INGESTED',
      resourceType: 'SensorReading',
      resourceId: reading.id,
      message: `Reading ingested: sensor ${sensorId} = ${value}`,
      ipAddress,
      severity: 'INFO',
    });

    return reading;
  }

  async getReadings(
    sensorId: string,
    from?: Date,
    to?: Date,
    limit: number = 1000,
  ) {
    // Verify sensor exists
    const sensor = await this.prisma.sensor.findUnique({
      where: { id: sensorId },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor ${sensorId} not found`);
    }

    return this.prisma.sensorReading.findMany({
      where: {
        sensorId,
        ...(from && { timestamp: { gte: from } }),
        ...(to && { timestamp: { lte: to } }),
      },
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 10000),
    });
  }

  /**
   * Get latest reading for a sensor
   */
  async getLatestReading(sensorId: string) {
    return this.prisma.sensorReading.findFirst({
      where: { sensorId },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get statistics for a sensor's readings
   */
  async getSensorStats(sensorId: string, from?: Date, to?: Date) {
    const readings = await this.prisma.sensorReading.findMany({
      where: {
        sensorId,
        ...(from && { timestamp: { gte: from } }),
        ...(to && { timestamp: { lte: to } }),
      },
      select: { value: true },
    });

    if (readings.length === 0) {
      return {
        count: 0,
        min: null,
        max: null,
        avg: null,
      };
    }

    const values = readings.map((r) => r.value);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: readings.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / readings.length,
    };
  }
}
