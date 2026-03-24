import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (in order to respect FK constraints)
  await prisma.alertEvent.deleteMany({});
  await prisma.alertRule.deleteMany({});
  await prisma.sensorReading.deleteMany({});
  await prisma.sensor.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});

  // Create users with strong temporary passwords
  const passwords = {
    admin: Math.random().toString(36).slice(-12),
    analyst: Math.random().toString(36).slice(-12),
    operator: Math.random().toString(36).slice(-12),
    viewer: Math.random().toString(36).slice(-12),
  };

  const adminHash = await argon2.hash(passwords.admin, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  const analystHash = await argon2.hash(passwords.analyst, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  const operatorHash = await argon2.hash(passwords.operator, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  const viewerHash = await argon2.hash(passwords.viewer, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@cyberforge.local',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  const analyst = await prisma.user.create({
    data: {
      email: 'analyst@cyberforge.local',
      passwordHash: analystHash,
      firstName: 'Security',
      lastName: 'Analyst',
      role: 'SECURITY_ANALYST',
    },
  });

  const operator = await prisma.user.create({
    data: {
      email: 'operator@cyberforge.local',
      passwordHash: operatorHash,
      firstName: 'Field',
      lastName: 'Operator',
      role: 'OPERATOR',
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@cyberforge.local',
      passwordHash: viewerHash,
      firstName: 'Data',
      lastName: 'Viewer',
      role: 'VIEWER',
    },
  });

  // Create sample sites
  const site1 = await prisma.site.create({
    data: {
      name: 'Industrial Complex A',
      location: 'Chicago, IL',
      description: 'Main manufacturing facility',
      latitude: 41.8781,
      longitude: -87.6298,
      createdBy: admin.id,
    },
  });

  const site2 = await prisma.site.create({
    data: {
      name: 'Distribution Center B',
      location: 'Dallas, TX',
      description: 'Regional distribution hub',
      latitude: 32.7767,
      longitude: -96.797,
      createdBy: admin.id,
    },
  });

  // Create assets for site 1
  const asset1 = await prisma.asset.create({
    data: {
      siteId: site1.id,
      name: 'Pump Unit A-1',
      assetType: 'pump',
      serialNumber: 'PMP-2024-001',
      description: 'Primary circulation pump',
      status: 'operational',
      createdBy: operator.id,
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      siteId: site1.id,
      name: 'Reactor Vessel R-1',
      assetType: 'reactor',
      serialNumber: 'RXR-2024-001',
      description: 'Main reaction chamber',
      status: 'operational',
      createdBy: operator.id,
    },
  });

  // Create assets for site 2
  const asset3 = await prisma.asset.create({
    data: {
      siteId: site2.id,
      name: 'Compressor Unit C-1',
      assetType: 'compressor',
      serialNumber: 'CMP-2024-001',
      description: 'Air compression system',
      status: 'operational',
      createdBy: operator.id,
    },
  });

  // Create sensors
  const sensor1 = await prisma.sensor.create({
    data: {
      assetId: asset1.id,
      name: 'Temperature Sensor A-1-T',
      sensorType: 'temperature',
      unit: '°C',
      active: true,
    },
  });

  const sensor2 = await prisma.sensor.create({
    data: {
      assetId: asset1.id,
      name: 'Pressure Sensor A-1-P',
      sensorType: 'pressure',
      unit: 'PSI',
      active: true,
    },
  });

  const sensor3 = await prisma.sensor.create({
    data: {
      assetId: asset2.id,
      name: 'Temperature Sensor R-1-T',
      sensorType: 'temperature',
      unit: '°C',
      active: true,
    },
  });

  const sensor4 = await prisma.sensor.create({
    data: {
      assetId: asset3.id,
      name: 'Vibration Sensor C-1-V',
      sensorType: 'vibration',
      unit: 'mm/s',
      active: true,
    },
  });

  // Create sample readings for the past 24 hours
  const now = new Date();
  const readings = [];

  for (let i = 24; i > 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);

    // Sensor 1: Temperature (normal range 20-30°C)
    readings.push(
      prisma.sensorReading.create({
        data: {
          sensorId: sensor1.id,
          value: 20 + Math.random() * 10,
          timestamp,
        },
      }),
    );

    // Sensor 2: Pressure (normal range 40-60 PSI)
    readings.push(
      prisma.sensorReading.create({
        data: {
          sensorId: sensor2.id,
          value: 40 + Math.random() * 20,
          timestamp,
        },
      }),
    );

    // Sensor 3: Temperature (normal range 50-80°C)
    readings.push(
      prisma.sensorReading.create({
        data: {
          sensorId: sensor3.id,
          value: 50 + Math.random() * 30,
          timestamp,
        },
      }),
    );

    // Sensor 4: Vibration (normal range 0-5 mm/s)
    readings.push(
      prisma.sensorReading.create({
        data: {
          sensorId: sensor4.id,
          value: Math.random() * 5,
          timestamp,
        },
      }),
    );
  }

  await Promise.all(readings);

  // Create alert rules
  const rule1 = await prisma.alertRule.create({
    data: {
      name: 'High Temperature Alert',
      description: 'Alert if reactor temperature exceeds 90°C',
      sensorId: sensor3.id,
      severity: 'HIGH',
      enabled: true,
      condition: JSON.stringify({
        type: 'threshold',
        threshold: 90,
        operator: '>',
      }),
      createdBy: analyst.id,
    },
  });

  const rule2 = await prisma.alertRule.create({
    data: {
      name: 'Low Pressure Alert',
      description: 'Alert if pump pressure drops below 35 PSI',
      sensorId: sensor2.id,
      severity: 'MEDIUM',
      enabled: true,
      condition: JSON.stringify({
        type: 'threshold',
        threshold: 35,
        operator: '<',
      }),
      createdBy: analyst.id,
    },
  });

  const rule3 = await prisma.alertRule.create({
    data: {
      name: 'Excessive Vibration Alert',
      description: 'Alert if compressor vibration exceeds 8 mm/s',
      sensorId: sensor4.id,
      severity: 'CRITICAL',
      enabled: true,
      condition: JSON.stringify({
        type: 'threshold',
        threshold: 8,
        operator: '>',
      }),
      createdBy: analyst.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📋 Default Users (SAVE THESE PASSWORDS IMMEDIATELY):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Admin (ADMIN)`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Password: ${passwords.admin}`);
  console.log('');
  console.log(`Security Analyst (SECURITY_ANALYST)`);
  console.log(`  Email: ${analyst.email}`);
  console.log(`  Password: ${passwords.analyst}`);
  console.log('');
  console.log(`Field Operator (OPERATOR)`);
  console.log(`  Email: ${operator.email}`);
  console.log(`  Password: ${passwords.operator}`);
  console.log('');
  console.log(`Data Viewer (VIEWER)`);
  console.log(`  Email: ${viewer.email}`);
  console.log(`  Password: ${passwords.viewer}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📊 Sample Data Created:');
  console.log(`  - ${2} sites`);
  console.log(`  - ${3} assets`);
  console.log(`  - ${4} sensors`);
  console.log(`  - ${4 * 24} sensor readings (past 24 hours)`);
  console.log(`  - ${3} alert rules`);
  console.log('');
  console.log('🚀 Ready to go! Visit http://localhost:3001 to log in.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
