import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import type { Config } from './config.js';

/**
 * Monta a aplicação NestJS sem a pôr à escuta (usada pelo main.ts, pelos testes e pela geração do OpenAPI).
 * Não abre ligações à base de dados ao arrancar: a pool só liga na primeira consulta.
 */
export async function createApp(config: Pick<Config, 'databaseUrl'>): Promise<INestApplication> {
  return NestFactory.create(AppModule.forRoot(config));
}
