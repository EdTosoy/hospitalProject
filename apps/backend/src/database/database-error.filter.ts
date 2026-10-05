import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
@Catch()
export class DatabaseErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseErrorFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    const dbError = error as { code?: string; cause?: { code?: string } };
    const code = dbError.cause?.code ?? dbError.code;
    const status = code === '23505' || code === '23503' ? 409 : 500;
    response.status(status).json({
      statusCode: status,
      message:
        status === 409
          ? 'Record conflicts with existing data or related records'
          : 'Internal server error',
    });
    if (status === 500)
      this.logger.error({
        message: 'Request failed',
        requestId,
        method: request.method,
        route: request.route?.path,
        type: error instanceof Error ? error.name : 'Unknown',
        code,
      });
  }
}
