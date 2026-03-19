import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Basic health check of the product registry service',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'product-registry' },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      service: 'product-registry',
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Checks if the service is ready to handle requests (DB ping)',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
  })
  @HealthCheck()
  checkReadiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.healthService.checkDatabaseConnection(),
    ]);
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Checks if the service process is alive',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  @HealthCheck()
  checkLiveness() {
    return this.health.check([
      () => this.healthService.checkServiceHealth(),
    ]);
  }
}
