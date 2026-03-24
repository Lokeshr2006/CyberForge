import { 
  ExceptionFilter, 
  Catch, 
  ArgumentsHost, 
  HttpException, 
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '../../config/config.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const correlationId = request.correlationId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse.message || exception.message;
      errors = exceptionResponse.errors;
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error [${correlationId}]: ${exception.message}`,
        exception.stack,
      );
    }

    // Log security events
    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      this.logger.warn(
        `Security event [${correlationId}]: ${status} ${request.method} ${request.url}`,
      );
    }

    // In production, don't expose stack traces
    const isDev = this.configService.isDevelopment();
    
    const errorResponse = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      correlationId,
      ...(errors && { errors }),
      ...(isDev && exception instanceof Error && { stack: exception.stack }),
    };

    response.status(status).json(errorResponse);
  }
}
