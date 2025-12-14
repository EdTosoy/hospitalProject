import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Production: MUST set CORS_ORIGIN env
  // Development: Allows localhost
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigins = isProduction
    ? process.env.CORS_ORIGIN
    : 'http://localhost:3001';

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Enable Validation globally
  app.useGlobalPipes(new ValidationPipe());

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Hospital API')
    .setDescription('The Hospital Management API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap().catch((err) => {
  console.error('failed to start: ', err);
  process.exit(1);
});
