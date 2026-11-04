import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

/** Monta a aplicação NestJS sem a pôr à escuta (usada pelo main.ts, pelos testes e pela geração do OpenAPI). */
export async function createApp(): Promise<INestApplication> {
  return NestFactory.create(AppModule);
}
