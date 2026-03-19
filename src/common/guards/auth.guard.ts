import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const forwardedUserId = this.extractForwardedUser(request);
    if (forwardedUserId) {
      return true;
    }

    throw new UnauthorizedException('Authentication required');
  }

  private extractForwardedUser(request: Request): boolean {
    const userIdHeader = request.headers['x-user-id'];
    if (!userIdHeader) {
      return false;
    }

    const rolesHeader = this.firstHeaderValue(request.headers['x-user-roles']);
    const roles = rolesHeader
      ? rolesHeader
          .split(',')
          .map(role => role.trim())
          .filter(role => role.length > 0)
      : [];

    const user = {
      id: Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader,
      email: this.firstHeaderValue(request.headers['x-user-email']),
      role: this.firstHeaderValue(request.headers['x-user-role']),
      roles,
      organizationId: this.firstHeaderValue(request.headers['x-organization-id']),
    };

    request['user'] = user;
    return true;
  }

  private firstHeaderValue(value: string | string[] | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    return Array.isArray(value) ? value[0] : value;
  }
}
