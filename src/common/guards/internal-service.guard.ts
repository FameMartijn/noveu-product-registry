import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const serviceName = request.headers['x-service-name'];
    if (!serviceName) {
      throw new UnauthorizedException('Missing x-service-name header');
    }

    const serviceApiKey = request.headers['x-service-api-key'];
    if (!serviceApiKey) {
      throw new UnauthorizedException('Missing x-service-api-key header');
    }

    const expectedKey = process.env.SERVICE_API_KEY;
    if (!expectedKey) {
      throw new UnauthorizedException('Service API key not configured');
    }

    const incomingKey = Array.isArray(serviceApiKey) ? serviceApiKey[0] : serviceApiKey;

    // Use timing-safe comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expectedKey, 'utf8');
    const incomingBuf = Buffer.from(incomingKey, 'utf8');

    if (expectedBuf.length !== incomingBuf.length) {
      throw new UnauthorizedException('Invalid service API key');
    }

    const isValid = crypto.timingSafeEqual(expectedBuf, incomingBuf);
    if (!isValid) {
      throw new UnauthorizedException('Invalid service API key');
    }

    return true;
  }
}
