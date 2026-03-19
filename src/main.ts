import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('ProductRegistryService');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', process.env.NODE_ENV || 'development');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  if (nodeEnv === 'production') {
    app.use(
      helmet.hsts({
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      }),
    );
  }

  app.use(compression());

  // Global prefix for all routes (except health)
  app.setGlobalPrefix('api/v1', {
    exclude: ['/health'],
  });

  // CORS is handled by API Gateway - no need to configure here

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation setup (non-production only)
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Noveu Product Registry')
      .setDescription('Noveu Solutions Product Registry Service - Product catalog, release management, and artifact distribution')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('products', 'Product catalog management')
      .addTag('releases', 'Release version management')
      .addTag('artifacts', 'Build artifact management')
      .addTag('health', 'Service health and monitoring')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showRequestHeaders: true,
      },
    });

    logger.log('Swagger documentation available at /api/docs');
  }

  // Get port from environment
  const port = configService.get('PORT') || 4013;

  await app.listen(port, '0.0.0.0');

  logger.log(`Product Registry Service running on port ${port}`);
  logger.log(`Service URL: http://localhost:${port}`);
  logger.log(`Health check endpoint: http://localhost:${port}/health`);

  if (configService.get('NODE_ENV') !== 'production') {
    logger.log(`API documentation: http://localhost:${port}/api/docs`);
  }

  logger.log('Product Registry Service initialized successfully');
}

bootstrap().catch((error) => {
  const logger = new Logger('ProductRegistryService');
  logger.error('Failed to start Product Registry Service', error);
  process.exit(1);
});
