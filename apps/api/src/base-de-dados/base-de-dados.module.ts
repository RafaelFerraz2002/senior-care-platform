import { type DynamicModule, Global, Module } from '@nestjs/common';

import { BASE_DE_DADOS_URL, BaseDeDadosService } from './base-de-dados.service.js';

@Global()
@Module({})
export class BaseDeDadosModule {
  static forRoot(config: { databaseUrl: string }): DynamicModule {
    return {
      module: BaseDeDadosModule,
      providers: [{ provide: BASE_DE_DADOS_URL, useValue: config.databaseUrl }, BaseDeDadosService],
      exports: [BaseDeDadosService],
    };
  }
}
