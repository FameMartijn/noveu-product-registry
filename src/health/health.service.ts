import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthIndicatorResult, HealthIndicator } from '@nestjs/terminus';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class HealthService extends HealthIndicator {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {
    super();
  }

  async checkProductRegistry(): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      const count = await this.productRepository.count();
      const responseTime = Date.now() - startTime;

      const isHealthy = responseTime < 1000;

      return this.getStatus('product_registry', isHealthy, {
        product_count: count,
        response_time_ms: responseTime,
        database_accessible: true,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Product registry health check failed: ${error.message}`);

      return this.getStatus('product_registry', false, {
        error: error.message,
        response_time_ms: responseTime,
        database_accessible: false,
      });
    }
  }

  async checkDatabaseConnection(): Promise<HealthIndicatorResult> {
    try {
      await this.productRepository.query('SELECT 1');

      return this.getStatus('database_connection', true, {
        connection: 'active',
      });
    } catch (error) {
      this.logger.error(`Database connection check failed: ${error.message}`);

      return this.getStatus('database_connection', false, {
        connection: 'failed',
        error: error.message,
      });
    }
  }

  async checkServiceHealth(): Promise<HealthIndicatorResult> {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const isHealthy = uptime > 5;

    return this.getStatus('service_health', isHealthy, {
      uptime_seconds: Math.floor(uptime),
      memory_usage_mb: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heap_used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heap_total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      node_version: process.version,
      platform: process.platform,
    });
  }
}
