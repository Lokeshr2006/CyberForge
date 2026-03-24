import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import { AppModule } from './app.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  // Security: Helmet for secure headers
  app.use(helmet.default());

  // Security: Custom security headers
  app.use(new SecurityHeadersMiddleware());

  // CORS Configuration
  const corsOrigin = configService.get('CORS_ORIGIN') || 'http://localhost:3001';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-ID'],
  });

  // Correlation ID middleware
  app.use(new CorrelationIdMiddleware());

  // Global validation pipe with strict settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
        }));
        return new BadRequestException({
          message: 'Validation failed',
          errors: messages,
        });
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter(configService));

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('CyberForge API')
    .setDescription('Secure Industrial Data Platform API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'Ingestion API Key for sensor data',
      },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get('API_PORT') || 3000;
  const host = configService.get('API_HOST') || '0.0.0.0';

  await app.listen(port, host, () => {
    console.log(`🚀 CyberForge API running on ${host}:${port}`);
    console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
  });
}

bootstrap();
