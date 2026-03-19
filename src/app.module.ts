import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { ProductsModule } from './products/products.module';
import { ReleasesModule } from './releases/releases.module';
import { ArtifactsModule } from './artifacts/artifacts.module';
import { GithubModule } from './github/github.module';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.product-registry', '.env'],
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      useFactory: () =>
        getDatabaseConfig(process.env, {
          serviceName: 'product-registry',
          schema: process.env.DB_SCHEMA ?? 'product_registry',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
          additionalOptions: {
            autoLoadEntities: true,
          },
        }),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // HTTP client
    HttpModule.register({ timeout: 10000, maxRedirects: 3 }),

    // Feature modules
    HealthModule,
    ProductsModule,
    ReleasesModule,
    ArtifactsModule,
    GithubModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
